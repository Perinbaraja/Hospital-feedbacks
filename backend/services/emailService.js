import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendThankYouEmail = async (toEmail, name) => {
    if (!toEmail) return;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Thank You For Your Feedback',
        text: `Hi ${name || 'Valued User'},\n\nThank you for providing your feedback. We are working on it and will send you updates if we need more information or once the issue is resolved.\n\nThanks,\nHave a wonderful day!`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Thank you email sent to: ${toEmail}`);
    } catch (error) {
        console.error(`Error sending email to ${toEmail}:`, error);
    }
};

export const sendResolutionEmail = async (toEmail, name) => {
    if (!toEmail) return;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Your Feedback Query Has Been Rectified/Updated',
        text: `Hi ${name || 'Valued User'},\n\nWe wanted to let you know that the issue you reported has been reviewed and rectified by our team.\n\nThanks,\nHave a wonderful day!`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Resolution email sent to: ${toEmail}`);
    } catch (error) {
        console.error(`Error sending email to ${toEmail}:`, error);
    }
};
