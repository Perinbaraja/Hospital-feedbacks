import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        // Do not fail on invalid certs (useful for some network environments)
        rejectUnauthorized: false,
        // Ensure connection doesn't hang
        timeout: 10000
    }
});

// Verify email configuration on startup
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter.verify((error, success) => {
        if (error) {
            console.warn('Email Service Warning: Configuration issue -', error.message);
        } else {
            console.log('Email Service: Ready to send emails');
        }
    });
}

export const sendThankYouEmail = async (toEmail, name) => {
    if (!toEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email skipped: Missing recipient or email configuration');
        return { success: false, reason: 'Email not configured or no recipient' };
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Thank You For Your Feedback',
        text: `Hi ${name || 'Valued User'},\n\nThank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.\n\nThanks,\nHave a wonderful day!`,
        html: `<h2>Thank You For Your Feedback</h2><p>Hi ${name || 'Valued User'},</p><p>Thank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.</p><p>Thanks,<br>Have a wonderful day!</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Thank you email sent to: ${toEmail}`);
        return { success: true, recipient: toEmail };
    } catch (error) {
        console.error(`Error sending thank you email to ${toEmail}:`, error.message);
        return { success: false, error: error.message, recipient: toEmail };
    }
};

export const sendResolutionEmail = async (toEmail, name) => {
    if (!toEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email skipped: Missing recipient or email configuration');
        return { success: false, reason: 'Email not configured or no recipient' };
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Your Feedback Query Has Been Rectified/Updated',
        text: `Hi ${name || 'Valued User'},\n\nWe wanted to let you know that the issue you reported has been reviewed and rectified by our team.\n\nThanks,\nHave a wonderful day!`,
        html: `<h2>Your Feedback Query Has Been Rectified</h2><p>Hi ${name || 'Valued User'},</p><p>We wanted to let you know that the issue you reported has been reviewed and rectified by our team.</p><p>Thanks,<br>Have a wonderful day!</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Resolution email sent to: ${toEmail}`);
        return { success: true, recipient: toEmail };
    } catch (error) {
        console.error(`Error sending resolution email to ${toEmail}:`, error.message);
        return { success: false, error: error.message, recipient: toEmail };
    }
};

export const sendAdminCredentialsEmail = async (toEmail, name, email, password) => {
    if (!toEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Credential email skipped: Missing recipient or email configuration');
        return { success: false, reason: 'Email not configured or no recipient' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginLink = `${frontendUrl}/login`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Your Hospital Admin Credentials',
        text: `Hi ${name},\n\nYour dashboard access is ready.\n\nLogin URL: ${loginLink}\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after logging in for the first time.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; padding: 2rem; border-radius: 12px;">
                <h2 style="color: #4338ca;">Welcome back!</h2>
                <p>Hi <strong>${name}</strong>,</p>
                <p>Your hospital administration dashboard is now ready for use. Use the credentials below to log in:</p>
                <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin: 1.5rem 0; border: 1px dashed #4338ca;">
                    <p style="margin: 0.5rem 0;"><strong>URL:</strong> <a href="${loginLink}">${loginLink}</a></p>
                    <p style="margin: 0.5rem 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 0.5rem 0;"><strong>Password:</strong> <code style="background: white; padding: 2px 4px;">${password}</code></p>
                </div>
                <p style="color: #64748b; font-size: 0.9rem;"><em>Note: Please change your password from the profile section immediately after your first login.</em></p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Credentials email sent to: ${toEmail}`);
        return { success: true, recipient: toEmail };
    } catch (error) {
        console.error(`Error sending credentials email to ${toEmail}:`, error.message);
        return { success: false, error: error.message, recipient: toEmail };
    }
};
