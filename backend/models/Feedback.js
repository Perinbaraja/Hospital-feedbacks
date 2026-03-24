import mongoose from 'mongoose';

const categorySchema = mongoose.Schema({
    department: { type: String, required: true },
    issue: { type: [String], required: true },
    customText: { type: String },
    reviewType: {
        type: String,
        enum: ['Positive', 'Needs Work'],
        required: true,
        default: 'Needs Work'
    },
    rating: {
        type: String,
        enum: ['Completely Satisfied', 'Partially Satisfied', 'Not Satisfied'],
        required: true,
        default: 'Not Satisfied'
    },
    image: { type: String }, // Path to uploaded image
});

const feedbackSchema = mongoose.Schema(
    {
        feedbackId: {
            type: String,
            unique: true
        },
        patientName: {
            type: String,
            // Optional as requested
        },
        patientEmail: {
            type: String,
            // Optional as requested
        },
        categories: [categorySchema],
        comments: {
            type: String,
        },
        status: {
            type: String,
            enum: ['Pending', 'IN PROGRESS', 'COMPLETED'],
            default: 'Pending',
        },
        assignedTo: {
            type: String,
            // Refers to a department name
            default: null,
        },
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true
        },
        notes: [
            {
                text: { type: String, required: true },
                senderName: { type: String, required: true },
                senderRole: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ]
    },
    {
        timestamps: true,
    }
);

// Set virtuals before model creation
feedbackSchema.set('toJSON', { virtuals: true });
feedbackSchema.set('toObject', { virtuals: true });

feedbackSchema.virtual('isOverdue').get(function () {
    if (this.status !== 'Pending') return false;
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return this.createdAt < fortyEightHoursAgo;
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
