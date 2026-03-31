import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, user: authenticatedUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (authenticatedUser) {
            const role = authenticatedUser.role?.toLowerCase();
            if (['super_admin'].includes(role)) navigate('/super-admin');
            else if (['admin', 'hospital_admin'].includes(role)) navigate('/admin');
            else if (['dept_head'].includes(role)) navigate('/dept');
        }
    }, [authenticatedUser, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const cleanEmail = email.trim().toLowerCase();
            const userData = await login(cleanEmail, password);
            const role = (userData.role || '').toLowerCase().replace(/[^a-z]/g, '');

            if (role === 'superadmin') {
                navigate('/super-admin');
            } else if (['admin', 'hospitaladmin'].includes(role)) {
                navigate('/admin');
            } else if (role === 'depthead') {
                navigate('/dept');
            } else {
                navigate('/login');
            }
            toast.success('Welcome back!');
        } catch (error) {
            console.error('[LOGIN] Process Failed:', error);
            toast.error(error.response?.data?.message || 'Invalid login credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        navigate('/forgot-password', { state: { email } });
    };

    if (authenticatedUser) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
                <div className="spinner"></div>
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
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide Password' : 'Show Password'}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.8rem', cursor: 'pointer' }}
                                onClick={handleForgotPassword}
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
