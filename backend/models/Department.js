import mongoose from 'mongoose';

const departmentSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Hospital',
        },
        hospitalId: {
            type: String,
            required: true
        },
        imageUrl: {
            type: String,
            default: '',
        },
        description: {
            type: String,
            default: '',
        },
        positive_feedback: { type: String, default: '' },
        negative_feedback: { type: String, default: '' },
        positiveIssues: [{ type: String }],
        negativeIssues: [{ type: String }],
        incharges: [
            {
                name: { type: String },
                email: { type: String }
            }
        ]
    },
    {
        timestamps: true,
    }
);

// Ensure department names are unique per hospital (case-insensitive)
departmentSchema.index({ hospital: 1, name: 1 }, { unique: true });


const Department = mongoose.model('Department', departmentSchema);

export default Department;
