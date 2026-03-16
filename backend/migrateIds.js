import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Feedback from './models/Feedback.js';
import Counter from './models/Counter.js';

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const feedbacks = await Feedback.find({ feedbackId: { $exists: false } }).sort({ createdAt: 1 });
        console.log(`Found ${feedbacks.length} feedbacks without ID`);

        for (const fb of feedbacks) {
            const year = new Date(fb.createdAt).getFullYear();
            const counterId = `feedback_${year}`;

            const counter = await Counter.findOneAndUpdate(
                { id: counterId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            const sequenceNumber = counter.seq.toString().padStart(3, '0');
            const newId = `HFB-${year}-${sequenceNumber}`;

            fb.feedbackId = newId;
            await fb.save();
            console.log(`Assigned ${newId} to feedback ${fb._id}`);
        }

        console.log('Migration completed');
        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
