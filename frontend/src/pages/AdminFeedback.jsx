import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API, { BASE_ASSET_URL } from '../api';
import toast from 'react-hot-toast';
import './AdminFeedback.css';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        'Pending': 'badge badge-pending',
        'IN PROGRESS': 'badge badge-assigned',
        'COMPLETED': 'badge badge-resolved'
    };
    return <span className={statusClasses[status] || 'badge bg-gray-200'}>{status}</span>;
};

const AdminFeedback = () => {
    const [searchParams] = useSearchParams();
    const hospitalId = searchParams.get('hospitalId');

    const [feedbacks, setFeedbacks] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [activeFeedbackId, setActiveFeedbackId] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState([]);
    const [tempCategoryDept, setTempCategoryDept] = useState('');
    const [tempReviewType, setTempReviewType] = useState('');
    const [tempStatus, setTempStatus] = useState('');
    const [tempIssue, setTempIssue] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedFeedbackForNotes, setSelectedFeedbackForNotes] = useState(null);
    const [newNote, setNewNote] = useState('');
    const [postingNote, setPostingNote] = useState(false);

    const [filterDept, setFilterDept] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = async (retryCount = 0) => {
        try {
            const hIdParam = hospitalId ? `?hospitalId=${hospitalId}` : '';

            // Fetch hospital and feedbacks separately for better error isolation
            const hospResponse = await API.get(`/hospital${hIdParam}`).catch(err => {
                console.warn('Hospital fetch failed:', err);
                return null;
            });

            if (hospResponse) {
                setHospital(hospResponse.data);
            }

            const fbResponse = await API.get(`/feedback${hIdParam}`);
            setFeedbacks(fbResponse.data);
            setLoading(false);
            if (selectedFeedbackForNotes) {
                const refreshed = fbResponse.data.find(f => f._id === selectedFeedbackForNotes._id);
                if (refreshed) setSelectedFeedbackForNotes(refreshed);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            if (retryCount < 2) { // Retry up to 2 times
                console.log(`Retrying fetch (${retryCount + 1})...`);
                setTimeout(() => fetchData(retryCount + 1), 1500);
            } else {
                toast.error('Failed to load dashboard data. Please check your connection.');
                setLoading(false);
            }
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

    const handleAssign = async (id, departments, categoryUpdate, statusUpdate) => {
        try {
            await API.put(`/feedback/${id}`, {
                assignedTo: departments,
                categoryUpdate: categoryUpdate,
                status: statusUpdate
            });
            toast.success(`Feedback rectified successfully`);
            fetchData();
        } catch (error) {
            toast.error('Error updating feedback');
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setPostingNote(true);
        try {
            await API.post(`/feedback/${selectedFeedbackForNotes._id}/notes`, { text: newNote });
            toast.success('Internal note added');
            setNewNote('');
            fetchData();
        } catch (error) {
            toast.error('Failed to add note');
        } finally {
            setPostingNote(false);
        }
    };



    // Filtering Logic
    const filteredFeedbacks = feedbacks.filter(fb => {
        const cat = fb.categories?.[0] || {};
        const target = filterDept.toLowerCase().trim();
        const matchesDept = filterDept === '' ||
            fb.categories?.some(c => c.department && c.department.toLowerCase().includes(target)) ||
            (fb.assignedTo && fb.assignedTo.toLowerCase().includes(target));

        // Match local date parts to YYYY-MM-DD for accurate local filtering
        const fbDate = new Date(fb.createdAt);
        let fbDateStr = '';
        if (!isNaN(fbDate)) {
            const y = fbDate.getFullYear();
            const m = String(fbDate.getMonth() + 1).padStart(2, '0');
            const d = String(fbDate.getDate()).padStart(2, '0');
            fbDateStr = `${y}-${m}-${d}`;
        }

        const matchesStart = startDate === '' || fbDateStr >= startDate;
        const matchesEnd = endDate === '' || fbDateStr <= endDate;

        return matchesDept && matchesStart && matchesEnd;
    });

    return (
        <div>
            <div className="page-header admin-feedback-header">
                <div className="header-top-row">
                    <div>
                        <h2 className="page-title text-colorful">Patient Feedback Overview</h2>
                        <p className="header-subtitle">Monitor and manage patient experiences across all departments.</p>
                    </div>
                </div>

                {/* Vibrant Filter Bar */}
                <div className="filter-bar-vibrant">
                    <div className="filter-group">
                        <label className="filter-label">Filter by Service</label>
                        <select
                            className="form-control filter-bar-input filter-input-select"
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {hospital?.departments?.map(dept => (
                                <option key={dept.name} value={dept.name}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">From Date</label>
                        <input
                            type="date"
                            className="form-control filter-input-date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">To Date</label>
                        <input
                            type="date"
                            className="form-control filter-input-date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn-outline clear-filters-btn"
                        onClick={() => {
                            setFilterDept('');
                            setStartDate('');
                            setEndDate('');
                        }}
                    >
                        🔄 Clear Filters
                    </button>

                    <div className="results-count">
                        <span>
                            Showing <b>{filteredFeedbacks.length}</b> result{filteredFeedbacks.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>


            {/* Data Display Section */}
            <div style={{ position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(255,255,255,0.9)', padding: '8px 16px',
                        borderRadius: '2rem', boxShadow: 'var(--shadow-md)', zIndex: 20
                    }}>
                        <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>Syncing...</span>
                    </div>
                )}

                {filteredFeedbacks.length === 0 && !loading ? (
                    <div className="card empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h3 className="empty-state-title">No results found</h3>
                        <p className="empty-state-text">Try adjusting your service category or date range filters.</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>#</th>
                                    <th style={{ minWidth: '120px' }}>PATIENT</th>
                                    <th style={{ minWidth: '150px' }}>EMAIL</th>
                                    <th style={{ width: '100px' }}>TYPE</th>
                                    <th style={{ minWidth: '160px' }}>HOSPITAL SERVICE</th>
                                    <th style={{ minWidth: '200px' }}>ISSUE CONTEXT</th>
                                    <th style={{ width: '80px' }}>FEED</th>
                                    <th style={{ width: '80px' }}>PHOTO</th>
                                    <th style={{ width: '120px' }}>LOGGED ON</th>
                                    <th style={{ width: '110px' }}>NOTES</th>
                                    <th style={{ width: '130px' }}>WORKFLOW</th>
                                    <th style={{ width: '180px', textAlign: 'right' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFeedbacks.map((fb, index) => {
                                    const cat = fb.categories?.[0] || {};
                                    const isPositive = cat.reviewType === 'Positive';
                                    const actualStatus = fb.status;
                                    const isOverdue = fb.isOverdue; // From backend virtual

                                    let rowClass = actualStatus === 'IN PROGRESS' ? 'row-assigned' : actualStatus === 'Pending' ? 'row-pending' : (isPositive ? 'row-positive' : 'row-negative');
                                    if (isOverdue) rowClass += ' row-overdue';

                                    return (
                                        <tr key={fb._id} className={rowClass}>
                                            <td>
                                                <div className="index-circle-container">
                                                    {index + 1}
                                                    {isOverdue && <span title="SLA Breached (>48h)" style={{ position: 'absolute', top: '-5px', right: '-5px', fontSize: '10px' }}>🚨</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="patient-name-cell">
                                                    {fb.patientName || 'Anonymous'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="patient-email-cell">
                                                    {fb.patientEmail || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`type-badge-container ${isPositive ? 'positive-badge' : 'negative-badge'}`}>
                                                    {isPositive ? '✨ Positive' : '⚠️ Negative'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="hospital-service-cell">
                                                    <div className="service-icon">
                                                        🏥
                                                    </div>
                                                    <div className="service-name">{cat.department}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="issue-context-container">
                                                    <div className="issue-title">
                                                        {Array.isArray(cat.issue) ? cat.issue.join(' • ') : cat.issue}
                                                    </div>
                                                    {fb.comments && (
                                                        <div className="issue-note">
                                                            <span className="note-label">Note:</span>
                                                            "{fb.comments}"
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="rating-display">
                                                    <div className="rating-content" style={{ color: cat.rating === 'Completely Satisfied' ? '#16a34a' : cat.rating === 'Partially Satisfied' ? '#ca8a04' : '#dc2626' }}>
                                                        {cat.rating === 'Completely Satisfied' ? '🤩' : cat.rating === 'Partially Satisfied' ? '😐' : '😡'}
                                                        <span className="rating-label">{cat.rating?.split(' ')[0]}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {cat.image ? (
                                                    <a href={`${BASE_ASSET_URL}${cat.image}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: 'fit-content' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <img
                                                                src={`${BASE_ASSET_URL}${cat.image}`}
                                                                alt="attachment"
                                                                className="attachment-preview"
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
                                                    <div className="no-attachment">
                                                        NONE
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="date-logged-cell">
                                                    <div className="date-text">
                                                        {new Date(fb.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="time-text">
                                                        {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-outline"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                                    onClick={() => setSelectedFeedbackForNotes(fb)}
                                                >
                                                    💬 {fb.notes?.length || 0}
                                                </button>
                                            </td>
                                            <td>
                                                <StatusBadge status={fb.status} />
                                            </td>
                                            <td>
                                                <div style={{ position: 'relative' }}>
                                                    <div className="custom-assign-dropdown">
                                                        <div
                                                            className="dropdown-trigger"
                                                            onClick={(e) => {
                                                                const isOpening = activeFeedbackId !== fb._id;
                                                                setActiveFeedbackId(isOpening ? fb._id : null);

                                                                // Initialize: Use existing values
                                                                if (isOpening) {
                                                                    const currentCat = fb.categories?.[0] || {};
                                                                    setTempCategoryDept(currentCat.department || '');
                                                                    setTempReviewType(currentCat.reviewType || '');
                                                                    setTempStatus(fb.status);
                                                                    setTempIssue(Array.isArray(currentCat.issue) ? currentCat.issue.join(', ') : (currentCat.issue || ''));
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
                                                                    <span className="assigned-text">{fb.assignedTo}</span>
                                                                    <span className="edit-hint">Edit ▼</span>
                                                                </div>
                                                            ) : (
                                                                <div className="assign-placeholder">
                                                                    <span>Assign</span>
                                                                    <span style={{ fontSize: '0.6rem' }}>▼</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {activeFeedbackId === fb._id && (
                                                            <div className="dropdown-content">


                                                                <div className="dropdown-section-title">Assign Investigation To</div>
                                                                <div className="dept-list">
                                                                    {hospital?.departments.map(dept => {
                                                                        const isChecked = selectedAssignment.includes(dept.name);
                                                                        const isPatientChoice = cat.department === dept.name;

                                                                        return (
                                                                            <label key={dept.name} className={`dept-item ${isChecked ? 'selected' : ''}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        const checked = e.target.checked;
                                                                                        const nextAssignment = checked
                                                                                            ? [...selectedAssignment, dept.name]
                                                                                            : selectedAssignment.filter(n => n !== dept.name);

                                                                                        setSelectedAssignment(nextAssignment);

                                                                                        // Auto-update status based on assignment (unless manually completed)
                                                                                        if (tempStatus !== 'COMPLETED') {
                                                                                            setTempStatus(nextAssignment.length > 0 ? 'IN PROGRESS' : 'Pending');
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                    <span className={`dept-item-name ${isChecked ? 'selected' : 'default'}`}>{dept.name}</span>
                                                                                    {isPatientChoice && <span className="patient-choice-tag">PATIENT CHOICE</span>}
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div className="dropdown-footer">
                                                                    <button
                                                                        className="btn-primary update-btn"
                                                                        onClick={() => {
                                                                            handleAssign(fb._id, selectedAssignment.join(', '), {
                                                                                department: tempCategoryDept,
                                                                                reviewType: tempReviewType,
                                                                                issue: tempIssue
                                                                            }, tempStatus);
                                                                            setActiveFeedbackId(null);
                                                                        }}
                                                                    >
                                                                        Update Workflow
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {fb.assignedTo && fb.status === 'IN PROGRESS' && (
                                                            <div className="indicator-dot"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Internal Notes Side-Panel */}
            {selectedFeedbackForNotes && (
                <div style={{
                    position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
                    background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
                    zIndex: 1000, padding: '2rem', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem' }}>Internal Staff Notes</h3>
                        <button className="btn-outline" style={{ border: 'none', padding: '8px' }} onClick={() => setSelectedFeedbackForNotes(null)}>✕</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {selectedFeedbackForNotes.notes && selectedFeedbackForNotes.notes.length > 0 ? (
                            selectedFeedbackForNotes.notes.map((note, i) => (
                                <div key={i} style={{
                                    padding: '1rem', background: note.senderRole === 'Admin' ? '#f0f9ff' : '#f8fafc',
                                    borderRadius: '0.75rem', border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                                        <b style={{ color: 'var(--primary-dark)' }}>{note.senderName} ({note.senderRole})</b>
                                        <span style={{ color: '#94a3b8' }}>{new Date(note.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>{note.text}</p>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                                <p>No internal notes yet.</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleAddNote} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                        <textarea
                            className="form-control"
                            placeholder="Type an internal note..."
                            style={{ height: '100px', marginBottom: '1rem', resize: 'none' }}
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={postingNote}>
                            {postingNote ? 'Saving...' : 'Add Note'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminFeedback;
