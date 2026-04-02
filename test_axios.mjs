import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

console.log('BaseURL: http://localhost:5000/api');
console.log("Call: '/users/login' ->", api.getUri({ url: '/users/login' }));
console.log("Call: 'users/login' ->", api.getUri({ url: 'users/login' }));

const api2 = axios.create({
    baseURL: 'http://localhost:5000/api/'
});

console.log('\nBaseURL: http://localhost:5000/api/');
console.log("Call: '/users/login' ->", api2.getUri({ url: '/users/login' }));
console.log("Call: 'users/login' ->", api2.getUri({ url: 'users/login' }));
