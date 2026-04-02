async function test() {
    try {
        console.log('Testing login for testadmin@hospital.com...');
        const response = await fetch('http://localhost:5000/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'testadmin@hospital.com',
                password: 'password123'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('Login Success:', JSON.stringify(data, null, 2));
        } else {
            console.error('Login Failed Status:', response.status);
            console.error('Login Failed Message:', data);
        }
    } catch (e) {
        console.error('Connection Error:', e.message);
    }
}
test();
