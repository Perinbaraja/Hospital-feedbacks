import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Feedback = mongoose.connection.collection('feedbacks');
        const total = await Feedback.countDocuments();
        const p = await Feedback.countDocuments({ positive: { $ne: null } });
        const n = await Feedback.countDocuments({ negative: { $ne: null } });
        console.log({ total, p, n });
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
check();
