// Input Validation Middleware

export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateFeedbackConfigs = (feedbackConfigs = []) => {
    if (!Array.isArray(feedbackConfigs)) {
        return 'Feedback configuration must be an array';
    }

    for (const config of feedbackConfigs) {
        const label = config?.label?.trim?.();
        const type = (config?.type || '').toLowerCase();
        const emailEnabled = Boolean(config?.emailEnabled);
        const recipientEmail = config?.recipientEmail?.trim?.();

        if (!label) {
            return 'Each feedback field requires a label';
        }

        if (!['positive', 'negative'].includes(type)) {
            return 'Feedback field type must be positive or negative';
        }

        if (emailEnabled) {
            if (!config?.recipientName?.trim?.()) {
                return `Recipient name is required for "${label}"`;
            }
            if (!recipientEmail) {
                return `Recipient email is required for "${label}"`;
            }
            if (!validateEmail(recipientEmail)) {
                return `Recipient email is invalid for "${label}"`;
            }
        }
    }

    return null;
};

export const validatePassword = (password) => {
    // At least 6 characters, can be more restrictive if needed
    return password && password.length >= 6;
};

export const validateUserInput = (req, res, next) => {
    const { email, password, name } = req.body;
    const trimmedEmail = email?.trim();
    const trimmedName = name?.trim();

    if (trimmedEmail && !validateEmail(trimmedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password && !validatePassword(password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (trimmedName && (typeof trimmedName !== 'string' || trimmedName.length === 0)) {
        return res.status(400).json({ message: 'Name must be a non-empty string' });
    }

    next();
};

export const validateFeedbackInput = (req, res, next) => {
    const { patientEmail, categories } = req.body || {};

    if (patientEmail && !validateEmail(patientEmail?.trim())) {
        return res.status(400).json({ message: 'Invalid patient email format' });
    }

    if (!categories) {
        return res.status(400).json({ message: 'Feedback categories are required' });
    }

    next();
};

export const validateHospitalInput = (req, res, next) => {
    const { name, themeColor } = req.body;

    if (name && typeof name !== 'string') {
        return res.status(400).json({ message: 'Hospital name must be a string' });
    }

    if (themeColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(themeColor)) {
        return res.status(400).json({ message: 'Invalid theme color format (must be hex color)' });
    }

    next();
};
