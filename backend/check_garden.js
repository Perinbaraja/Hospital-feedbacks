import mongoose from 'mongoose';
import _Department from './models/Department.js';
import _Hospital from './models/Hospital.js';

const Department = _Department?.default || _Department;

(async () => {
    try {
        await mongoose.connect('mongodb+srv://admin:Admin123@cluster0.p8kxwju.mongodb.net/?appName=Cluster0');
        const garden = await Department.findOne({ name: /GARDEN/i });
        if (!garden) {
            console.log('No GARDEN department found.');
        } else {
            const cleanObj = garden.toObject();
            delete cleanObj.imageUrl;
            console.log('GARDEN Dept (no img):', JSON.stringify(cleanObj, null, 2));
            console.log('hospital type:', typeof garden.hospital);
            console.log('hospital content:', garden.hospital);
            console.log('hospitalId type:', typeof garden.hospitalId);
            console.log('hospitalId content:', garden.hospitalId);
        }
        process.exit(0);
    } catch (e) {
        console.log('Error:', e.message);
        process.exit(1);
    }
})();
