import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the backend directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
        subject: 'Hospital Administration - Access Credentials',
        text: `Hi ${name},\n\nYour hospital administration account has been created by the Super Admin.\n\nLogin URL: ${loginLink}\nLogin Email ID: ${email}\nTemporary Password: ${password}\n\nIMPORTANT: The password provided above is temporary. Please log in and immediately update your email, password, and profile information from the dashboard settings section.\n\nRegards,\nSystem Administrator`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; padding: 2rem; border-radius: 12px; line-height: 1.6;">
                <h2 style="color: #4338ca;">Account Created Successfully</h2>
                <p>Hi <strong>${name}</strong>,</p>
                <p>Your hospital administration account has been successfully created by the <strong>Super Admin</strong>. You now have full access to manage your facility's feedbacks and staff.</p>
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border: 1px solid #e2e8f0;">
                    <p style="margin: 0.5rem 0;"><strong>Login URL:</strong> <a href="${loginLink}">${loginLink}</a></p>
                    <p style="margin: 0.5rem 0;"><strong>Login Email ID:</strong> ${email}</p>
                    <p style="margin: 0.5rem 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: #1e293b;">${password}</code></p>
                </div>
                <div style="background: #fff; border-left: 4px solid #f59e0b; padding: 1rem; margin: 1.5rem 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <p style="margin: 0; font-weight: bold; color: #b45309;">⚠️ Security Notice</p>
                    <p style="margin: 0.5rem 0 0; color: #475569; font-size: 0.95rem;">
                        The provided password is <strong>temporary</strong>. Please log in and navigate to the <strong>Account Settings</strong> section to update your email, password, and profile information immediately.
                    </p>
                </div>
                <p style="color: #64748b; font-size: 0.9rem; margin-top: 2rem;">Regards,<br>System Administrator</p>
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
