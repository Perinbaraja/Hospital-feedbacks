import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

let __emailDirname;
if (typeof __dirname !== 'undefined') {
  __emailDirname = __dirname;
} else if (typeof import.meta !== 'undefined' && import.meta.url) {
  const __emailFilename = fileURLToPath(import.meta.url);
  __emailDirname = path.dirname(__emailFilename);
} else {
  __emailDirname = path.resolve(process.cwd(), 'backend', 'services');
}

dotenv.config({ path: path.resolve(__emailDirname, '..', '.env') });

const mailersend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY,
});

const senderEmail = process.env.EMAIL_USER || 'info@test-q3enl6kdw8m42vwr.mlsender.net';
const sentFrom = new Sender(senderEmail, 'Hospital Feedback Management');

// Helper to get dynamic frontend URL
const getFrontendUrl = (req = null) => {
    if (req && typeof req.get === 'function') {
        const host = req.get('host');
        const protocol = host.includes('localhost') ? 'http' : 'https';
        if (host.includes('localhost:5000')) {
            return `http://localhost:5173`;
        }
        return `${protocol}://${host}`;
    }
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
    if (process.env.URL) return process.env.URL;
    return 'http://localhost:5173';
};

const getFrontendLink = (path = '', req = null) => {
    const base = getFrontendUrl(req).replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

// NON-BLOCKING: Internal helper that returns a Promise so callers can safely await/catch if needed.
const fireAndForgetEmail = (emailParams, label) => {
    return mailersend.email.send(emailParams)
        .then(response => {
            console.log(`[Email Service] ${label} - Success:`, response.statusCode);
            return response;
        })
        .catch(error => {
            console.error(`[Email Service] ${label} - Error:`, error.body?.message || error.message);
            // Re-throw so callers using .catch(...) can still handle it.
            throw error;
        });
};

export const sendThankYouEmail = (toEmail, name, req = null) => {
    if (!toEmail || !process.env.MAILERSEND_API_KEY) {
        console.warn('Email skipped: Missing recipient or API key');
        return Promise.resolve({ skipped: true });
    }

    const recipients = [new Recipient(toEmail, name || 'Valued User')];
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject('Thank You For Your Feedback')
        .setHtml(`<h2>Thank You For Your Feedback</h2><p>Hi ${name || 'Valued User'},</p><p>Thank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.</p><p>Thanks,<br>Have a wonderful day!</p>`)
        .setText(`Hi ${name || 'Valued User'},\n\nThank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.\n\nThanks,\nHave a wonderful day!`);

    return fireAndForgetEmail(emailParams, `Thank You Email to ${toEmail}`);
};

export const sendResolutionEmail = (toEmail, name, req = null) => {
    if (!toEmail || !process.env.MAILERSEND_API_KEY) {
        console.warn('Email skipped: Missing recipient or API key');
        return Promise.resolve({ skipped: true });
    }

    const loginLink = getFrontendLink('/login', req);
    const recipients = [new Recipient(toEmail, name || 'Valued User')];
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject('Your Feedback Query Has Been Rectified/Updated')
        .setHtml(`<h2>Your Feedback Query Has Been Rectified</h2><p>Hi ${name || 'Valued User'},</p><p>We wanted to let you know that the issue you reported has been reviewed and rectified by our team.</p><p><a href="${loginLink}" style="display: inline-block; background: #4338ca; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Status</a></p><p>Thanks,<br>Have a wonderful day!</p>`)
        .setText(`Hi ${name || 'Valued User'},\n\nWe wanted to let you know that the issue you reported has been reviewed and rectified by our team.\n\nLogin to view details: ${loginLink}\n\nThanks,\nHave a wonderful day!`);

    return fireAndForgetEmail(emailParams, `Resolution Email to ${toEmail}`);
};

export const sendAdminCredentialsEmail = (toEmail, name, email, password, req = null) => {
    if (!toEmail || !process.env.MAILERSEND_API_KEY) {
        console.warn('Credential email skipped: Missing recipient or API key');
        return Promise.resolve({ skipped: true });
    }

    const loginLink = getFrontendLink('/login', req);
    const recipients = [new Recipient(toEmail, name || 'Hospital Admin')];
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject('Hospital Administration - Access Credentials')
        .setHtml(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; padding: 2rem; border-radius: 12px; line-height: 1.6;">
                <h2 style="color: #4338ca;">Account Created Successfully</h2>
                <p>Hi <strong>${name}</strong>,</p>
                <p>Your hospital administration account has been successfully created by the <strong>Super Admin</strong>. You now have full access to manage your facility's feedbacks and staff.</p>
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border: 1px solid #e2e8f0;">
                    <p style="margin: 0.5rem 0;"><strong>Login URL:</strong> <a href="${loginLink}">${loginLink}</a></p>
                    <p style="margin: 0.5rem 0;"><strong>Login Email ID:</strong> ${email}</p>
                    <p style="margin: 0.5rem 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: #1e293b;">${password}</code></p>
                </div>
                <p style="color: #64748b; font-size: 0.9rem; margin-top: 2rem;">Regards,<br>System Administrator</p>
            </div>
        `)
        .setText(`Hi ${name},\n\nYour hospital administration account has been created by the Super Admin.\n\nLogin URL: ${loginLink}\nLogin Email ID: ${email}\nTemporary Password: ${password}\n\nRegards,\nSystem Administrator`);

    return fireAndForgetEmail(emailParams, `Credentials Email to ${toEmail}`);
};

// ---------------------------------------------------------
// GMAIL NODEMAILER SERVICE (For Department Assignments)
// ---------------------------------------------------------
export const sendDepartmentAssignmentEmail = async (toEmail, inchargeName, dept) => {
    // Note: User must define GMAIL_USER and GMAIL_PASS in .env
    const user = process.env.GMAIL_USER || process.env.EMAIL_USER;
    const pass = process.env.GMAIL_PASS || process.env.MAILERSEND_API_KEY;

    if (!toEmail || !user || !pass) {
        console.warn('[Gmail Service] Skipping department assignment email: Missing credentials or recipient.');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass
            }
        });

        const mailOptions = {
            from: `"Hospital Workflow" <${user}>`,
            to: toEmail,
            subject: `New Assignment: ${dept.name} Department`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e1e7f0; padding: 25px; border-radius: 12px; border-top: 4px solid #1e293b;">
                    <h2 style="color: #1e293b; margin-top: 0;">Department Assignment</h2>
                    <p>Hi <strong>${inchargeName}</strong>,</p>
                    <p>You have been assigned as an incharge for the following department:</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #edf2f7; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Department Name:</strong> ${dept.name}</p>
                        <p style="margin: 5px 0;"><strong>Summary:</strong> ${dept.description || 'No description provided'}</p>
                    </div>
                    <p>Please log in to your dashboard to manage upcoming feedback and staff workflow for this department.</p>
                    <p style="color: #64748b; font-size: 0.85rem; margin-top: 25px; border-top: 1px solid #edf2f7; padding-top: 15px;">
                        This is an automated notification from the Hospital Management System.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Gmail Service] Dept Assignment email sent to ${toEmail}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[Gmail Service] Error sending to ${toEmail}:`, error.message);
        throw error;
    }
};
