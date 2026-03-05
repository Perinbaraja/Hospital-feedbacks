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
        departments: [
            {
                name: { type: String, required: true },
                imageUrl: { type: String, default: '' },
                description: { type: String, default: '' },
                positiveIssues: [{ type: String }],
                negativeIssues: [{ type: String }],
            }
        ],
        themeColor: {
            type: String,
            default: '#0ca678', // Default to current Emerald theme
        },
        location: {
            type: String,
            default: '',
        },
        phone: {
            type: String,
            default: '',
        },
        adminEmail: {
            type: String,
            default: '',
        },
        uniqueId: {
            type: String,
            required: true,
            unique: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        qrId: {
            type: String,
            default: 'main',
        },
    },
    {
        timestamps: true,
    }
);

// Add a default set if none provided (can be changed via seed or admin)
hospitalSchema.path('departments').default(() => [
    { name: 'Admission', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063224.png', description: 'Patient admission process' },
    { name: 'Waiting Room', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2965/2965279.png', description: 'Patient waiting area' },
    { name: 'Pharmacy', imageUrl: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', description: 'Medicine and pharmacy services' },
    { name: 'Nurse/Doctor', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3774/3774299.png', description: 'Medical staff behavior' },
    { name: 'Parking', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830175.png', description: 'Hospital parking facilities' },
    { name: 'Internet', imageUrl: 'https://cdn-icons-png.flaticon.com/512/159/159599.png', description: 'WiFi and internet connectivity' },
]);

const Hospital = mongoose.model('Hospital', hospitalSchema);

export default Hospital;
