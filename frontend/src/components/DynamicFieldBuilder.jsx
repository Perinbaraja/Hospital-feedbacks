import React, { useState } from 'react';

export default function DynamicFieldBuilder({ fields, onChange }) {
  const [input, setInput] = useState({ label: '', type: 'text', required: false });

  const addField = () => {
    if (!input.label.trim()) return;
    onChange([...fields, { _id: Date.now(), ...input }]);
    setInput({ label: '', type: 'text', required: false });
  };

  const removeField = (id) => onChange(fields.filter(f => f._id !== id));

  const selectStyle = { padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none', background: 'white' };

  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Form Fields ({fields.length})
      </label>

      <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '18px', border: '1.5px dashed var(--gray-200)', marginBottom: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <input value={input.label} onChange={e => setInput({ ...input, label: e.target.value })} placeholder="Field label..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addField())}
            style={{ flex: '1', minWidth: '160px', ...selectStyle }} onFocus={e => e.target.style.borderColor = 'var(--teal)'} onBlur={e => e.target.style.borderColor = 'var(--gray-200)'} />
          <select value={input.type} onChange={e => setInput({ ...input, type: e.target.value })} style={{ minWidth: '130px', ...selectStyle }}>
            {['text','email','tel','number','date','textarea','select','checkbox','radio'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: 'var(--gray-600)', cursor: 'pointer', padding: '0 4px' }}>
            <input type="checkbox" checked={input.required} onChange={e => setInput({ ...input, required: e.target.checked })} style={{ accentColor: 'var(--teal)' }} />
            Required
          </label>
          <button type="button" onClick={addField} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, var(--teal), var(--teal-light))', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Add Field
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Press Enter or click Add Field to add</p>
      </div>

      {fields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {fields.map((field, i) => (
            <div key={field._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', border: '1.5px solid var(--gray-100)', borderRadius: 'var(--radius)', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span style={{ width: '22px', height: '22px', background: 'var(--teal-pale)', color: 'var(--teal)', borderRadius: '50%', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)' }}>{field.label}</span>
                <span style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--gray-100)', borderRadius: '20px', color: 'var(--gray-500)' }}>{field.type}</span>
                {field.required && <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 700 }}>required</span>}
              </div>
              <button type="button" onClick={() => removeField(field._id)} style={{ padding: '5px 12px', background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
