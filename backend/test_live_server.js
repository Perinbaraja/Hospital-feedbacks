async function test() {
    try {
        console.log('Testing login against live server using fetch...');
        const response = await fetch('http://localhost:5000/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'government@hospital.com',
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
