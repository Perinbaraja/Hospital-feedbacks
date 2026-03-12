import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 55%, #0D3A35 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative bg blobs */}
      <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '480px', height: '480px', borderRadius: '50%', background: 'rgba(13,148,136,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(212,168,83,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '40%', left: '10%', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(13,148,136,0.04)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeUp 0.6s ease forwards' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '68px', height: '68px',
            background: 'linear-gradient(135deg, var(--teal), var(--teal-light))',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', boxShadow: '0 8px 32px rgba(13,148,136,0.4)',
            fontSize: '28px'
          }}>
            🏥
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
            MediCare Hospital
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', letterSpacing: '0.04em' }}>
            ADMIN PORTAL
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 'var(--radius-xl)', padding: '40px',
          boxShadow: '0 32px 72px rgba(0,0,0,0.28)'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>
            Sign In
          </h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px', marginBottom: '28px' }}>
            Access the feedback management dashboard
          </p>

          {error && (
            <div style={{
              background: 'var(--red-light)', color: '#991B1B', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '20px',
              borderLeft: '3px solid var(--red)', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>✉️</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="admin@hospital.com"
                  style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                  onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔒</span>
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 42px 12px 40px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                  onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--gray-400)' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', marginTop: '6px',
              background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, var(--navy), var(--navy-mid))',
              color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '15px',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(10,22,40,0.3)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}>
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In →'}
            </button>
          </form>

          {/* Credentials hint */}
          <div style={{ marginTop: '24px', padding: '14px', background: '#F0FDF9', borderRadius: 'var(--radius)', border: '1px solid var(--teal-pale)' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default Credentials</p>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>📧 admin@hospital.com</p>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>🔑 Admin@123</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.65)' }}>← Back to Patient Feedback Form</a>
        </p>
      </div>
    </div>
  );
}
