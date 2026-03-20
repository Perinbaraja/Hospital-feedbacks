import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Verification Logging
console.log('----------------------------------------------------');
console.log('📧 [Email Service] Initializing configuration...');
console.log('📧 [Email Service] From Email:', process.env.EMAIL_USER || 'NOT CONFIGURED');
console.log('----------------------------------------------------');

const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY,
});

/**
 * Utility to generate a Sender object
 */
const getSender = () => {
    return new Sender(process.env.EMAIL_USER?.trim() || '', "Hospital Feedback System");
};

/**
 * sendThankYouEmail
 * Purpose: Acknowledge feedback submission
 */
export const sendThankYouEmail = async (toEmail, name) => {
    console.log(`[Email Service] Triggering Thank You email for: ${toEmail}`);
    if (!toEmail || !process.env.MAILERSEND_API_KEY) {
        console.warn('[Email Service] Skip: Missing configuration or recipient');
        return { success: false, reason: 'Incomplete config' };
    }

    const safeName = (name || "Valued User").trim();

    try {
        const recipients = [new Recipient(toEmail, safeName)];
        
        const text = `Dear ${safeName},\n\nThank you for your feedback. We truly appreciate you taking the time to share your experience with us. Your input helps us improve our services and serve you better.`;
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; color: #334155;">
                <h2 style="color: #4338ca;">Thank You for Your Feedback</h2>
                <p>Dear ${safeName},</p>
                <p>Thank you for your feedback. We truly appreciate you taking the time to share your experience with us.</p>
                <p>Your input helps us improve our services and serve you better.</p>
                <p style="margin-top: 2rem; color: #64748b; font-size: 0.9rem;">Regards,<br>Hospital Administration</p>
            </div>
        `;

        const emailParams = new EmailParams()
            .setFrom(getSender())
            .setTo(recipients)
            .setSubject('Thank You For Your Feedback')
            .setHtml(html)
            .setText(text);

        await mailerSend.email.send(emailParams);
        console.log(`[Email Service Success] Thank You email sent to: ${toEmail}`);
        return { success: true };
    } catch (error) {
        console.error(`[Email Service Error] Thank You email failed:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * sendResolutionEmail
 * Purpose: Notify user that an issue has been addressed (triggered on COMPLETED)
 */
export const sendResolutionEmail = async (toEmail, name) => {
    console.log(`[Email Service] Triggering Resolution email for: ${toEmail}`);
    if (!toEmail || !process.env.MAILERSEND_API_KEY) {
        console.warn('[Email Service] Skip: Missing configuration or recipient');
        return { success: false, reason: 'Incomplete config' };
    }

    const safeName = (name || "Valued User").trim();

    try {
        const recipients = [new Recipient(toEmail, safeName)];
        
        const text = `Dear ${safeName},\n\nWe would like to inform you that your feedback has been carefully reviewed and the reported issue has been successfully addressed. We appreciate your patience and value your feedback.`;
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; color: #334155;">
                <h2 style="color: #4338ca;">Feedback Update</h2>
                <p>Dear ${safeName},</p>
                <p>We would like to inform you that your feedback has been carefully reviewed and the reported issue has been successfully addressed.</p>
                <p>We appreciate your patience and value your feedback.</p>
                <p style="margin-top: 2rem; color: #64748b; font-size: 0.9rem;">Regards,<br>Hospital Administration System</p>
            </div>
        `;

        const emailParams = new EmailParams()
            .setFrom(getSender())
            .setTo(recipients)
            .setSubject('Update Regarding Your Feedback Reference')
            .setHtml(html)
            .setText(text);

        await mailerSend.email.send(emailParams);
        console.log(`[Email Service Success] Resolution email sent to: ${toEmail}`);
        return { success: true };
    } catch (error) {
        console.error(`[Email Service Error] Resolution email failed:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * sendAdminCredentialsEmail
 */
export const sendAdminCredentialsEmail = async (toEmail, name, email, password) => {
    console.log(`[Email Service] Triggering Admin Credentials email for: ${toEmail}`);
    if (!toEmail || !process.env.MAILERSEND_API_KEY) return { success: false };

    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const loginLink = `${frontendUrl}/login`;
        const safeName = (name || "Admin").trim();
        const recipients = [new Recipient(toEmail, safeName)];
        
        const emailParams = new EmailParams()
            .setFrom(getSender())
            .setTo(recipients)
            .setSubject('Hospital Administration - Access Credentials')
            .setHtml(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; padding: 2rem; border-radius: 12px; line-height: 1.6;">
                    <h2 style="color: #4338ca;">Account Created Successfully</h2>
                    <p>Hi <strong>${safeName}</strong>,</p>
                    <p>Your hospital administration account has been successfully created. You now have full access to manage your facility's feedbacks and staff.</p>
                    <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0.5rem 0;"><strong>Login URL:</strong> <a href="${loginLink}">${loginLink}</a></p>
                        <p style="margin: 0.5rem 0;"><strong>Login Email ID:</strong> ${email}</p>
                        <p style="margin: 0.5rem 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: #1e293b;">${password}</code></p>
                    </div>
                    <p style="color: #64748b; font-size: 0.9rem; margin-top: 2rem;">Regards,<br>System Administrator</p>
                </div>
            `)
            .setText(`Hi ${safeName},\n\nYour account has been created.\nLogin URL: ${loginLink}\nEmail: ${email}\nPassword: ${password}`);

        await mailerSend.email.send(emailParams);
        console.log(`[Email Service Success] Credentials email sent to: ${toEmail}`);
        return { success: true };
    } catch (error) {
        console.error(`[Email Service Error] Credentials email failed:`, error.message);
        return { success: false, error: error.message };
    }
};
