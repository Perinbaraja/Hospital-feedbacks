import Counter from '../models/Counter.js';

export const generateFeedbackId = async () => {
    const year = new Date().getFullYear();
    const counterId = `feedback_${year}`;

    const counter = await Counter.findOneAndUpdate(
        { id: counterId },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
    );

    const sequenceNumber = counter.seq.toString().padStart(3, '0');
    return `HFB-${year}-${sequenceNumber}`;
};
