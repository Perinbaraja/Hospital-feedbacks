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

const buildAttachmentFromDataUrl = (dataUrl, fallbackBaseName = 'feedback-photo') => {
    const rawValue = String(dataUrl || '').trim();
    const matches = rawValue.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matches) return null;

    const mimeType = matches[1];
    const base64Content = matches[2];
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const safeBaseName = String(fallbackBaseName || 'feedback-photo')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'feedback-photo';

    return {
        filename: `${safeBaseName}.${extension}`,
        content: base64Content,
        encoding: 'base64',
        contentType: mimeType
    };
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

export const sendThankYouEmail = async (toEmail, name, req = null) => {
    if (!toEmail) {
        console.error('Thank you email failed: Missing recipient');
        throw new Error('Recipient email is required');
    }

    const recipients = [new Recipient(toEmail, name || 'Valued User')];
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject('Thank You For Your Feedback')
        .setHtml(`<h2>Thank You For Your Feedback</h2><p>Hi ${name || 'Valued User'},</p><p>Thank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.</p><p>Thanks,<br>Have a wonderful day!</p>`)
        .setText(`Hi ${name || 'Valued User'},\n\nThank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.\n\nThanks,\nHave a wonderful day!`);

    const mailOptions = {
        from: process.env.GMAIL_USER || process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Thank You For Your Feedback',
        html: `<h2>Thank You For Your Feedback</h2><p>Hi ${name || 'Valued User'},</p><p>Thank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.</p><p>Thanks,<br>Have a wonderful day!</p>`,
        text: `Hi ${name || 'Valued User'},\n\nThank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.\n\nThanks,\nHave a wonderful day!`,
    };

    return sendEmailWithFallback({ emailParams, mailOptions, label: `Thank You Email to ${toEmail}` });
};

export const sendResolutionEmail = async (toEmail, name, req = null) => {
    if (!toEmail) {
        console.error('Resolution email failed: Missing recipient');
        throw new Error('Recipient email is required');
    }

    const loginLink = getFrontendLink('/login', req);
    const recipients = [new Recipient(toEmail, name || 'Valued User')];
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject('Your Feedback Query Has Been Rectified/Updated')
        .setHtml(`<h2>Your Feedback Query Has Been Rectified</h2><p>Hi ${name || 'Valued User'},</p><p>We wanted to let you know that the issue you reported has been reviewed and rectified by our team.</p><p><a href="${loginLink}" style="display: inline-block; background: #4338ca; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Status</a></p><p>Thanks,<br>Have a wonderful day!</p>`)
        .setText(`Hi ${name || 'Valued User'},\n\nWe wanted to let you know that the issue you reported has been reviewed and rectified by our team.\n\nLogin to view details: ${loginLink}\n\nThanks,\nHave a wonderful day!`);

    const mailOptions = {
        from: process.env.GMAIL_USER || process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Your Feedback Query Has Been Rectified/Updated',
        html: `<h2>Your Feedback Query Has Been Rectified</h2><p>Hi ${name || 'Valued User'},</p><p>We wanted to let you know that the issue you reported has been reviewed and rectified by our team.</p><p><a href="${loginLink}" style="display: inline-block; background: #4338ca; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Status</a></p><p>Thanks,<br>Have a wonderful day!</p>`,
        text: `Hi ${name || 'Valued User'},\n\nWe wanted to let you know that the issue you reported has been reviewed and rectified by our team.\n\nLogin to view details: ${loginLink}\n\nThanks,\nHave a wonderful day!`,
    };

    return sendEmailWithFallback({ emailParams, mailOptions, label: `Resolution Email to ${toEmail}` });
};

export const sendFeedbackNotificationEmail = async ({
    toEmail,
    recipientName,
    hospitalName,
    departmentName,
    feedbackType,
    feedbackLabel,
    patientName,
    patientEmail,
    comment,
    image,
    req = null
}) => {
    if (!toEmail) {
        throw new Error('Recipient email is required');
    }

    const safeRecipient = recipientName || 'Hospital Team';
    const safePatientName = patientName || 'Anonymous Patient';
    const safePatientEmail = patientEmail || 'Not provided';
    const safeComment = comment || 'No additional comment provided.';
    const safeType = feedbackType === 'positive' ? 'Positive' : 'Negative';
    const attachment = buildAttachmentFromDataUrl(image, `${hospitalName || 'hospital'}-${departmentName || 'department'}-${feedbackLabel || 'feedback'}`);
    const hasAttachment = Boolean(attachment);

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 680px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">New ${safeType} Feedback Notification</h2>
            <p>Hi <strong>${safeRecipient}</strong>,</p>
            <p>A new patient feedback item was submitted and matched your configured feedback rule.</p>
            <div style="margin: 24px 0; padding: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                <p style="margin: 6px 0;"><strong>Hospital:</strong> ${hospitalName || 'Hospital'}</p>
                <p style="margin: 6px 0;"><strong>Department:</strong> ${departmentName || 'Department'}</p>
                <p style="margin: 6px 0;"><strong>Feedback Type:</strong> ${safeType}</p>
                <p style="margin: 6px 0;"><strong>Configured Label:</strong> ${feedbackLabel || 'General Feedback'}</p>
                <p style="margin: 6px 0;"><strong>Patient Name:</strong> ${safePatientName}</p>
                <p style="margin: 6px 0;"><strong>Patient Email:</strong> ${safePatientEmail}</p>
                <p style="margin: 6px 0;"><strong>Comment:</strong> ${safeComment}</p>
                <p style="margin: 6px 0;"><strong>Photo Attachment:</strong> ${hasAttachment ? 'Attached to this email' : 'Not provided'}</p>
            </div>
            <p style="color: #64748b; font-size: 0.9rem;">This message was generated automatically by the hospital feedback system.</p>
        </div>
    `;

    const textContent = `New ${safeType} feedback notification

Hospital: ${hospitalName || 'Hospital'}
Department: ${departmentName || 'Department'}
Configured Label: ${feedbackLabel || 'General Feedback'}
Patient Name: ${safePatientName}
Patient Email: ${safePatientEmail}
Comment: ${safeComment}
Photo Attachment: ${hasAttachment ? 'Attached to this email' : 'Not provided'}`;

    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo([new Recipient(toEmail, safeRecipient)])
        .setSubject(`New ${safeType} Feedback - ${departmentName || 'Department'}`)
        .setHtml(htmlContent)
        .setText(textContent);

    const mailOptions = {
        from: process.env.GMAIL_USER || process.env.EMAIL_USER,
        to: toEmail,
        subject: `New ${safeType} Feedback - ${departmentName || 'Department'}`,
        html: htmlContent,
        text: textContent,
        attachments: hasAttachment ? [attachment] : [],
    };

    return sendEmailWithFallback({
        emailParams,
        mailOptions,
        label: `Feedback Notification to ${toEmail}`,
        preferNodemailer: hasAttachment
    });
};

export const sendAdminCredentialsEmail = async (toEmail, name, email, password, req = null) => {
    if (!toEmail) {
        console.error('Credential email failed: Missing recipient');
        throw new Error('Recipient email is required');
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

    const mailOptions = {
        from: process.env.GMAIL_USER || process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Hospital Administration - Access Credentials',
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
                <p style="color: #64748b; font-size: 0.9rem; margin-top: 2rem;">Regards,<br>System Administrator</p>
            </div>
        `,
        text: `Hi ${name},\n\nYour hospital administration account has been created by the Super Admin.\n\nLogin URL: ${loginLink}\nLogin Email ID: ${email}\nTemporary Password: ${password}\n\nRegards,\nSystem Administrator`,
    };

    return sendEmailWithFallback({ emailParams, mailOptions, label: `Credentials Email to ${toEmail}` });
};

const isMailerSendConfigured = Boolean(process.env.MAILERSEND_API_KEY);
const smtpUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
const smtpPass = process.env.GMAIL_PASS || process.env.EMAIL_PASS;
const isGmailConfigured = Boolean(smtpUser && smtpPass);

const createGmailTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });
};

const sendViaNodemailer = async (mailOptions, label) => {
    try {
        const transporter = createGmailTransporter();
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Service] ${label} - Success: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[Email Service] ${label} - Error:`, error.message || error);
        throw error;
    }
};

const sendEmailWithFallback = async ({ emailParams, mailOptions, label, preferNodemailer = false }) => {
    if (!preferNodemailer && isMailerSendConfigured && emailParams) {
        try {
            return await fireAndForgetEmail(emailParams, label);
        } catch (mailerError) {
            console.warn(`[Email Service] ${label} - MailerSend failed, falling back to Nodemailer.`, mailerError.message || mailerError);
            if (isGmailConfigured && mailOptions) {
                return await sendViaNodemailer(mailOptions, label);
            }
            throw mailerError;
        }
    }

    if (isGmailConfigured && mailOptions) {
        return await sendViaNodemailer(mailOptions, label);
    }

    throw new Error('No email provider configured. Set MAILERSEND_API_KEY or EMAIL_USER / EMAIL_PASS in environment.');
};

export const sendPasswordResetOtpEmail = async (toEmail, otp, req = null) => {
    if (!toEmail) {
        console.error('Password reset email failed: Missing recipient');
        throw new Error('Recipient email is required');
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4338ca; margin-top: 0;">Password Reset Code</h2>
            <p>Use the code below to reset your password. This code will expire in 5 minutes.</p>
            <div style="margin: 24px 0; padding: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 1.5rem; letter-spacing: 0.2em; text-align: center; font-weight: 700;">
                ${otp}
            </div>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p style="color: #64748b; font-size: 0.9rem; margin-top: 16px;">Thanks,<br/>Hospital Feedback Management Team</p>
        </div>
    `;

    const textContent = `Your password reset code is: ${otp}\n\nThis code expires in 5 minutes. If you did not request a reset, please ignore this message.`;

    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo([new Recipient(toEmail, 'Hospital User')])
        .setSubject('Your password reset code')
        .setHtml(htmlContent)
        .setText(textContent);

    const mailOptions = {
        from: process.env.GMAIL_USER || process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Your password reset code',
        html: htmlContent,
        text: textContent,
    };

    return sendEmailWithFallback({ emailParams, mailOptions, label: `Password Reset OTP to ${toEmail}` });
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
