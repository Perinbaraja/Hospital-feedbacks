import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import Department from './models/Department.js';
import Feedback from './models/Feedback.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const migrate = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI not found in .env');
        }
        console.log('Connecting to:', process.env.MONGO_URI.split('@')[1] || 'local DB');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Deduplicate Departments for each Hospital
        const hospitals = await Hospital.find({});
        for (const hospital of hospitals) {
            console.log(`Checking duplicates for hospital: ${hospital.name}`);
            const seen = new Set();
            const uniqueDepts = [];
            for (const dept of hospital.departments) {
                const normalized = dept.name.trim().toLowerCase();
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    uniqueDepts.push(dept);
                } else {
                    console.log(`Removing duplicate department from hospital model: ${dept.name}`);
                }
            }
            if (uniqueDepts.length !== hospital.departments.length) {
                hospital.departments = uniqueDepts;
                await hospital.save();
                console.log(`Updated hospital ${hospital.name} departments.`);
            }
        }

        // 2. Deduplicate Standalone Department Collection
        const allDepts = await Department.find({});
        const deptSeen = new Map(); // Map<HospitalId_LowercaseName, Id>
        for (const dept of allDepts) {
            const key = `${dept.hospital}_${dept.name.trim().toLowerCase()}`;
            if (!deptSeen.has(key)) {
                deptSeen.set(key, dept._id);
            } else {
                console.log(`Deleting duplicate standalone department: ${dept.name}`);
                await Department.findByIdAndDelete(dept._id);
            }
        }

        // 3. Ultra-Safe Feedback Migration (All Scenarios)
        console.log('Running Ultra-Safe migration...');
        const feedbacks = await Feedback.find({});
        for (const fb of feedbacks) {
            let modified = false;

            // Handle legacy TOP-LEVEL comments -> Category note
            if (fb.comments && fb.categories?.[0] && !fb.categories[0].note) {
                fb.categories[0].note = fb.comments;
                fb.comments = '';
                modified = true;
            }

            for (const cat of fb.categories) {
                const oldNote = cat.note;
                const oldPos = JSON.stringify(cat.positive_feedback);
                const oldNeg = JSON.stringify(cat.negative_feedback);

                // Ensure clean arrays for all issue fields
                const toArr = (v) => {
                    if (!v) return [];
                    const a = Array.isArray(v) ? v : String(v).split(/[;,]/);
                    return a.map(s => String(s).trim()).filter(s => s && s !== 'undefined' && s !== 'null');
                };

                cat.issue = toArr(cat.issue);
                cat.positive_issues = toArr(cat.positive_issues);
                cat.negative_issues = toArr(cat.negative_issues);
                cat.positive_feedback = toArr(cat.positive_feedback);
                cat.negative_feedback = toArr(cat.negative_feedback);

                // Merge cat.customText into cat.note if it exists
                if (cat.customText && !cat.note) {
                    cat.note = cat.customText;
                }
                
                // Final Note logic: ensure it's a string, not null
                cat.note = cat.note || '';

                // If lists are still empty, double-check if 'note' was misused as a checkbox item
                const commonPositive = ['Fast', 'Good', 'Excellent', 'Friendly Staff', 'Clear Communication', 'Helpful Information'];
                const commonNegative = ['Poor', 'Bad', 'Rude', 'Long Wait Time', 'High Cost', 'Complex Process'];

                if (cat.positive_feedback.length === 0 && commonPositive.includes(cat.note)) {
                    cat.positive_feedback = [cat.note];
                    modified = true;
                }
                if (cat.negative_feedback.length === 0 && commonNegative.includes(cat.note)) {
                    cat.negative_feedback = [cat.note];
                    modified = true;
                }

                if (cat.note !== oldNote || JSON.stringify(cat.positive_feedback) !== oldPos || JSON.stringify(cat.negative_feedback) !== oldNeg) {
                    modified = true;
                }
            }

            if (modified) {
                fb.markModified('categories');
                await fb.save();
                console.log(`Deep Migrated ID: ${fb.feedbackId}`);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
