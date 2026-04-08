import mongoose from 'mongoose';

const hospitalFeedbackConfigSchema = mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['positive', 'negative'],
            required: true,
        },
        label: {
            type: String,
            required: true,
            trim: true,
        },
        emailEnabled: {
            type: Boolean,
            default: false,
        },
        recipientName: {
            type: String,
            default: '',
            trim: true,
        },
        recipientEmail: {
            type: String,
            default: '',
            trim: true,
        }
    },
    { _id: true }
);

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
                positive_feedback: { type: String, default: '' },
                negative_feedback: { type: String, default: '' },
                positiveIssues: [{ type: String }],
                negativeIssues: [{ type: String }],
                incharges: [
                    {
                        name: { type: String },
                        email: { type: String }
                    }
                ],
                feedbackConfigs: {
                    type: [hospitalFeedbackConfigSchema],
                    default: []
                }
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
        state: {
            type: String,
            default: '',
        },
        district: {
            type: String,
            default: '',
        },
        feedbackBgUrl: {
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
            unique: true,
            index: true,
        },
        tvFilters: {
            feedbackIds: { type: [String], default: [] },
            departments: { type: [String], default: [] },
            type: { type: String, default: '' }, // Positive / Negative
            comment: { type: String, default: '' },
            dateFrom: { type: String, default: '' },
            dateTo: { type: String, default: '' },
            status: { type: String, default: 'IN PROGRESS' },
            showFeedbackId: { type: Boolean, default: false },
            visibleColumns: { 
                type: [String], 
                default: ['sno', 'department', 'feedbackType', 'comment', 'date', 'time', 'status'] 
            }
        },
        hospitalId: {
            type: String
        }
    },
    {
        timestamps: true,
    }
);

hospitalSchema.pre('save', async function() {
    if (!this.hospitalId && this._id) {
        this.hospitalId = this._id.toString();
    }
});

hospitalSchema.index({ hospitalId: 1 });

// Add a default set if none provided (can be changed via seed or admin)
hospitalSchema.path('departments').default(() => [
    { name: 'Canteen', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2082/2082045.png', description: 'Dining and canteen services' },
    { name: 'Doctor', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3774/3774299.png', description: 'Healthcare staff and doctor services' },
    { name: 'Medicine', imageUrl: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', description: 'Pharmacy and medical services' },
    { name: 'Parking', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830175.png', description: 'Hospital parking facilities' },
]);

const Hospital = mongoose.model('Hospital', hospitalSchema);

export default Hospital;
