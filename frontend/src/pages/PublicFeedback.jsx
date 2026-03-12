import React, { useState } from 'react';
import api from '../services/api';

const DEPARTMENTS = ['Emergency','Cardiology','Neurology','Orthopedics','Pediatrics','Oncology','Radiology','General Surgery','Outpatient','Pharmacy','Nursing','Administration'];
const TYPES = ['Compliment','Complaint','Suggestion','General'];

const inputStyle = {
  width: '100%', padding: '12px 16px',
  border: '1.5px solid #E5E7EB',
  borderRadius: '12px', fontSize: '15px', outline: 'none',
  background: 'white', transition: 'border-color 0.2s',
  fontFamily: 'inherit'
};

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {[1,2,3,4,5].map(star => (
          <button key={star} type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px',
              transition: 'transform 0.15s',
              transform: star <= (hovered || value) ? 'scale(1.15)' : 'scale(1)',
              filter: star <= (hovered || value) ? 'none' : 'grayscale(1) opacity(0.4)'
            }}>
            ⭐
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0D9488' }}>
          {labels[hovered || value]}
        </span>
      )}
    </div>
  );
}

const Field = ({ label, required, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function PublicFeedback() {
  const [form, setForm] = useState({
    patientName: '', patientEmail: '', patientPhone: '',
    department: '', visitDate: '', feedbackType: 'General',
    rating: 0, message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) { setError('Please select a star rating.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/feedback', form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A1628 0%, #112240 55%, #0D3A35 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '56px 48px', textAlign: 'center', maxWidth: '480px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>💚</div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 700, color: '#0A1628', marginBottom: '14px' }}>Thank You!</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.7, marginBottom: '12px' }}>Your feedback has been received and forwarded to the</p>
        <div style={{ display: 'inline-block', background: '#CCFBF1', color: '#0D9488', padding: '6px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '14px', marginBottom: '20px' }}>
          {form.department} Department
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '32px', fontSize: '24px' }}>
          {[1,2,3,4,5].map(s => <span key={s} style={{ filter: s <= form.rating ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>)}
        </div>
        <button onClick={() => { setSubmitted(false); setForm({ patientName:'', patientEmail:'', patientPhone:'', department:'', visitDate:'', feedbackType:'General', rating:0, message:'' }); }}
          style={{ background: 'linear-gradient(135deg, #0A1628, #112240)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          Submit Another Feedback
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0A1628 0%, #112240 50%, #0B2D38 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #0D9488, #14B8A6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏥</div>
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 700, color: 'white' }}>MediCare Hospital</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Patient Feedback Portal</div>
          </div>
        </div>
        <a href="/login" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}>
          Admin →
        </a>
      </header>

      {/* Hero */}
      <div style={{ padding: '52px 20px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(13,148,136,0.15)', color: '#14B8A6', padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '18px', border: '1px solid rgba(13,148,136,0.25)', textTransform: 'uppercase' }}>
          Your Voice Matters
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 50px)', fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: '14px' }}>
          Share Your <span style={{ color: '#14B8A6' }}>Experience</span><br />With Us
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '16px', maxWidth: '440px', margin: '0 auto 48px', lineHeight: 1.75 }}>
          Help us provide better care. Your feedback is sent directly to the right department.
        </p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 72px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: 'clamp(28px, 5vw, 48px)', width: '100%', maxWidth: '700px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
          <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 700, color: '#0A1628', marginBottom: '4px' }}>Feedback Form</h2>
            <p style={{ color: '#9CA3AF', fontSize: '13px' }}>Fields marked with * are required</p>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '24px', borderLeft: '3px solid #EF4444' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '18px' }}>
              <Field label="Full Name" required>
                <input value={form.patientName} onChange={e => set('patientName', e.target.value)} required placeholder="John Doe" style={inputStyle} />
              </Field>
              <Field label="Email Address (Optional)">
                <input type="email" value={form.patientEmail} onChange={e => set('patientEmail', e.target.value)} placeholder="john@email.com" style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '18px' }}>
              <Field label="Phone Number">
                <input value={form.patientPhone} onChange={e => set('patientPhone', e.target.value)} placeholder="+91 XXXXX XXXXX" style={inputStyle} />
              </Field>
              <Field label="Date of Visit" required>
                <input type="date" value={form.visitDate} onChange={e => set('visitDate', e.target.value)} required style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '18px' }}>
              <Field label="Department" required>
                <select value={form.department} onChange={e => set('department', e.target.value)} required style={inputStyle}>
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Feedback Type">
                <select value={form.feedbackType} onChange={e => set('feedbackType', e.target.value)} style={inputStyle}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ marginBottom: '18px', padding: '20px', background: '#F9FAFB', borderRadius: '12px', border: '1.5px solid #F3F4F6' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Overall Rating <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <StarRating value={form.rating} onChange={r => set('rating', r)} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your Message <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea value={form.message} onChange={e => set('message', e.target.value)} required rows={5}
                placeholder="Please describe your experience in detail..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0A1628 0%, #112240 100%)',
              color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 28px rgba(10,22,40,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}>
              {loading ? 'Submitting...' : '📨 Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
