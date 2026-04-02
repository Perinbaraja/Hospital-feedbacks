import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Feedback from './models/Feedback.js';

import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const feedbacks = await Feedback.find({});
        console.log(`Found ${feedbacks.length} feedbacks to check.`);

        let updatedCount = 0;

        for (const fb of feedbacks) {
            let changed = false;
            
            for (const cat of fb.categories) {
                // Rename rating to feedback internally if it hasn't been yet
                if (cat.rating && !cat.feedback) {
                    cat.feedback = cat.rating;
                    changed = true;
                }

                // Requirement 4 Logic: Separate old data
                // We'll treat customText/issue_context as the source
                const sourceText = cat.customText || '';
                
                if (sourceText) {
                    if (sourceText.toUpperCase().includes('NOTE:')) {
                        cat.note = sourceText;
                    } else if (cat.reviewType === 'Positive') {
                        cat.positive_feedback = sourceText;
                    } else if (cat.reviewType === 'negative') {
                        cat.negative_feedback = sourceText;
                    }
                    changed = true;
                }
            }

            if (changed) {
                fb.markModified('categories');
                await fb.save();
                updatedCount++;
            }
        }

        console.log(`Successfully migrated ${updatedCount} records.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
};

migrate();
