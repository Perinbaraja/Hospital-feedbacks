const test = async () => {
    try {
        const payload = {
            patientName: "Email Test",
            patientEmail: "antigravity@example.com",
            comments: "Testing removal of portal link",
            hospital: "69a95f174bac5edf442e31ac", 
            categories: [{
                department: "DOCTOR",
                issue: ["Detailed Consultation"],
                reviewType: "Positive",
                rating: "Completely Satisfied"
            }]
        };
        console.log('Sending test feedback to http://localhost:5000/feedback...');
        const response = await fetch('http://localhost:5000/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (response.ok) {
            console.log('SUCCESS: Feedback submitted.');
            console.log('Response:', data);
        } else {
            console.error('FAILED:', response.status, data);
        }
    } catch (e) {
        console.error('ERR:', e.message);
    }
};

test();
