const pool = require('../db');
async function main() {
  const res = await pool.query("UPDATE users SET role = 'user' WHERE username = 'testuser' RETURNING id, username, role");
  console.log('Updated:', JSON.stringify(res.rows[0]));
  await pool.end();
}
main();
