import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import toast, { Toaster } from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [isResetMode, setIsResetMode] = useState(false);
    const [newPass, setNewPass] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userData = await login(email, password);
            if (userData.role === 'Super_Admin') {
                navigate('/super-admin');
            } else if (userData.role === 'Admin') {
                navigate('/admin');
            } else {
                navigate('/dept');
            }
            toast.success('Welcome back!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid login credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post('/users/reset-password', { email, newPassword: newPass });
            toast.success('Password updated successfully! Please login with your new password.');
            setIsResetMode(false);
            setNewPass('');
            setPassword('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    if (isResetMode) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
                <Toaster />
                <div className="card" style={{ width: '100%', maxWidth: '28rem', padding: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.875rem' }}>Reset Password</h2>
                        <p style={{ color: '#6B7280' }}>Enter your email and a new password</p>
                    </div>
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <input type="email" className="form-control" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your Email" />
                        <input type="password" className="form-control" required value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New Password" />
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Resetting...' : 'Update Password'}</button>
                        <button type="button" className="btn-outline" onClick={() => setIsResetMode(false)}>Back to Login</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
            <Toaster />
            <div className="card" style={{ width: '100%', maxWidth: '28rem', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.875rem', color: '#111827' }}>Staff Login</h2>
                    <p style={{ color: '#6B7280', marginTop: '0.5rem' }}>Sign in to manage feedbacks & assignments</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-control"
                            required
                            autoComplete="off"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.8rem', cursor: 'pointer' }}
                                onClick={() => setIsResetMode(true)}
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
