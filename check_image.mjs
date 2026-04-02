import http from 'http';

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/uploads/image-1773296402127-769270878.jpg',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    process.exit(0);
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
});

req.end();
