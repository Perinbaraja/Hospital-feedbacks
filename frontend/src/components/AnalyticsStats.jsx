import React from 'react';

const AnalyticsStats = ({ feedbacks }) => {
    const total = feedbacks.length;
    if (total === 0) return null;

    // NPS calculation: %Promoters (Completely) - %Detractors (Not)
    const promoters = feedbacks.filter(f => f.categories?.[0]?.rating === 'Completely Satisfied').length;
    const detractors = feedbacks.filter(f => f.categories?.[0]?.rating === 'Not Satisfied').length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    const pending = feedbacks.filter(f => f.status === 'Pending').length;
    const completed = feedbacks.filter(f => f.status === 'COMPLETED').length;
    const inProgress = total - pending - completed;

    // Top department by negative feedback
    const deptComplaints = {};
    feedbacks.forEach(f => {
        const cat = f.categories?.[0];
        if (cat?.reviewType === 'Negative' && cat.department) {
            deptComplaints[cat.department] = (deptComplaints[cat.department] || 0) + 1;
        }
    });

    const topDept = Object.entries(deptComplaints).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem', marginBottom: '2rem'
        }}>
            <StatCard title="Total Responses" value={total} color="#4f46e5" icon="📑" />
            <StatCard title="NPS Score" value={nps} subText={`${promoters} Promoters`} color={nps >= 0 ? '#10b981' : '#ef4444'} icon="📈" />
            <StatCard title="Active Issues" value={pending + inProgress} subText={`${pending} Unassigned`} color="#f59e0b" icon="⏳" />
            <StatCard title="Focus Area" value={topDept} subText="Most complaints" color="#ef4444" icon="🎯" />
        </div>
    );
};

const StatCard = ({ title, value, subText, color, icon }) => (
    <div className="card" style={{
        padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem',
        borderLeft: `4px solid ${color}`, transition: 'transform 0.2s'
    }}>
        <div style={{
            fontSize: '2rem', background: `${color}15`, width: '50px', height: '50px',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{value}</div>
            {subText && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{subText}</div>}
        </div>
    </div>
);

export default AnalyticsStats;
