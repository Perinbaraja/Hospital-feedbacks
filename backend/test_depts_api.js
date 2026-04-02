import http from 'http';

const hId = '69ba3e22deaa22d70c2fe3d8';
http.get(`http://localhost:5000/api/departments?hospitalId=${hId}`, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            console.log('Departments:', JSON.stringify(parsedData, null, 2));
        } catch (e) {
            console.error(e.message);
            console.log('Raw Data:', rawData);
        }
    });
}).on('error', (e) => {
    console.error(`Error: ${e.message}`);
});
