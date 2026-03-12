import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';

const typeColors = { Compliment: '#10B981', Complaint: '#EF4444', Suggestion: '#F59E0B', General: '#6B7280' };
const typeBg    = { Compliment: '#D1FAE5', Complaint: '#FEE2E2', Suggestion: '#FEF3C7', General: '#F3F4F6' };

function StatCard({ icon, label, value, color, bg, trend }) {
  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '16px', transition: 'box-shadow 0.2s' }}>
      <div style={{ width: '54px', height: '54px', background: bg, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '4px', fontWeight: 500 }}>{label}</div>
      </div>
      {trend && <div style={{ fontSize: '12px', fontWeight: 600, color, background: bg, padding: '4px 10px', borderRadius: '20px' }}>{trend}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/feedback/stats')
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ratingBar = (count, total) => (
    <div style={{ flex: 1, height: '8px', background: 'var(--gray-100)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--gold), var(--gold-light))', borderRadius: '4px', width: total ? `${(count / total) * 100}%` : '0%', transition: 'width 0.8s ease' }} />
    </div>
  );

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '12px', color: 'var(--teal)', fontSize: '16px' }}>
        <span className="spinner" style={{ borderColor: 'rgba(13,148,136,0.3)', borderTopColor: 'var(--teal)' }} /> Loading dashboard...
      </div>
    </AdminLayout>
  );

  if (!stats) return <AdminLayout><p style={{ color: 'var(--red)', padding: '40px' }}>Failed to load data.</p></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ animation: 'fadeUp 0.5s ease' }}>
        {/* Page title */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>Dashboard</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '15px' }}>Overview of all patient feedback submissions</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '28px' }}>
          <StatCard icon="💬" label="Total Feedbacks" value={stats.total} color="var(--teal)" bg="rgba(13,148,136,0.1)" />
          <StatCard icon="⏳" label="Pending" value={stats.pending} color="var(--amber)" bg="var(--amber-light)" />
          <StatCard icon="🔍" label="In Review" value={stats.inReview} color="var(--blue)" bg="var(--blue-light)" />
          <StatCard icon="✅" label="Resolved" value={stats.resolved} color="var(--green)" bg="var(--green-light)" />
          <StatCard icon="⭐" label="Avg Rating" value={`${stats.avgRating}/5`} color="var(--gold)" bg="rgba(212,168,83,0.12)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '22px', marginBottom: '22px' }}>
          {/* Department breakdown */}
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--navy)', marginBottom: '22px' }}>Feedback by Department</h3>
            {stats.byDepartment.length === 0
              ? <p style={{ color: 'var(--gray-400)', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>No data yet</p>
              : stats.byDepartment.map(d => (
                <div key={d._id} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>{d._id}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{d.count} · {d.avgRating?.toFixed(1)}★</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {ratingBar(d.count, stats.total)}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal)', minWidth: '36px', textAlign: 'right' }}>{stats.total ? Math.round((d.count / stats.total) * 100) : 0}%</span>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Feedback types */}
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--navy)', marginBottom: '22px' }}>By Type</h3>
            {stats.byType.length === 0
              ? <p style={{ color: 'var(--gray-400)', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>No data yet</p>
              : stats.byType.map(t => (
                <div key={t._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: '8px', background: typeBg[t._id] || 'var(--gray-50)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: typeColors[t._id] || 'var(--gray-400)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)' }}>{t._id}</span>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: typeColors[t._id] || 'var(--gray-500)' }}>{t.count}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent feedbacks */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--navy)' }}>Recent Submissions</h3>
            <a href="/feedbacks" style={{ fontSize: '13px', color: 'var(--teal)', fontWeight: 600 }}>View all →</a>
          </div>

          {stats.recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--gray-300)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <p style={{ fontSize: '15px' }}>No feedbacks yet</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--gray-100)' }}>
                    {['Patient', 'Department', 'Type', 'Rating', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map(fb => (
                    <tr key={fb._id} style={{ borderBottom: '1px solid var(--gray-50)' }}>
                      <td style={{ padding: '13px 12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)' }}>{fb.patientName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{fb.patientEmail}</div>
                      </td>
                      <td style={{ padding: '13px 12px', fontSize: '13px', color: 'var(--gray-600)' }}>{fb.department}</td>
                      <td style={{ padding: '13px 12px' }}>
                        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: typeBg[fb.feedbackType] || 'var(--gray-100)', color: typeColors[fb.feedbackType] || 'var(--gray-500)' }}>{fb.feedbackType}</span>
                      </td>
                      <td style={{ padding: '13px 12px', fontSize: '14px' }}>{'⭐'.repeat(fb.rating)}</td>
                      <td style={{ padding: '13px 12px' }}>
                        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: fb.status === 'Resolved' ? 'var(--green-light)' : fb.status === 'In Review' ? 'var(--blue-light)' : 'var(--amber-light)', color: fb.status === 'Resolved' ? 'var(--green)' : fb.status === 'In Review' ? 'var(--blue)' : 'var(--amber)' }}>
                          {fb.status}
                        </span>
                      </td>
                      <td style={{ padding: '13px 12px', fontSize: '13px', color: 'var(--gray-400)' }}>{new Date(fb.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
