const pool = require('../db');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const hashed = await bcrypt.hash('Godlovesme1@', 12);
    const res = await pool.query(
      "UPDATE users SET password = $1 WHERE username = 'testuser' RETURNING id, username",
      [hashed]
    );
    if (res.rows.length > 0) {
      console.log('Password reset successfully for:', res.rows[0].username);
    } else {
      console.log('User not found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
