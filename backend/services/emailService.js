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
 * Purpose: Send login credentials to a new hospital admin
 */
export const sendAdminCredentialsEmail = async (toEmail, name, email, password) => {
    // 8. Send email ONLY if email exists
    if (!toEmail) {
        console.warn("[Email Service] Skip: No recipient email provided");
        return { success: false, reason: 'No email' };
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
        console.warn(`[Email Service] Skip: Invalid email format (${toEmail})`);
        return { success: false, reason: 'Invalid email format' };
    }

    if (!process.env.MAILERSEND_API_KEY) {
        console.error("[Email Service] Error: MAILERSEND_API_KEY is missing");
        return { success: false, reason: 'Missing API Key' };
    }

    // 6. Add logs before sending email
    console.log("Sending credentials to:", email);
    console.log("Password:", password);

    try {
        const safeName = (name || "Admin").trim();
        const recipients = [new Recipient(toEmail, safeName)];
        
        // 4. Email Content (Professional)
        const text = `Dear ${safeName},
Your hospital account has been successfully created.
Please use the following credentials to log in:

Email: ${email}
Password: ${password}

We recommend changing your password after logging in.`;

        const html = `
<div style="font-family: Arial;">
  <h2>Hospital Account Created</h2>
  <p>Dear ${safeName},</p>
  <p>Your hospital account has been successfully created.</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Password:</strong> ${password}</p>
  <p>Please change your password after logging in.</p>
</div>`;

        const emailParams = new EmailParams()
            .setFrom(getSender())
            .setTo(recipients)
            .setSubject('Hospital Account Created')
            .setHtml(html)
            .setText(text);

        await mailerSend.email.send(emailParams);
        console.log(`[Email Service Success] Credentials email sent successfully to: ${toEmail}`);
        return { success: true };
    } catch (error) {
        // 6. Log full error if email fails
        console.error("MailerSend Error:", error);
        return { success: false, error: error.message || error };
    }
};
