const pool = require('../db');

async function main() {
  try {
    const res = await pool.query(
      "SELECT id, username, email, is_banned, role, LEFT(password, 20) as pw_preview FROM users WHERE username = 'testuser'"
    );
    console.log('User lookup result:', JSON.stringify(res.rows, null, 2));

    if (res.rows.length > 0) {
      const bcrypt = require('bcryptjs');
      const user = res.rows[0];
      // Fetch full password hash
      const full = await pool.query('SELECT password FROM users WHERE id = $1', [user.id]);
      const hash = full.rows[0].password;
      const match = await bcrypt.compare('Godlovesme1@', hash);
      console.log('Password "Godlovesme1@" matches:', match);
    } else {
      console.log('User "testuser" does NOT exist in the database.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
