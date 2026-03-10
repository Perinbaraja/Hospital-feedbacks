import { useState, useEffect } from 'react';
import API from '../api';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        'Pending': 'badge badge-pending',
        'IN PROGRESS': 'badge badge-assigned',
        'COMPLETED': 'badge badge-resolved'
    };
    return <span className={statusClasses[status] || 'badge bg-gray-200'}>{status}</span>;
};

const AdminFeedback = () => {
    const { search } = window.location;
    const queryParams = new URLSearchParams(search);
    const hospitalId = queryParams.get('hospitalId');

    const [feedbacks, setFeedbacks] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [activeFeedbackId, setActiveFeedbackId] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState([]);
    const [tempCategoryDept, setTempCategoryDept] = useState('');
    const [tempReviewType, setTempReviewType] = useState('');
    const [loading, setLoading] = useState(true);

    const [filterDept, setFilterDept] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = async () => {
        try {
            const hIdParam = hospitalId ? `?hospitalId=${hospitalId}` : '';
            const [fbRes, hospRes] = await Promise.all([
                API.get(`/feedback${hIdParam}`),
                API.get(`/hospital${hIdParam}`)
            ]);
            setFeedbacks(fbRes.data);
            setHospital(hospRes.data);
        } catch (error) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const handleClickOutside = (event) => {
            if (!event.target.closest('.custom-assign-dropdown')) {
                setActiveFeedbackId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleAssign = async (id, departments, categoryUpdate) => {
        try {
            await API.put(`/feedback/${id}`, {
                assignedTo: departments,
                categoryUpdate: categoryUpdate
            });
            toast.success(`Feedback updated successfully`);
            fetchData();
        } catch (error) {
            toast.error('Error updating feedback');
        }
    };

    // Filtering Logic
    const filteredFeedbacks = feedbacks.filter(fb => {
        const cat = fb.categories?.[0] || {};
        const target = filterDept.toLowerCase().trim();
        const matchesDept = filterDept === '' ||
            fb.categories?.some(c => c.department && c.department.toLowerCase().includes(target)) ||
            (fb.assignedTo && fb.assignedTo.toLowerCase().includes(target));

        const fbDateStr = new Date(fb.createdAt).toLocaleDateString('en-CA');
        const matchesStart = startDate === '' || fbDateStr >= startDate;
        const matchesEnd = endDate === '' || fbDateStr <= endDate;

        return matchesDept && matchesStart && matchesEnd;
    });

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <div className="loader">Loading Dashboard...</div>
        </div>
    );

    return (
        <div>
            <div className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1.5rem' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="page-title text-colorful">Patient Feedback Overview</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Monitor and manage patient experiences across all departments.</p>
                    </div>
                </div>

                {/* Vibrant Filter Bar */}
                <div style={{
                    width: '100%',
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    alignItems: 'flex-end'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter by Service</label>
                        <select
                            className="form-control filter-bar-input"
                            style={{ width: '180px', height: '36px', fontSize: '0.8rem', padding: '0 0.75rem' }}
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {hospital?.departments.map(dept => (
                                <option key={dept.name} value={dept.name}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From Date</label>
                        <input
                            type="date"
                            className="form-control"
                            style={{ width: '150px', height: '36px', fontSize: '0.8rem' }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To Date</label>
                        <input
                            type="date"
                            className="form-control"
                            style={{ width: '150px', height: '36px', fontSize: '0.8rem' }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn-outline"
                        style={{ height: '36px', padding: '0 1rem', fontSize: '0.75rem', borderStyle: 'dashed' }}
                        onClick={() => {
                            setFilterDept('');
                            setStartDate('');
                            setEndDate('');
                        }}
                    >
                        🔄 Clear Filters
                    </button>

                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                            Showing <b>{filteredFeedbacks.length}</b> result{filteredFeedbacks.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No results found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Try adjusting your service category or date range filters.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>#</th>
                                <th>PATIENT</th>
                                <th>EMAIL</th>
                                <th>TYPE</th>
                                <th>HOSPITAL SERVICE</th>
                                <th>ISSUE CONTEXT</th>
                                <th style={{ width: '80px' }}>FEED</th>
                                <th style={{ width: '80px' }}>PHOTO</th>
                                <th style={{ width: '120px' }}>LOGGED ON</th>
                                <th style={{ width: '130px' }}>WORKFLOW</th>
                                <th style={{ width: '180px', textAlign: 'right' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks.map((fb, index) => {
                                const cat = fb.categories?.[0] || {};
                                const isPositive = cat.reviewType === 'Positive';
                                const actualStatus = fb.status;
                                const rowClass = actualStatus === 'IN PROGRESS' ? 'row-assigned' : actualStatus === 'Pending' ? 'row-pending' : (isPositive ? 'row-positive' : 'row-negative');

                                return (
                                    <tr key={fb._id} className={rowClass}>
                                        <td>
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: '#64748b'
                                            }}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.8rem' }}>
                                                {fb.patientName || 'Anonymous'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {fb.patientEmail || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '2rem',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                backgroundColor: isPositive ? '#f0fdf4' : '#fef2f2',
                                                color: isPositive ? '#166534' : '#991b1b',
                                                border: `1px solid ${isPositive ? '#dcfce7' : '#fee2e2'}`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.3rem'
                                            }}>
                                                {isPositive ? '✨ Positive' : '⚠️ Negative'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '0.4rem',
                                                    background: '#f8fafc',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.85rem',
                                                    border: '1px solid #f1f5f9'
                                                }}>
                                                    🏥
                                                </div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>{cat.department}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ maxWidth: '240px' }}>
                                                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.2rem', fontSize: '0.8125rem' }}>
                                                    {Array.isArray(cat.issue) ? cat.issue.join(' • ') : cat.issue}
                                                </div>
                                                {fb.comments && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#64748b',
                                                        background: '#f8fafc',
                                                        padding: '0.4rem 0.6rem',
                                                        borderRadius: '0.4rem',
                                                        border: '1px solid #f1f5f9',
                                                        marginTop: '0.35rem',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '0.4rem' }}>Note:</span>
                                                        "{fb.comments}"
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{
                                                display: 'inline-flex',
                                                flexDirection: 'column',
                                                gap: '0.15rem'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    fontWeight: 700,
                                                    fontSize: '0.8rem',
                                                    color: cat.rating === 'Completely Satisfied' ? '#16a34a' : cat.rating === 'Partially Satisfied' ? '#ca8a04' : '#dc2626'
                                                }}>
                                                    {cat.rating === 'Completely Satisfied' ? '🤩' : cat.rating === 'Partially Satisfied' ? '😐' : '😡'}
                                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{cat.rating?.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {cat.image ? (
                                                <a href={`${API_BASE_URL}${cat.image}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: 'fit-content' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <img
                                                            src={`${API_BASE_URL}${cat.image}`}
                                                            alt="attachment"
                                                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'var(--transitions)' }}
                                                            onMouseOver={e => {
                                                                e.currentTarget.style.transform = 'scale(1.1)';
                                                            }}
                                                            onMouseOut={e => {
                                                                e.currentTarget.style.transform = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                </a>
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', border: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.55rem' }}>
                                                    NONE
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                                                    {new Date(fb.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                                    {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <StatusBadge status={fb.status} />
                                        </td>
                                        <td>
                                            <div style={{ position: 'relative' }}>
                                                <div className="custom-assign-dropdown" style={{
                                                    position: 'relative',
                                                    width: '140px'
                                                }}>
                                                    <div
                                                        style={{
                                                            padding: '0.35rem 0.5rem',
                                                            fontSize: '0.725rem',
                                                            background: 'white',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '0.4rem',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            cursor: fb.status === 'COMPLETED' ? 'not-allowed' : 'pointer',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                        onClick={(e) => {
                                                            if (fb.status === 'COMPLETED') return;
                                                            const isOpening = activeFeedbackId !== fb._id;
                                                            setActiveFeedbackId(isOpening ? fb._id : null);

                                                            // Initialize: Use existing values
                                                            if (isOpening) {
                                                                const currentCat = fb.categories?.[0] || {};
                                                                setTempCategoryDept(currentCat.department || '');
                                                                setTempReviewType(currentCat.reviewType || '');
                                                                if (fb.assignedTo) {
                                                                    setSelectedAssignment(fb.assignedTo.split(', ').filter(n => n));
                                                                } else {
                                                                    setSelectedAssignment([]);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {fb.assignedTo ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.2rem' }}>
                                                                <span style={{ fontWeight: 600, color: 'var(--primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fb.assignedTo}</span>
                                                                <span style={{ fontSize: '0.55rem', opacity: 0.7, background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Edit ▼</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '100%', textAlign: 'center', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                                                <span>Assign</span>
                                                                <span style={{ fontSize: '0.6rem' }}>▼</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {activeFeedbackId === fb._id && (
                                                        <div className="dropdown-content" style={{
                                                            position: 'absolute',
                                                            top: '100%',
                                                            right: 0,
                                                            width: '260px',
                                                            background: 'white',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '0.75rem',
                                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                                            zIndex: 1000,
                                                            maxHeight: '400px',
                                                            overflowY: 'auto',
                                                            padding: '1rem',
                                                            animation: 'fadeIn 0.2s ease-out'
                                                        }}>
                                                            {/* Manual Category Selection */}
                                                            <div style={{ marginBottom: '1.25rem' }}>
                                                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Manual Feedback Categorization</div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                    <div>
                                                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Service/Department</label>
                                                                        <select
                                                                            value={tempCategoryDept}
                                                                            onChange={(e) => setTempCategoryDept(e.target.value)}
                                                                            style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0' }}
                                                                        >
                                                                            {hospital?.departments.map(d => (
                                                                                <option key={d.name} value={d.name}>{d.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>

                                                                    <div>
                                                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Review Type</label>
                                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setTempReviewType('Positive')}
                                                                                style={{
                                                                                    flex: 1, padding: '0.35rem', fontSize: '0.65rem', borderRadius: '0.4rem', cursor: 'pointer',
                                                                                    border: `1px solid ${tempReviewType === 'Positive' ? '#16a34a' : '#e2e8f0'}`,
                                                                                    background: tempReviewType === 'Positive' ? '#f0fdf4' : 'white',
                                                                                    color: tempReviewType === 'Positive' ? '#16a34a' : '#64748b',
                                                                                    fontWeight: tempReviewType === 'Positive' ? 700 : 500
                                                                                }}
                                                                            >
                                                                                ✨ Positive
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setTempReviewType('Negative')}
                                                                                style={{
                                                                                    flex: 1, padding: '0.35rem', fontSize: '0.65rem', borderRadius: '0.4rem', cursor: 'pointer',
                                                                                    border: `1px solid ${tempReviewType === 'Negative' ? '#dc2626' : '#e2e8f0'}`,
                                                                                    background: tempReviewType === 'Negative' ? '#fef2f2' : 'white',
                                                                                    color: tempReviewType === 'Negative' ? '#dc2626' : '#64748b',
                                                                                    fontWeight: tempReviewType === 'Negative' ? 700 : 500
                                                                                }}
                                                                            >
                                                                                ⚠️ Negative
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ height: '1px', background: '#f1f5f9', margin: '1rem 0' }}></div>

                                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Assign Investigation To</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                {hospital?.departments.map(dept => {
                                                                    const isChecked = selectedAssignment.includes(dept.name);
                                                                    const isPatientChoice = cat.department === dept.name;

                                                                    return (
                                                                        <label key={dept.name} style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.5rem',
                                                                            padding: '0.4rem 0.5rem',
                                                                            borderRadius: '0.4rem',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.75rem',
                                                                            transition: 'all 0.2s',
                                                                            backgroundColor: isChecked ? '#f1f5f9' : 'transparent',
                                                                        }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = isChecked ? '#f1f5f9' : 'transparent'}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => {
                                                                                    const checked = e.target.checked;
                                                                                    setSelectedAssignment(prev =>
                                                                                        checked ? [...prev, dept.name] : prev.filter(n => n !== dept.name)
                                                                                    );
                                                                                }}
                                                                            />
                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                <span style={{ fontWeight: 600, color: isChecked ? 'var(--primary-dark)' : '#475569' }}>{dept.name}</span>
                                                                                {isPatientChoice && <span style={{ fontSize: '0.55rem', color: '#16a34a', fontWeight: 'bold' }}>PATIENT CHOICE</span>}
                                                                            </div>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div style={{ marginTop: '1.25rem', padding: '0.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    className="btn-primary"
                                                                    onClick={() => {
                                                                        handleAssign(fb._id, selectedAssignment.join(', '), {
                                                                            department: tempCategoryDept,
                                                                            reviewType: tempReviewType
                                                                        });
                                                                        setActiveFeedbackId(null);
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '0.5rem',
                                                                        fontSize: '0.75rem',
                                                                        boxShadow: 'none',
                                                                        fontWeight: 700
                                                                    }}
                                                                >
                                                                    Update Workflow
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {fb.assignedTo && fb.status === 'IN PROGRESS' && (
                                                        <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--primary)', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid white', animation: 'pulse 2s infinite' }}></div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div >
            )}
        </div >
    );
};

export default AdminFeedback;
