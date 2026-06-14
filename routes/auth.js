const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// ─── Register ───────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    const disposableDomains = [
      'yopmail.com', 'mailinator.com', 'tempmail.com', 'guerrillamail.com', 
      'sharklasers.com', 'dispostable.com', 'getairmail.com', 'maildrop.cc', 
      'temp-mail.org', 'throwawaymail.com', '10minutemail.com', 'crazymailing.com', 
      'trashmail.com', 'generator.email'
    ];
    if (disposableDomains.includes(emailDomain)) {
      return res.status(400).json({ success: false, message: 'Disposable or temporary emails are not allowed.' });
    }

    // Verify MX records to block completely fake domains (with a 2-second timeout to prevent serverless hang)
    const dns = require('dns').promises;
    try {
      const dnsPromise = dns.resolveMx(emailDomain);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DNS_TIMEOUT')), 2000)
      );
      const mx = await Promise.race([dnsPromise, timeoutPromise]);
      if (!mx || mx.length === 0) {
        return res.status(400).json({ success: false, message: 'This email domain has no valid mail servers (MX records).' });
      }
    } catch (dnsErr) {
      if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'ENODATA') {
        return res.status(400).json({ success: false, message: 'Email domain does not exist or does not accept mail.' });
      }
      console.warn(`DNS MX check bypassed for ${emailDomain}:`, dnsErr.message);
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ success: false, message: 'Username must be 3-30 characters.' });
    }

    // Check existing
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email or username already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, balance, role, created_at`,
      [username.toLowerCase(), email.toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account has been banned. Contact support.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: parseFloat(user.balance),
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── Get Current User ────────────────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id, username, email, balance, role, avatar, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    user.balance = parseFloat(user.balance);
    return res.json({ success: true, user });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── Update Profile ───────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    // Check uniqueness (exclude current user)
    const conflict = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.toLowerCase(), req.user.id]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const result = await pool.query(
      `UPDATE users SET email = $1 WHERE id = $2
       RETURNING id, username, email, balance, role, avatar, created_at`,
      [email.toLowerCase(), req.user.id]
    );
    const user = result.rows[0];
    user.balance = parseFloat(user.balance);

    return res.json({ success: true, message: 'Profile updated successfully.', user });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── Change Password (PUT = user profile, POST = admin settings form) ─────────
async function handleChangePassword(req, res) {
  try {
    // Accept both camelCase (old) and snake_case (new form)
    const currentPassword = req.body.current_password || req.body.currentPassword;
    const newPassword     = req.body.new_password     || req.body.newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const result  = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

router.put('/change-password',  authMiddleware, handleChangePassword);
router.post('/change-password', authMiddleware, handleChangePassword);

// ─── Forgot Password ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    // Always return success to prevent email enumeration
    const result = await pool.query('SELECT id, username FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const token = require('crypto').randomBytes(32).toString('hex');

    // Store token in DB (expires in 1 hour)
    await pool.query(
      `INSERT INTO password_reset_tokens (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')
       ON CONFLICT DO NOTHING`,
      [token, user.id]
    );

    const resetUrl = `${process.env.SITE_URL || 'https://www.ondailylogs.store'}/reset-password.html?token=${token}`;

    // Try to send email if SMTP is configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: `"On A Daily Logs" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Password Reset Request',
          html: `<p>Hi ${user.username},</p>
                 <p>Click below to reset your password (link expires in 1 hour):</p>
                 <p><a href="${resetUrl}">${resetUrl}</a></p>
                 <p>If you did not request this, ignore this email.</p>`,
        });
        console.log(`📧 Password reset email sent to ${email}`);
      } catch (emailErr) {
        console.error('Failed to send reset email:', emailErr.message);
      }
    } else {
      // SMTP not configured — log to console so admin can manually share the link
      console.log(`🔑 Password reset link for ${email}: ${resetUrl}`);
    }

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── Reset Password ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tokenResult = await client.query(
        `SELECT * FROM password_reset_tokens
         WHERE token = $1 AND used = FALSE AND expires_at > NOW()
         FOR UPDATE`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token. Please request a new one.' });
      }

      const { user_id } = tokenResult.rows[0];
      const hashed = await require('bcryptjs').hash(password, 12);

      await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user_id]);
      await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

      await client.query('COMMIT');
      return res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
