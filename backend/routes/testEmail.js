import express from 'express';
import { sendThankYouEmail } from '../services/emailService.js';

const router = express.Router();

// @desc    Test Email Sending
// @route   GET /api/test-email
router.get('/test-email', async (req, res) => {
    console.log('[Test Email Service] /api/test-email route triggered');
    try {
        const testEmail = 'erajivv@gmail.com';
        const testName = 'Test User';
        console.log(`[Test Email Service] Calling sendThankYouEmail for: ${testEmail}`);
        
        const result = await sendThankYouEmail(testEmail, testName);
        
        if (result.success) {
            console.log('[Test Email Service] Success confirmed');
            res.json({ message: 'Email sent successfully via MailerSend', result });
        } else {
            console.error('[Test Email Service] API rejected delivery:', result.error || result.reason);
            res.status(400).json({ message: 'MailerSend failed to send email', result });
        }
    } catch (error) {
        console.error('[Test Email Service] Unexpected Crash:', error.message);
        res.status(500).json({ message: 'Internal server error during email test', error: error.message });
    }
});

export default router;
