import mongoose from 'mongoose';

const hospitalSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            default: 'My Hospital',
        },
        logoUrl: {
            type: String,
            default: '',
        },
        departments: {
            type: [String],
            default: ['Kitchen', 'Cleanliness', 'Staff', 'Environment'],
        },
    },
    {
        timestamps: true,
    }
);

const Hospital = mongoose.model('Hospital', hospitalSchema);

export default Hospital;
