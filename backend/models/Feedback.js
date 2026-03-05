import mongoose from 'mongoose';

const categorySchema = mongoose.Schema({
    department: { type: String, required: true },
    issue: { type: [String], required: true },
    customText: { type: String },
    reviewType: {
        type: String,
        enum: ['Positive', 'Negative'],
        required: true,
        default: 'Negative'
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
        }
    },
    {
        timestamps: true,
    }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
