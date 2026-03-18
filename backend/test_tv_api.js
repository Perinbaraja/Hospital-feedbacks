import axios from 'axios';

const test = async () => {
    try {
        const hospitalId = '69a95f174bac5edf442e31ac';
        const res = await axios.get(`http://localhost:5000/api/feedback/tv/${hospitalId}`);
        console.log('TV Feedback Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
};

test();
