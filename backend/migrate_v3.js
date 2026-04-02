import mongoose from 'mongoose';
import Feedback from './models/Feedback.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for Deep Migration V4...');

        const feedbacks = await Feedback.find({});
        console.log(`Analyzing ${feedbacks.length} records...`);

        let updatedCount = 0;

        for (const fb of feedbacks) {
            let modified = false;

            if (fb.categories && Array.isArray(fb.categories)) {
                for (const cat of fb.categories) {
                    const reviewType = (cat.reviewType || '').toLowerCase();
                    const isPositive = ['positive', 'completely_satisfied', 'completely satisfied'].includes(reviewType);
                    const isNegative = ['negative', 'needs work', 'needs_work', 'not_satisfied', 'not satisfied'].includes(reviewType);

                    // Start with current arrays
                    let posTags = Array.isArray(cat.positive_feedback) ? [...cat.positive_feedback] : [];
                    let negTags = Array.isArray(cat.negative_feedback) ? [...cat.negative_feedback] : [];

                    // Handle legacy string storage in positive_feedback field
                    if (typeof cat.positive_feedback === 'string' && cat.positive_feedback.trim()) {
                        posTags.push(...cat.positive_feedback.split(';'));
                    }
                    if (typeof cat.negative_feedback === 'string' && cat.negative_feedback.trim()) {
                        negTags.push(...cat.negative_feedback.split(';'));
                    }

                    // Move from legacy dedicated issue fields
                    if (Array.isArray(cat.positive_issues)) posTags.push(...cat.positive_issues);
                    if (Array.isArray(cat.negative_issues)) negTags.push(...cat.negative_issues);

                    // Move from general 'issue' array based on reviewType
                    if (Array.isArray(cat.issue)) {
                        if (isPositive) posTags.push(...cat.issue);
                        else if (isNegative) negTags.push(...cat.issue);
                    }

                    // Special: If the row is labeled completely_satisfied but tags are empty, check customText
                    if (isPositive && posTags.length === 0 && cat.customText) {
                         // Only move if it looks like a tag (short) or if we are desperate
                         // Actually the user wants to populate 'NULL' values.
                    }

                    // Normalize and Deduplicate
                    const cleanPos = [...new Set(posTags.map(t => String(t || '').trim()).filter(t => t && t.toUpperCase() !== 'NULL'))];
                    const cleanNeg = [...new Set(negTags.map(t => String(t || '').trim()).filter(t => t && t.toUpperCase() !== 'NULL'))];

                    // Check for changes
                    const pDiff = JSON.stringify(cat.positive_feedback) !== JSON.stringify(cleanPos);
                    const nDiff = JSON.stringify(cat.negative_feedback) !== JSON.stringify(cleanNeg);

                    if (pDiff || nDiff) {
                        cat.positive_feedback = cleanPos;
                        cat.negative_feedback = cleanNeg;
                        
                        // Wipe the legacy ones to finish normalization
                        cat.positive_issues = [];
                        cat.negative_issues = [];
                        
                        // Force reviewType to be Title Case for UI consistency if it was lowercase
                        if (reviewType === 'positive') cat.reviewType = 'Positive';
                        if (reviewType === 'negative') cat.reviewType = 'Negative';
                        if (reviewType === 'needs_work' || reviewType === 'needs work') cat.reviewType = 'Needs Work';

                        modified = true;
                    }
                }
            }

            if (modified) {
                fb.markModified('categories');
                await fb.save();
                updatedCount++;
            }
        }

        console.log(`Success! Synchronized and migrated ${updatedCount} records to the new array-based schema.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateData();
