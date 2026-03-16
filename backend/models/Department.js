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
        imageUrl: {
            type: String,
            default: '',
        },
        description: {
            type: String,
            default: '',
        },
        positiveIssues: [{ type: String }],
        negativeIssues: [{ type: String }],
    },
    {
        timestamps: true,
    }
);

const Department = mongoose.model('Department', departmentSchema);

export default Department;
