import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import toast, { Toaster } from 'react-hot-toast';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState('request');
    const [email, setEmail] = useState(location.state?.email || '');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [infoMessage, setInfoMessage] = useState('');

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
        }
    }, [location.state]);

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error('Please enter your email address.');
            return;
        }

        setLoading(true);
        setInfoMessage('');
        try {
            await API.post('/users/forgot-password', { email: email.trim().toLowerCase() });
            setStep('verify');
            setInfoMessage('OTP sent. Please check your email and enter the code below.');
            toast.success('Reset code sent to your email');
        } catch (error) {
            console.error('[FORGOT PASSWORD] Error:', error);
            toast.error(error.response?.data?.message || 'Unable to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            toast.error('Please enter the 6-digit code.');
            return;
        }

        setLoading(true);
        try {
            await API.post('/users/verify-otp', {
                email: email.trim().toLowerCase(),
                otp: otp.trim(),
            });
            setStep('reset');
            toast.success('OTP verified. Enter your new password.');
        } catch (error) {
            console.error('[VERIFY OTP] Error:', error);
            toast.error(error.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            toast.error('Please enter and confirm your new password.');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Password confirmation does not match.');
            return;
        }

        setLoading(true);
        try {
            await API.post('/users/reset-password', {
                email: email.trim().toLowerCase(),
                otp: otp.trim(),
                newPassword,
            });
            toast.success('Password reset successful. Please login with your new password.');
            navigate('/login');
        } catch (error) {
            console.error('[RESET PASSWORD] Error:', error);
            toast.error(error.response?.data?.message || 'Unable to reset password');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 'request') {
            navigate('/login');
            return;
        }
        setStep('request');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setInfoMessage('');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '2rem' }}>
            <Toaster />
            <div className="card" style={{ width: '100%', maxWidth: '28rem', padding: '2.5rem' }}>
                <div style={{ marginBottom: '1.75rem' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Forgot Password</h2>
                    <p style={{ color: '#6B7280', margin: 0 }}>
                        {step === 'request' && 'Enter your registered email to receive a 6-digit reset code.'}
                        {step === 'verify' && 'Enter the code sent to your email to continue.'}
                        {step === 'reset' && 'Set a new password for your account.'}
                    </p>
                </div>

                {infoMessage && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '12px', backgroundColor: '#eef2ff', color: '#4338ca' }}>
                        {infoMessage}
                    </div>
                )}

                {step === 'request' && (
                    <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-control"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.85rem' }}>
                            {loading ? 'Sending code...' : 'Send Reset Code'}
                        </button>
                    </form>
                )}

                {step === 'verify' && (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Email Address</label>
                            <input type="email" className="form-control" value={email} disabled />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Verification Code</label>
                            <input
                                type="text"
                                className="form-control"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="123456"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.85rem' }}>
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                    </form>
                )}

                {step === 'reset' && (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                className="form-control"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                className="form-control"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.85rem' }}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                    <button
                        type="button"
                        className="btn-outline"
                        onClick={handleBack}
                        style={{ width: '100%', padding: '0.85rem' }}
                    >
                        {step === 'request' ? 'Back to login' : 'Back to previous step'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
