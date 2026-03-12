const BASE_URL = 'http://localhost:5000/api';

async function testStats() {
    try {
        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@hospital.com',
                password: 'password123'
            })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            console.error('Login failed:', loginData);
            return;
        }

        const token = loginData.token;
        console.log('Login successful. Token acquired.');

        console.log('Fetching stats...');
        const statsRes = await fetch(`${BASE_URL}/feedback/stats`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const statsData = await statsRes.json();

        console.log('Stats Response Status:', statsRes.status);
        console.log('Stats:', statsData);
    } catch (error) {
        console.error('Error:', error);
    }
}

testStats();
