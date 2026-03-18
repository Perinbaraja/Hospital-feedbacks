import http from 'http';

const hospitalId = '69a95f174bac5edf442e31ac';
http.get(`http://localhost:5000/api/feedback/tv/${hospitalId}`, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            console.log('TV Feedback Response:', JSON.stringify(parsedData, null, 2));
        } catch (e) {
            console.error(e.message);
            console.log('Raw Data:', rawData);
        }
    });
}).on('error', (e) => {
    console.error(`Error: ${e.message}`);
});
