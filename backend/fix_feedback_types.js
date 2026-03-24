import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import _Feedback from './models/Feedback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const Feedback = _Feedback?.default || _Feedback;

const NEGATIVE_KEYWORDS = [
    'rude', 'delay', 'high cost', 'expensive', 'unclean', 'bad service', 
    'wait', 'confusing', 'unmanaged', 'poor', 'slow', 'stock', 'wrong', 
    'noisy', 'overcrowded', 'dirty'
];

const POSITIVE_KEYWORDS = [
    'clean', 'friendly', 'good service', 'excellent', 'helpful', 
    'fast', 'easy', 'detailed', 'professional', 'ample', 'safe', 
    'secure', 'quick', 'polite', 'stable'
];

async function fixFeedbackData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. BACKUP DATA
        console.log('Creating backup collection: feedback_backups...');
        const allFeedbacks = await Feedback.find({});
        const db = mongoose.connection.db;
        
        // Drop backup if exists to start fresh
        try { await db.collection('feedback_backups').drop(); } catch (e) { /* ignore if not exists */ }
        
        if (allFeedbacks.length > 0) {
            await db.collection('feedback_backups').insertMany(allFeedbacks.map(fb => fb.toObject()));
            console.log(`Backup completed: ${allFeedbacks.length} records backed up.`);
        } else {
            console.log('No records found to backup.');
        }

        // 2. APPLY FIXES
        let positiveFixes = 0;
        let needsWorkFixes = 0;
        let totalProcessed = 0;

        for (const feedback of allFeedbacks) {
            if (!feedback.categories || feedback.categories.length === 0) continue;

            const category = feedback.categories[0];
            const issuesText = (category.issue || []).join(' ').toLowerCase();
            const originalType = category.reviewType;

            let newType = originalType;

            // Detect Negative/Needs Work
            const hasNegative = NEGATIVE_KEYWORDS.some(word => issuesText.includes(word));
            const hasPositive = POSITIVE_KEYWORDS.some(word => issuesText.includes(word));

            if (hasNegative) {
                newType = 'Needs Work';
            } else if (hasPositive) {
                newType = 'Positive';
            }

            if (newType !== originalType) {
                category.reviewType = newType;
                feedback.markModified('categories');
                await feedback.save();
                
                if (newType === 'Positive') positiveFixes++;
                else needsWorkFixes++;
                
                console.log(`[FIXED] ID: ${feedback.feedbackId} | ${originalType} -> ${newType}`);
            }
            totalProcessed++;
        }

        console.log('\n--- DATA CORRECTION SUMMARY ---');
        console.log(`Total Records Processed: ${totalProcessed}`);
        console.log(`Corrected to "Positive": ${positiveFixes}`);
        console.log(`Corrected to "Needs Work": ${needsWorkFixes}`);
        console.log('-------------------------------\n');

        await mongoose.disconnect();
        console.log('Disconnected from database. Optimization Complete.');
    } catch (error) {
        console.error('Error during data correction:', error);
        process.exit(1);
    }
}

fixFeedbackData();
