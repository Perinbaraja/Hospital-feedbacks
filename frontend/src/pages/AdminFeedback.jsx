import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import API, { BASE_ASSET_URL, getAssetUrl } from '../api';
import toast from 'react-hot-toast';
import './AdminFeedback.css';
import { getHospitalConfig } from '../services/hospitalConfig';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../context/AuthContext';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        'Pending': 'badge badge-pending',
        'IN PROGRESS': 'badge badge-assigned',
        'COMPLETED': 'badge badge-resolved'
    };
    return <span className={statusClasses[status] || 'badge bg-gray-200'}>{status}</span>;
};

const AdminFeedback = () => {
    const isMobile = useIsMobile(768);
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const queryHospitalId = searchParams.get('hospitalId');
    const hospitalId = queryHospitalId || user?.hospitalId || user?.hospital?._id || '';

    const [feedbacks, setFeedbacks] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [activeFeedbackId, setActiveFeedbackId] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState([]);
    const [tempCategoryDept, setTempCategoryDept] = useState('');
    const [tempReviewType, setTempReviewType] = useState('');
    const [tempStatus, setTempStatus] = useState('');
    const [tempIssue, setTempIssue] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedFeedbackForNotes, setSelectedFeedbackForNotes] = useState(null);
    const [newNote, setNewNote] = useState('');
    const [postingNote, setPostingNote] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const isMountedRef = useRef(true);

    const [filterDept, setFilterDept] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const fetchData = useCallback(async (retryCount = 0) => {
        try {
            setLoading(true);
            const hospResponse = await getHospitalConfig(hospitalId ? { hospitalId } : {}).catch(err => {
                console.warn('Hospital fetch failed:', err);
                return null;
            });

            if (!isMountedRef.current) return;
            if (hospResponse) {
                setHospital(hospResponse);
            }

            const fbResponse = await API.get('/feedback', {
                params: {
                    ...(hospitalId ? { hospitalId } : {}),
                    ...(filterDept ? { department: filterDept } : {}),
                    ...(startDate ? { dateFrom: startDate } : {}),
                    ...(endDate ? { dateTo: endDate } : {}),
                    page: currentPage,
                    limit: ITEMS_PER_PAGE
                }
            });
            if (!isMountedRef.current) return;

            setFeedbacks(fbResponse.data.items || []);
            setTotalResults(fbResponse.data.pagination?.total || 0);
            setPageCount(fbResponse.data.pagination?.totalPages || 1);
            setLoading(false);
            setLastUpdated(new Date());
        } catch (error) {
            if (!isMountedRef.current) return;
            console.error('Fetch error:', error);
            if (retryCount < 2) { // Retry up to 2 times
                setTimeout(() => {
                    if (isMountedRef.current) fetchData(retryCount + 1);
                }, 1500);
            } else {
                toast.error('Failed to load dashboard data. Please check your connection.');
                setLoading(false);
            }
        }
    }, [hospitalId, filterDept, startDate, endDate, currentPage]);

    // Refresh side-panel data when feedbacks change
    useEffect(() => {
        if (selectedFeedbackForNotes && feedbacks.length > 0) {
            const refreshed = feedbacks.find(f => f._id === selectedFeedbackForNotes._id);
            if (refreshed && JSON.stringify(refreshed.notes) !== JSON.stringify(selectedFeedbackForNotes.notes)) {
                setSelectedFeedbackForNotes(refreshed);
            }
        }
    }, [feedbacks, selectedFeedbackForNotes]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchData();
        const intervalId = setInterval(fetchData, 60000);

        const handleClickOutside = (event) => {
            if (!event.target.closest('.custom-assign-dropdown')) {
                setActiveFeedbackId(null);
            }
        };

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setSelectedFeedbackForNotes(null);
                setActiveFeedbackId(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            isMountedRef.current = false;
            clearInterval(intervalId);
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [fetchData]);

    const handleAssign = async (id, departments, categoryUpdate, statusUpdate) => {
        try {
            await API.put(`/feedback/${id}`, {
                assignedTo: departments,
                categoryUpdate: categoryUpdate,
                status: statusUpdate
            });
            toast.success(`Feedback rectified successfully`);
            fetchData();
        } catch {
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
        } catch {
            toast.error('Failed to add note');
        } finally {
            setPostingNote(false);
        }
    };



    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this feedback?')) return;
        
        try {
            await API.delete(`/feedback/${id}`);
            toast.success('Feedback deleted successfully');
            if (paginatedFeedbacks.length === 1 && safeCurrentPage > 1) {
                setCurrentPage((prev) => prev - 1);
            } else {
                fetchData();
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete feedback');
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [filterDept, startDate, endDate]);

    const safeCurrentPage = Math.min(currentPage, pageCount);
    const paginatedFeedbacks = feedbacks;

    // Helper to split tags for display (Backward compatible: supports ; and ,)
    const splitTags = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(t => t && String(t).trim() !== '');
        // Split by semicolon OR comma
        return val.split(/[;,]/).map(t => t.trim()).filter(t => t);
    };

    return (
        <div>
            <div className="page-header admin-feedback-header">
                <div className="header-top-row">
                    <div className="feedback-header-copy">
                        <h2 className="page-title text-colorful">Patient Feedback Overview</h2>
                        <p className="header-subtitle">Monitor and manage patient experiences across all departments.</p>
                    </div>
                    {lastUpdated && (
                        <div className="last-sync-box">
                            <span className="last-sync-label">Last sync</span>
                            <span className="last-sync-time">{new Date(lastUpdated).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            })}</span>
                        </div>
                    )}
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
                        <span className="results-count-pill">
                            Showing <b>{paginatedFeedbacks.length}</b> of <b>{totalResults}</b> result{totalResults !== 1 ? 's' : ''}
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

                {paginatedFeedbacks.length === 0 && !loading ? (
                    <div className="card empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h3 className="empty-state-title">No results found</h3>
                        <p className="empty-state-text">Try adjusting your service category or date range filters.</p>
                    </div>
                ) : isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        {paginatedFeedbacks.map((fb, index) => {
                            const cat = fb.categories?.[0] || {};
                            const reviewType = (cat.reviewType || '').toLowerCase();
                            const isPositive = ['positive', 'completely_satisfied', 'completely satisfied'].includes(reviewType);
                            const isNegative = ['negative', 'needs work', 'needs_work', 'not_satisfied', 'not satisfied'].includes(reviewType);
                            const positiveTags = [
                                ...splitTags(cat.positive_feedback),
                                ...splitTags(cat.positive_issues),
                                ...(isPositive ? splitTags(cat.issue) : [])
                            ];
                            const negativeTags = [
                                ...splitTags(cat.negative_feedback),
                                ...splitTags(cat.negative_issues),
                                ...(isNegative ? splitTags(cat.issue) : [])
                            ];
                            const uniquePositiveTags = [...new Set(positiveTags)];
                            const uniqueNegativeTags = [...new Set(negativeTags)];

                            return (
                                <div
                                    key={fb._id}
                                    className="card"
                                    style={{
                                        padding: '1rem',
                                        overflow: 'visible',
                                        borderLeft: fb.status === 'COMPLETED'
                                            ? '4px solid #10b981'
                                            : fb.status === 'IN PROGRESS'
                                                ? '4px solid #845ef7'
                                                : '4px solid #e2e8f0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                                                #{(safeCurrentPage - 1) * ITEMS_PER_PAGE + index + 1} • {fb.feedbackId || 'Generating...'}
                                            </div>
                                            <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                                                {fb.patientName || 'Anonymous'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', wordBreak: 'break-word' }}>
                                                {fb.patientEmail || 'N/A'}
                                            </div>
                                        </div>
                                        <StatusBadge status={fb.status} />
                                    </div>

                                    <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.9rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                                            <strong>Service:</strong> {cat.department || 'N/A'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                                            <strong>Feedback:</strong>{' '}
                                            <span style={{
                                                fontWeight: 800,
                                                color:
                                                    (cat.feedback === 'completely_satisfied' || cat.rating === 'Completely Satisfied') ? '#16a34a'
                                                        : (cat.feedback === 'partially_satisfied' || cat.rating === 'Partially Satisfied') ? '#ca8a04'
                                                            : (cat.feedback === 'not_satisfied' || cat.rating === 'Not Satisfied') ? '#dc2626'
                                                                : '#334155'
                                            }}>
                                                {(cat.feedback || cat.rating || 'N/A').toString().replaceAll('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                                            <strong>Logged:</strong> {new Date(fb.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {fb.comments && (
                                            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                                                <strong style={{ color: '#334155' }}>Comments:</strong> {fb.comments}
                                            </div>
                                        )}
                                        {uniquePositiveTags.length > 0 && (
                                            <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                                                <strong>Positive:</strong> {uniquePositiveTags.join(', ')}
                                            </div>
                                        )}
                                        {uniqueNegativeTags.length > 0 && (
                                            <div style={{ fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.5 }}>
                                                <strong>Negative:</strong> {uniqueNegativeTags.join(', ')}
                                            </div>
                                        )}
                                        {fb.assignedTo && (
                                            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                                                <strong>Assigned:</strong> {fb.assignedTo}
                                            </div>
                                        )}
                                    </div>

                                    {cat.image ? (
                                        <div style={{ marginTop: '0.9rem' }}>
                                            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '0.45rem' }}>
                                                Photo Preview
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedImage(getAssetUrl(cat.image))}
                                                style={{
                                                    width: '100%',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '1rem',
                                                    background: '#f8fafc',
                                                    padding: '0.45rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <img
                                                    src={getAssetUrl(cat.image)}
                                                    alt="Feedback attachment preview"
                                                    style={{
                                                        width: '100%',
                                                        maxHeight: '180px',
                                                        objectFit: 'cover',
                                                        borderRadius: '0.8rem',
                                                        display: 'block'
                                                    }}
                                                />
                                            </button>
                                        </div>
                                    ) : null}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                                        {cat.image ? (
                                            <button
                                                type="button"
                                                className="btn-outline"
                                                style={{ width: 'auto', padding: '0.45rem 0.7rem' }}
                                                onClick={() => setSelectedImage(getAssetUrl(cat.image))}
                                            >
                                                Open Photo
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className="btn-outline"
                                            style={{ width: 'auto', padding: '0.45rem 0.7rem' }}
                                            onClick={() => setSelectedFeedbackForNotes(prev => (prev?._id === fb._id ? null : fb))}
                                        >
                                            Notes: {fb.notes?.length || 0}
                                        </button>
                                    </div>

                                    <div style={{ marginTop: '0.9rem' }}>
                                        <div className="custom-assign-dropdown" style={{ position: 'relative' }}>
                                            <div
                                                className="dropdown-trigger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const isOpening = activeFeedbackId !== fb._id;
                                                    setActiveFeedbackId(isOpening ? fb._id : null);

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
                                                        <span className="edit-hint">Edit</span>
                                                    </div>
                                                ) : (
                                                    <div className="assign-placeholder">
                                                        <span>Assign</span>
                                                        <span style={{ fontSize: '0.6rem' }}>â–¼</span>
                                                    </div>
                                                )}
                                            </div>
                                            {activeFeedbackId === fb._id && (
                                                <div className="dropdown-content">
                                                    <div className="dropdown-section-title">Assign Investigation To</div>
                                                    <div className="dept-list">
                                                        {hospital?.departments.map(dept => {
                                                            const isChecked = selectedAssignment.includes(dept.name);
                                                            const currentCat = fb.categories?.[0] || {};
                                                            const isPatientChoice = currentCat.department === dept.name;

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

                                                    <div className="dropdown-section-title">Adjust Classification</div>
                                                    <div className="adjust-classification">
                                                        <div className="form-group-sm">
                                                            <label>Department</label>
                                                            <select
                                                                className="form-control-sm"
                                                                value={tempCategoryDept}
                                                                onChange={(e) => setTempCategoryDept(e.target.value)}
                                                            >
                                                                {hospital?.departments.map(d => (
                                                                    <option key={d.name} value={d.name}>{d.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="form-group-sm">
                                                            <label>Feedback Type</label>
                                                            <select
                                                                className="form-control-sm"
                                                                value={tempReviewType}
                                                                onChange={(e) => setTempReviewType(e.target.value)}
                                                            >
                                                                <option value="Positive">POSITIVE</option>
                                                                <option value="negative">NEGATIVE</option>
                                                            </select>
                                                        </div>
                                                        <div className="form-group-sm">
                                                            <label>Detailed Issue</label>
                                                            <input
                                                                type="text"
                                                                className="form-control-sm"
                                                                value={tempIssue}
                                                                onChange={(e) => setTempIssue(e.target.value)}
                                                                placeholder="e.g. Long Wait"
                                                            />
                                                        </div>
                                                        <div className="form-group-sm">
                                                            <label>Workflow Status</label>
                                                            <select
                                                                className="form-control-sm"
                                                                value={tempStatus}
                                                                onChange={(e) => setTempStatus(e.target.value)}
                                                            >
                                                                <option value="Pending">Pending</option>
                                                                <option value="IN PROGRESS">In Progress</option>
                                                                <option value="COMPLETED">Completed/Resolved</option>
                                                            </select>
                                                        </div>
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
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '0.9rem' }}>
                                        <button
                                            className="btn-outline"
                                            onClick={() => handleDelete(fb._id)}
                                            style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                                        >
                                            Delete Feedback
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="table-container" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>#</th>
                                    <th style={{ minWidth: '120px' }}>FEEDBACK ID</th>
                                    <th style={{ minWidth: '120px' }}>PATIENT</th>
                                    <th style={{ minWidth: '150px' }}>EMAIL</th>
                                    <th className="positive-col-header" style={{ width: '80px', color: '#16a34a' }}>POSITIVE</th>
                                    <th className="negative-col-header" style={{ width: '80px', color: '#dc2626' }}>NEGATIVE</th>
                                    <th style={{ minWidth: '160px' }}>HOSPITAL SERVICE</th>
                                    <th style={{ minWidth: '150px' }}>USER FEEDBACK</th>
                                    <th style={{ minWidth: '200px' }}>COMMENTS</th>
                                    <th style={{ width: '80px' }}>PHOTO</th>
                                    <th style={{ minWidth: '120px' }}>LOGGED ON</th>
                                    <th style={{ minWidth: '110px' }}>STAFF ENTRIES</th>
                                    <th style={{ width: '100px' }}>STATUS</th>
                                    <th style={{ minWidth: '130px' }}>WORKFLOW</th>
                                    <th style={{ width: '100px', textAlign: 'right' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedFeedbacks.map((fb, index) => {
                                    const cat = fb.categories?.[0] || {};
                                    const reviewType = (cat.reviewType || '').toLowerCase();
                                    const isPositive = ['positive', 'completely_satisfied', 'completely satisfied'].includes(reviewType);
                                    const isNegative = ['negative', 'needs work', 'needs_work', 'not_satisfied', 'not satisfied'].includes(reviewType);
                                    const actualStatus = fb.status;
                                    const isOverdue = fb.isOverdue; // From backend virtual

                                    const rowClass = actualStatus === 'COMPLETED' ? 'row-resolved' : (actualStatus === 'IN PROGRESS' ? 'row-assigned' : (actualStatus === 'Pending' ? 'row-pending' : (isPositive ? 'row-positive' : 'row-negative'))) + (isOverdue ? ' row-overdue' : '');

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
                                                    {(safeCurrentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                    {fb.feedbackId || 'Generating...'}
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
                                            <td className="positive-cell">
                                                <div style={{ textAlign: 'left', minWidth: '140px', fontSize: '0.75rem', color: '#166534' }}>
                                                    {(() => {
                                                        const tags = [
                                                            ...splitTags(cat.positive_feedback), 
                                                            ...splitTags(cat.positive_issues),
                                                            ...(isPositive ? splitTags(cat.issue) : [])
                                                        ];
                                                        const uniqueTags = [...new Set(tags)];
                                                        return uniqueTags.length > 0 ? (
                                                            <span style={{ fontWeight: 700 }}>{uniqueTags.join(', ')}</span>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="negative-cell">
                                                <div style={{ textAlign: 'left', minWidth: '140px', fontSize: '0.75rem', color: '#991b1b'}}>
                                                    {(() => {
                                                        const tags = [
                                                            ...splitTags(cat.negative_feedback), 
                                                            ...splitTags(cat.negative_issues),
                                                            ...(isNegative ? splitTags(cat.issue) : [])
                                                        ];
                                                        const uniqueTags = [...new Set(tags)];
                                                        return uniqueTags.length > 0 ? (
                                                            <span style={{ fontWeight: 700 }}>{uniqueTags.join(', ')}</span>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>{cat.department}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    color: (cat.feedback === 'completely_satisfied' || cat.rating === 'Completely Satisfied') ? '#16a34a' : (cat.feedback === 'partially_satisfied' || cat.rating === 'Partially Satisfied') ? '#ca8a04' : '#dc2626'
                                                }}>
                                                    {cat.feedback === 'completely_satisfied' ? 'COMPLETELY SATISFIED' : 
                                                     cat.feedback === 'partially_satisfied' ? 'PARTIALLY SATISFIED' : 
                                                     cat.feedback === 'not_satisfied' ? 'NOT SATISFIED' : (cat.feedback || cat.rating || 'N/A').toUpperCase()}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '250px', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {fb.comments || "-"}
                                                </div>
                                            </td>
                                            <td>
                                                {cat.image ? (
                                                    <div style={{ display: 'block', width: 'fit-content', cursor: 'pointer' }} onClick={() => setSelectedImage(getAssetUrl(cat.image))}>
                                                        <div style={{ position: 'relative' }}>
                                                            <img
                                                                src={getAssetUrl(cat.image)}
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
                                                    </div>
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
                                                    <button
                                                        className="badge badge-info clickable"
                                                        style={{ border: 'none', cursor: 'pointer', padding: '0.4rem 0.6rem' }}
                                                        onClick={() => setSelectedFeedbackForNotes(prev => (prev?._id === fb._id ? null : fb))}
                                                    >
                                                        Notes: {fb.notes?.length || 0}
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
                                                                e.stopPropagation();
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
                                                                    <span className="edit-hint">Edit</span>
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
                                                                        const currentCat = fb.categories?.[0] || {};
                                                                        const isPatientChoice = currentCat.department === dept.name;

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

                                                                <div className="dropdown-section-title">Adjust Classification</div>
                                                                <div className="adjust-classification">
                                                                    <div className="form-group-sm">
                                                                        <label>Department</label>
                                                                        <select
                                                                            className="form-control-sm"
                                                                            value={tempCategoryDept}
                                                                            onChange={(e) => setTempCategoryDept(e.target.value)}
                                                                        >
                                                                            {hospital?.departments.map(d => (
                                                                                <option key={d.name} value={d.name}>{d.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="form-group-sm">
                                                                        <label>Feedback Type</label>
                                                                        <select
                                                                            className="form-control-sm"
                                                                            value={tempReviewType}
                                                                            onChange={(e) => setTempReviewType(e.target.value)}
                                                                        >
                                                                            <option value="Positive">POSITIVE</option>
                                                                            <option value="negative">NEGATIVE</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="form-group-sm">
                                                                        <label>Detailed Issue</label>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control-sm"
                                                                            value={tempIssue}
                                                                            onChange={(e) => setTempIssue(e.target.value)}
                                                                            placeholder="e.g. Long Wait"
                                                                        />
                                                                    </div>
                                                                    <div className="form-group-sm">
                                                                        <label>Workflow Status</label>
                                                                        <select
                                                                            className="form-control-sm"
                                                                            value={tempStatus}
                                                                            onChange={(e) => setTempStatus(e.target.value)}
                                                                        >
                                                                            <option value="Pending">Pending</option>
                                                                            <option value="IN PROGRESS">In Progress</option>
                                                                            <option value="COMPLETED">Completed/Resolved</option>
                                                                        </select>
                                                                    </div>
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
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn-icon delete"
                                                        onClick={() => handleDelete(fb._id)}
                                                        title="Delete Feedback"
                                                        style={{ color: '#ef4444' }}
                                                    >
                                                        🗑️
                                                    </button>
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

            {totalResults > ITEMS_PER_PAGE && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginTop: '1.25rem',
                    flexWrap: 'wrap'
                }}>
                    <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={safeCurrentPage === 1}
                        style={{ minWidth: '100px', opacity: safeCurrentPage === 1 ? 0.5 : 1 }}
                    >
                        Previous
                    </button>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                        Page {safeCurrentPage} of {pageCount}
                    </div>
                    <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                        disabled={safeCurrentPage === pageCount}
                        style={{ minWidth: '100px', opacity: safeCurrentPage === pageCount ? 0.5 : 1 }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Internal Notes Side-Panel */}
            {selectedFeedbackForNotes && (
                <div style={{
                    position: 'fixed', top: 0, right: 0, width: isMobile ? '100%' : '400px', height: '100vh',
                    background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
                    zIndex: 1000, padding: isMobile ? '1rem' : '2rem', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', pb: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>Internal Staff Notes</h3>
                        <button 
                            className="btn-icon" 
                            style={{ 
                                background: '#f8fafc', 
                                border: '1px solid #e2e8f0',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '1rem',
                                color: '#64748b'
                            }} 
                            onClick={() => setSelectedFeedbackForNotes(null)}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                            title="Close Sidebar (Esc)"
                        >✕</button>
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

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)', zIndex: 2000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                        <button
                            onClick={() => setSelectedImage(null)}
                            style={{
                                position: 'absolute', top: '-40px', right: 0,
                                background: 'transparent', border: 'none', color: 'white',
                                fontSize: '2rem', cursor: 'pointer'
                            }}
                        >✕</button>
                        <img
                            src={selectedImage}
                            alt="Preview"
                            style={{
                                maxWidth: '100%', maxHeight: '85vh',
                                borderRadius: '1rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                background: 'white'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFeedback;
