import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DynamicFieldBuilder from '../components/DynamicFieldBuilder';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';

export default function CreateForm() {
  const [formData, setFormData] = useState({ title: '', description: '', fields: [] });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.fields.length === 0) { alert('Add at least one field.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/forms', formData);
      setSuccess(`Form created! Share link: /feedback/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create form');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px 16px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '15px', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <AdminLayout>
      <div style={{ maxWidth: '720px', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Create Feedback Form</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>Build a dynamic form and share the link with patients</p>
        </div>

        {success && (
          <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)', color: '#065F46', padding: '16px 20px', borderRadius: 'var(--radius)', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
            ✅ {success}
            <button onClick={() => navigate('/dashboard')} style={{ marginLeft: '16px', background: 'var(--green)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              Go to Dashboard
            </button>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '36px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div>
              <label style={labelStyle}>Form Title *</label>
              <input required placeholder="e.g. Patient Satisfaction Survey" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--teal)'} onBlur={e => e.target.style.borderColor = 'var(--gray-200)'} />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea placeholder="Brief description of the form..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = 'var(--teal)'} onBlur={e => e.target.style.borderColor = 'var(--gray-200)'} />
            </div>

            <DynamicFieldBuilder fields={formData.fields} onChange={fields => setFormData({ ...formData, fields })} />

            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--gray-100)' }}>
              <button type="button" onClick={() => navigate('/dashboard')}
                style={{ flex: 1, padding: '13px', background: 'var(--gray-100)', color: 'var(--gray-600)', border: 'none', borderRadius: 'var(--radius)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                style={{ flex: 2, padding: '13px', background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, var(--navy), var(--navy-mid))', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: loading ? 'none' : '0 6px 20px rgba(10,22,40,0.22)' }}>
                {loading ? <><span className="spinner" />Creating...</> : '📝 Create Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
