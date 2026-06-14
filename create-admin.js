const pool = require('./db');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('\n❌ Usage: node create-admin.js <username> <password> [email]');
  console.log('Example: node create-admin.js myadmin StrongPassword123 admin@example.com\n');
  process.exit(1);
}

const username = args[0].toLowerCase().trim();
const password = args[1];
const email = (args[2] || `${username}@ondailylogs.store`).toLowerCase().trim();

async function createAdmin() {
  try {
    console.log(`⏳ Hashing password for "${username}"...`);
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('⏳ Connecting to database...');
    
    // Check if email or username is already taken
    const checkUser = await pool.query(
      'SELECT id, role FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (checkUser.rows.length > 0) {
      const existingUser = checkUser.rows[0];
      console.log(`ℹ️ User "${username}" or email "${email}" already exists with role: "${existingUser.role}".`);
      console.log(`⏳ Updating password and ensuring admin role...`);
      
      await pool.query(
        `UPDATE users 
         SET password = $1, role = 'admin', is_banned = FALSE 
         WHERE id = $2`,
        [hashedPassword, existingUser.id]
      );
      
      console.log(`\n✅ Success! User "${username}" has been updated to Admin with the new password.`);
    } else {
      console.log(`⏳ Inserting new admin user...`);
      await pool.query(
        `INSERT INTO users (username, email, password, role, balance)
         VALUES ($1, $2, $3, 'admin', 9999.99)`,
        [username, email, hashedPassword]
      );
      console.log(`\n✅ Success! New admin user "${username}" (${email}) created successfully.`);
    }

  } catch (err) {
    console.error('❌ Error creating/updating admin user:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Database pool closed.');
  }
}

createAdmin();
