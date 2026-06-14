const API_BASE = 'http://localhost:5000/api';

async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'adminlogs', password: 'Mustpay@54' })
    });
    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);
    console.log('Login response:', loginData);

    if (!loginData.success) {
      console.log('Login failed.');
      return;
    }

    const token = loginData.token;

    console.log('\nTesting /api/deposits/admin/all...');
    const depRes = await fetch(`${API_BASE}/deposits/admin/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const depData = await depRes.json();
    console.log('Deposits status:', depRes.status);
    console.log('Deposits data success:', depData.success);
    console.log('Deposits message:', depData.message);

    console.log('\nTesting /api/admin/users...');
    const usersRes = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersData = await usersRes.json();
    console.log('Users status:', usersRes.status);
    console.log('Users data success:', usersData.success);
    console.log('Users message:', usersData.message);
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
