import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';

const DEPARTMENTS = ['','Emergency','Cardiology','Neurology','Orthopedics','Pediatrics','Oncology','Radiology','General Surgery','Outpatient','Pharmacy','Nursing','Administration'];
const STATUSES   = ['','Pending','In Review','Resolved'];
const TYPES      = ['','Compliment','Complaint','Suggestion','General'];

const typeColors = { Compliment: '#10B981', Complaint: '#EF4444', Suggestion: '#F59E0B', General: '#6B7280' };
const typeBg    = { Compliment: '#D1FAE5', Complaint: '#FEE2E2', Suggestion: '#FEF3C7', General: '#F3F4F6' };

function Modal({ fb, onClose, onUpdate }) {
  const [status, setStatus] = useState(fb.status);
  const [notes, setNotes] = useState(fb.adminNotes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/feedback/${fb._id}/status`, { status, adminNotes: notes });
      onUpdate(res.data.data);
      onClose();
    } catch (e) { alert('Update failed'); }
    finally { setSaving(false); }
  };

  const Row = ({ label, value }) => (
    <div style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: 'var(--gray-700)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '36px', width: '100%', maxWidth: '600px', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginBottom: '4px' }}>Feedback Details</h2>
            <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>ID: {fb._id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-500)' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <Row label="Patient" value={fb.patientName} />
          <Row label="Email" value={fb.patientEmail} />
          <Row label="Phone" value={fb.patientPhone} />
          <Row label="Department" value={fb.department} />
          <Row label="Visit Date" value={fb.visitDate ? new Date(fb.visitDate).toLocaleDateString('en-IN') : null} />
          <Row label="Submitted" value={new Date(fb.createdAt).toLocaleDateString('en-IN')} />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Type</div>
            <span style={{ fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: typeBg[fb.feedbackType], color: typeColors[fb.feedbackType] }}>{fb.feedbackType}</span>
          </div>
          <div style={{ flex: 1, padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Rating</div>
            <span style={{ fontSize: '18px' }}>{'⭐'.repeat(fb.rating)}</span>
          </div>
        </div>

        <div style={{ marginBottom: '22px', padding: '14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Message</div>
          <p style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: 1.7 }}>{fb.message}</p>
        </div>

        <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Actions</h3>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none' }}>
                {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Add internal notes about this feedback..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'var(--gray-100)', border: 'none', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: 'var(--gray-600)' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? 'var(--gray-300)' : 'linear-gradient(135deg, var(--navy), var(--navy-mid))', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {saving ? <><span className="spinner" />Saving...</> : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackList() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ department: '', status: '', feedbackType: '', search: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10, ...filters });
      Object.keys(filters).forEach(k => { if (!filters[k]) params.delete(k); });
      const res = await api.get(`/feedback?${params}`);
      setFeedbacks(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const updateFeedback = (updated) => {
    setFeedbacks(list => list.map(f => f._id === updated._id ? updated : f));
  };

  const selectStyle = { padding: '9px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '13px', outline: 'none', background: 'white', color: 'var(--gray-700)' };

  return (
    <AdminLayout>
      <div style={{ animation: 'fadeUp 0.5s ease' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>All Feedbacks</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>{pagination.total} total submissions</p>
        </div>

        {/* Filters */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="🔍 Search name, email, message..." style={{ ...selectStyle, flex: '1', minWidth: '200px' }} />
          <select value={filters.department} onChange={e => setFilter('department', e.target.value)} style={selectStyle}>
            <option value="">All Departments</option>
            {DEPARTMENTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.feedbackType} onChange={e => setFilter('feedbackType', e.target.value)} style={selectStyle}>
            <option value="">All Types</option>
            {TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(filters.department || filters.status || filters.feedbackType || filters.search) && (
            <button onClick={() => { setFilters({ department:'', status:'', feedbackType:'', search:'' }); setPage(1); }} style={{ padding: '9px 14px', background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span className="spinner" style={{ borderColor: 'rgba(13,148,136,0.3)', borderTopColor: 'var(--teal)' }} /> Loading...
            </div>
          ) : feedbacks.length === 0 ? (
            <div style={{ padding: '70px', textAlign: 'center', color: 'var(--gray-300)' }}>
              <div style={{ fontSize: '52px', marginBottom: '14px' }}>🔍</div>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>No feedbacks found</p>
              <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '6px' }}>Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-100)' }}>
                      {['Patient', 'Department', 'Type', 'Rating', 'Status', 'Date', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map((fb, i) => (
                      <tr key={fb._id} style={{ borderBottom: '1px solid var(--gray-50)', background: i % 2 === 0 ? 'white' : '#FAFBFC', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,148,136,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFBFC'}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)' }}>{fb.patientName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{fb.patientEmail}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{fb.department}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, background: typeBg[fb.feedbackType] || 'var(--gray-100)', color: typeColors[fb.feedbackType] || 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                            {fb.feedbackType}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '15px' }}>{'⭐'.repeat(fb.rating)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, whiteSpace: 'nowrap', background: fb.status === 'Resolved' ? 'var(--green-light)' : fb.status === 'In Review' ? 'var(--blue-light)' : 'var(--amber-light)', color: fb.status === 'Resolved' ? 'var(--green)' : fb.status === 'In Review' ? 'var(--blue)' : 'var(--amber)' }}>
                            {fb.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{new Date(fb.createdAt).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={() => setSelected(fb)} style={{ padding: '7px 14px', background: 'var(--gray-100)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
                    Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, pagination.total)} of {pagination.total}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      style={{ padding: '7px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', color: page === 1 ? 'var(--gray-300)' : 'var(--gray-700)', fontWeight: 600 }}>
                      ← Prev
                    </button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '7px 4px', color: 'var(--gray-400)', fontSize: '13px' }}>…</span>}
                        <button onClick={() => setPage(p)}
                          style={{ padding: '7px 12px', border: '1.5px solid', borderColor: p === page ? 'var(--teal)' : 'var(--gray-200)', borderRadius: 'var(--radius-sm)', background: p === page ? 'var(--teal)' : 'white', color: p === page ? 'white' : 'var(--gray-700)', cursor: 'pointer', fontSize: '13px', fontWeight: p === page ? 700 : 400 }}>
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                    <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                      style={{ padding: '7px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', background: 'white', cursor: page === pagination.pages ? 'not-allowed' : 'pointer', fontSize: '13px', color: page === pagination.pages ? 'var(--gray-300)' : 'var(--gray-700)', fontWeight: 600 }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selected && <Modal fb={selected} onClose={() => setSelected(null)} onUpdate={updateFeedback} />}
    </AdminLayout>
  );
}
