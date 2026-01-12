import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Dashboard() {
    const { user } = useAuth();
    const location = useLocation();
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [latestAnnouncement, setLatestAnnouncement] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [requestingAccess, setRequestingAccess] = useState({});
    const [reports, setReports] = useState(null);
    const [loadingReports, setLoadingReports] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(null); // 'channels' or 'materials'
    const [pendingItems, setPendingItems] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [rejectReason, setRejectReason] = useState({});
    const [showRejectInput, setShowRejectInput] = useState(null);
    const [previewMaterial, setPreviewMaterial] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewProof, setPreviewProof] = useState(null);
    const [previewProofUrl, setPreviewProofUrl] = useState(null);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [teacherVerifications, setTeacherVerifications] = useState([]);
    const [loadingTeacherVerifications, setLoadingTeacherVerifications] = useState(false);
    const [teacherStatusFilter, setTeacherStatusFilter] = useState('pending');
    const [teacherPendingCount, setTeacherPendingCount] = useState(0);
    const [teacherRejectReason, setTeacherRejectReason] = useState({});
    const [showDownloadsModal, setShowDownloadsModal] = useState(false);
    const [downloads, setDownloads] = useState([]);
    const [loadingDownloads, setLoadingDownloads] = useState(false);
    const [downloadsByDate, setDownloadsByDate] = useState([]);
    const [userWarning, setUserWarning] = useState(null);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showWarningsList, setShowWarningsList] = useState(false);
    const [warnings, setWarnings] = useState([]);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [pendingChannels, setPendingChannels] = useState([]);
    const [showAllChannelsModal, setShowAllChannelsModal] = useState(false);
    const [allChannels, setAllChannels] = useState([]);
    const [loadingAllChannels, setLoadingAllChannels] = useState(false);
    const [showAllMaterialsModal, setShowAllMaterialsModal] = useState(false);
    const [allMaterials, setAllMaterials] = useState([]);
    const [loadingAllMaterials, setLoadingAllMaterials] = useState(false);
    const [studentPendingRequests, setStudentPendingRequests] = useState([]);
    const [loadingStudentRequests, setLoadingStudentRequests] = useState(false);
    const [showStudentPendingRequestsModal, setShowStudentPendingRequestsModal] = useState(false);
    const handleRequestAccess = async (channelId) => {
        setRequestingAccess(prev => ({ ...prev, [channelId]: true }));
        try {
            await axios.post(`/api/channels/${channelId}/request-access`);
            alert('Access request sent! Awaiting teacher approval.');
            // Refresh pending requests to show the newly made request
            await fetchStudentPendingRequests();
            // Show the pending requests modal
            setShowStudentPendingRequestsModal(true);
            setRequestingAccess(prev => ({ ...prev, [channelId]: false }));
        } catch (err) {
            console.error('Request failed', err);
            alert(err?.response?.data?.error || 'Request failed');
            setRequestingAccess(prev => ({ ...prev, [channelId]: false }));
        }
    };

    const fetchChannels = async () => {
        try {
            const response = await axios.get('/api/channels');
            setChannels(response.data);
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeacherPendingChannels = async () => {
        try {
            const response = await axios.get('/api/channels/teacher/pending');
            setPendingChannels(response.data || []);
        } catch (error) {
            console.error('Error fetching pending channels:', error);
        }
    };
    
    const fetchLatestAnnouncement = async (joinedChannels) => {
        try {
            const res = await axios.get("/api/announcements/unread");
            if (res.data) {
                // Only show announcement if user has joined the channel
                const joinedChannelIds = joinedChannels.map(c => c.id);
                if (joinedChannelIds.includes(res.data.channel_id)) {
                    setLatestAnnouncement(res.data);
                    setShowPopup(true);
                }
            }
        } catch (err) {
            console.error("Announcement load failed");
        }
    };

    useEffect(() => {
        if (user) {
            checkUserWarning();
            
            if (user.role === 'student') {
                fetchJoinedChannels();
                fetchStudentPendingRequests();
            } else if (user.role === 'administrator') {
                fetchReports();
                fetchTeacherVerifications('pending');
                setLoading(false);
            } else if (user.role === 'teacher') {
                fetchChannels();
                fetchTeacherPendingChannels();
            }
        }
    }, [user]);

    const checkUserWarning = async () => {
        try {
            const response = await axios.get('/api/user');
            const adminWarnings = response.data.user?.admin_warnings || [];
            setWarnings(adminWarnings);
            // keep last warning for quick display if needed
            if (adminWarnings.length > 0) {
                setUserWarning(adminWarnings[adminWarnings.length - 1].message);
            }
        } catch (err) {
            console.error('Error fetching user warning:', err);
        }
    };

    const fetchJoinedChannels = async () => {
        try {
            const response = await axios.get('/api/channels/joined');
            setChannels(response.data);
            // Fetch announcements only after channels are loaded
            if (user?.role === 'student') {
                fetchLatestAnnouncement(response.data);
            }
        } catch (error) {
            console.error('Error fetching joined channels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e, termOverride) => {
        if (e && e.preventDefault) e.preventDefault();
        const term = (termOverride ?? searchTerm).trim();
        if (!term) return;
        if (termOverride !== undefined) setSearchTerm(term);
        setSearching(true);
        try {
            const res = await axios.get('/api/channels/search', { params: { q: term } });
            setSearchResults(res.data || []);
            setShowSearchModal(true);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (location.state?.reopenSearchModal) {
            const term = location.state.searchTerm || '';
            setSearchTerm(term);
            handleSearch(null, term);
        }
    }, [location.state]);

    const fetchReports = async () => {
        try {
            setLoadingReports(true);
            const response = await axios.get('/api/admin/reports/overview');
            const data = response.data || {};

            const toMap = (list, key) => {
                return (list || []).reduce((acc, row) => {
                    if (row && row[key] !== undefined) {
                        acc[row[key]] = row.count || 0;
                    }
                    return acc;
                }, {});
            };

            const channelCounts = toMap(data.channelCounts, 'status');
            const materialCounts = toMap(data.materialCounts, 'status');
            const userCounts = toMap(data.userCounts, 'role');
            const totalDownloads = (data.downloadCounts || []).reduce((sum, row) => sum + (row.downloads || 0), 0);

            setReports({
                channelsPending: channelCounts.pending || 0,
                channelsApproved: channelCounts.approved || 0,
                channelsRejected: channelCounts.rejected || 0,
                materialsPending: materialCounts.pending || 0,
                materialsApproved: materialCounts.approved || 0,
                materialsRejected: materialCounts.rejected || 0,
                studentCount: userCounts.student || 0,
                teacherCount: userCounts.teacher || 0,
                adminCount: userCounts.administrator || 0,
                totalDownloads,
                pendingAccessRequests: data.pendingAccessRequests || 0,
                totalChannels: data.totalChannels || 0,
                totalMaterials: data.totalMaterials || 0,
            });
        } catch (err) {
            console.error('Admin reports load failed', err);
        } finally {
            setLoadingReports(false);
        }
    };

    const fetchPendingChannels = async () => {
        try {
            setLoadingPending(true);
            const response = await axios.get('/api/admin/channels/pending');
            setPendingItems(response.data || []);
        } catch (err) {
            console.error('Pending channels load failed', err);
        } finally {
            setLoadingPending(false);
        }
    };

    const fetchPendingMaterials = async () => {
        try {
            setLoadingPending(true);
            const response = await axios.get('/api/admin/materials/pending');
            setPendingItems(response.data || []);
        } catch (err) {
            console.error('Pending materials load failed', err);
        } finally {
            setLoadingPending(false);
        }
    };

    const fetchTeacherVerifications = async (status = 'pending') => {
        try {
            setLoadingTeacherVerifications(true);
            const response = await axios.get('/api/admin/teacher-verifications', { params: { status } });
            const rows = response.data || [];
            setTeacherVerifications(rows);
            if (status === 'pending') {
                setTeacherPendingCount(rows.length);
            }
        } catch (err) {
            console.error('Teacher verifications load failed', err);
        } finally {
            setLoadingTeacherVerifications(false);
        }
    };

    const handleApproveChannel = async (channelId) => {
        try {
            await axios.post(`/api/admin/channels/${channelId}/approve`);
            await fetchPendingChannels();
            await fetchReports();
        } catch (err) {
            console.error('Approve failed', err);
            alert('Failed to approve channel');
        }
    };

    const handleRejectChannel = async (channelId) => {
        try {
            const reason = rejectReason[`channel-${channelId}`] || '';
            await axios.post(`/api/admin/channels/${channelId}/reject`, { reason });
            setShowRejectInput(null);
            setRejectReason({});
            await fetchPendingChannels();
            await fetchReports();
        } catch (err) {
            console.error('Reject failed', err);
            alert('Failed to reject channel');
        }
    };

    const handleApproveMaterial = async (materialId) => {
        try {
            await axios.post(`/api/admin/materials/${materialId}/approve`);
            await fetchPendingMaterials();
            await fetchReports();
        } catch (err) {
            console.error('Approve failed', err);
            alert('Failed to approve material');
        }
    };

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await axios.get('/api/admin/users');
            // Backend returns array directly or wrapped in { users } object
            const users = Array.isArray(response.data) ? response.data : (response.data.users || []);
            console.log('Fetched users:', users.length, users);
            setUsers(users);
        } catch (err) {
            console.error('Users load failed', err);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This will also soft delete their channels and materials.')) {
            return;
        }
        
        // Prompt for deletion reason
        const reason = window.prompt('Please provide a reason for deleting this user:');
        if (!reason || reason.trim() === '') {
            alert('Deletion reason is required.');
            return;
        }
        
        try {
            await axios.delete(`/api/admin/users/${userId}`, { data: { reason } });
            await fetchUsers();
            await fetchReports();
            alert('User deleted successfully');
        } catch (err) {
            console.error('Delete user failed', err);
            alert(err?.response?.data?.error || 'Failed to delete user');
        }
    };

    const handleSaveComment = async (userId) => {
        try {
            await axios.post(`/api/admin/users/${userId}/comment`, { comment: commentText });
            await fetchUsers();
            setEditingComment(null);
            setCommentText('');
            setSuccessMessage('⚠️ Warning sent successfully!');
            setShowSuccessPopup(true);
            setTimeout(() => setShowSuccessPopup(false), 2000);
        } catch (err) {
            console.error('Save comment failed', err);
            alert('Failed to save comment');
        }
    };

    const fetchDownloads = async () => {
        try {
            setLoadingDownloads(true);
            const response = await axios.get('/api/admin/downloads');
            setDownloads(response.data.downloads || []);
            setDownloadsByDate(response.data.downloadsByDate || []);
        } catch (err) {
            console.error('Downloads load failed', err);
        } finally {
            setLoadingDownloads(false);
        }
    };

    const openUsersModal = () => {
        setShowUsersModal(true);
        fetchUsers();
    };

    const openDownloadsModal = () => {
        setShowDownloadsModal(true);
        fetchDownloads();
    };

    const fetchAllChannels = async () => {
        try {
            setLoadingAllChannels(true);
            const response = await axios.get('/api/admin/all-channels');
            setAllChannels(response.data || []);
        } catch (err) {
            console.error('Fetch all channels failed', err);
            alert('Failed to load channels');
        } finally {
            setLoadingAllChannels(false);
        }
    };

    const fetchAllMaterials = async () => {
        try {
            setLoadingAllMaterials(true);
            const response = await axios.get('/api/admin/all-materials');
            setAllMaterials(response.data || []);
        } catch (err) {
            console.error('Fetch all materials failed', err);
            alert('Failed to load materials');
        } finally {
            setLoadingAllMaterials(false);
        }
    };

    const openAllChannelsModal = () => {
        setShowAllChannelsModal(true);
        fetchAllChannels();
    };

    const openAllMaterialsModal = () => {
        setShowAllMaterialsModal(true);
        fetchAllMaterials();
    };

    const fetchStudentPendingRequests = async () => {
        try {
            setLoadingStudentRequests(true);
            const response = await axios.get('/api/student/pending-access-requests');
            setStudentPendingRequests(response.data || []);
        } catch (err) {
            console.error('Fetch student pending requests failed', err);
        } finally {
            setLoadingStudentRequests(false);
        }
    };

    const openStudentPendingRequestsModal = () => {
        setShowStudentPendingRequestsModal(true);
        fetchStudentPendingRequests();
    };

    const openTeacherModal = async (status = 'pending') => {
        setTeacherStatusFilter(status);
        await fetchTeacherVerifications(status);
        setShowTeacherModal(true);
    };

    const handleRejectMaterial = async (materialId) => {
        try {
            const reason = rejectReason[`material-${materialId}`] || '';
            await axios.post(`/api/admin/materials/${materialId}/reject`, { reason });
            setShowRejectInput(null);
            setRejectReason({});
            await fetchPendingMaterials();
            await fetchReports();
        } catch (err) {
            console.error('Reject failed', err);
            alert('Failed to reject material');
        }
    };

    const openApprovalModal = async (type) => {
        setShowApprovalModal(type);
        if (type === 'channels') {
            await fetchPendingChannels();
        } else if (type === 'materials') {
            await fetchPendingMaterials();
        }
    };

    const handleApproveTeacher = async (verificationId) => {
        try {
            await axios.post(`/api/admin/teacher-verifications/${verificationId}/approve`);
            await fetchTeacherVerifications(teacherStatusFilter);
            await fetchReports();
        } catch (err) {
            console.error('Approve teacher failed', err);
            alert('Failed to approve teacher');
        }
    };

    const handleRejectTeacher = async (verificationId) => {
        const reason = teacherRejectReason[verificationId] || '';
        if (!reason.trim()) {
            alert('Rejection reason is required');
            return;
        }
        try {
            await axios.post(`/api/admin/teacher-verifications/${verificationId}/reject`, { reason });
            setTeacherRejectReason((prev) => ({ ...prev, [verificationId]: '' }));
            await fetchTeacherVerifications(teacherStatusFilter);
            await fetchReports();
        } catch (err) {
            console.error('Reject teacher failed', err);
            alert('Failed to reject teacher');
        }
    };

    // Load preview for admin
    useEffect(() => {
        let activeUrl = null;
        const loadPreview = async () => {
            if (!previewMaterial) {
                setPreviewUrl(null);
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/materials/${previewMaterial.id}/preview`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || res.statusText);
                }

                const blob = await res.blob();
                activeUrl = URL.createObjectURL(blob);
                setPreviewUrl(activeUrl);
            } catch (err) {
                console.error('Preview load failed', err);
                alert('Preview failed: ' + (err.message || 'Unable to load preview'));
                setPreviewMaterial(null);
            }
        };

        loadPreview();

        return () => {
            if (activeUrl) URL.revokeObjectURL(activeUrl);
            setPreviewUrl(null);
        };
    }, [previewMaterial]);

    return (
        <div className="py-5">
            {/* Teacher Pending Approval Modal - Blocks Access */}
            {user?.role === 'teacher_pending' ? (
                <div className="popup-backdrop" style={{ zIndex: 9999 }}>
                    <div className="card p-5 text-center" style={{ minWidth: "500px", maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4">
                            <span style={{ fontSize: '4em' }}>⏳</span>
                        </div>
                        <h3 className="text-warning fw-bold mb-3">Teacher Registration Pending</h3>
                        <p className="text-white mb-2" style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
                            Your teacher registration is awaiting admin approval.
                        </p>
                        <p className="text-muted mb-4">
                            Please wait for the administrator to review and approve your documentation.
                        </p>
                        <p className="text-muted small mb-4">
                            Once approved, you will be able to access all teacher features.
                        </p>
                        <button 
                            className="btn btn-outline-secondary w-100"
                            onClick={() => {
                                localStorage.removeItem('token');
                                window.location.href = '/login';
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            ) : (
                <div className="container">
                    <div className="d-flex justify-content-end mb-3">
                        {warnings.length > 0 && (
                            <button className="btn btn-warning" onClick={() => setShowWarningsList(true)}>
                                ⚠️ Warnings ({warnings.length})
                            </button>
                        )}
                    </div>

                {/* Warning Modal Popup (centered, only when manually opened) */}
                {showWarningModal && userWarning && (
                    <div className="popup-backdrop" onClick={() => setShowWarningModal(false)}>
                        <div className="card p-5" style={{ minWidth: "500px", maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex align-items-center mb-3">
                                <span style={{ fontSize: '3em', marginRight: '15px' }}>⚠️</span>
                                <h3 className="text-warning fw-bold mb-0">Administrator Warning</h3>
                            </div>
                            <hr className="text-warning" />
                            <p className="text-white mb-4" style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
                                {userWarning}
                            </p>
                            <button
                                className="btn btn-warning w-100"
                                onClick={() => setShowWarningModal(false)}
                            >
                                I Acknowledge
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Popup */}
                {showSuccessPopup && (
                    <div className="popup-backdrop" onClick={() => setShowSuccessPopup(false)}>
                        <div className="card p-5 text-center" style={{ minWidth: "400px", maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-success fw-bold mb-3">{successMessage}</h3>
                            <p className="text-muted mb-0">The warning has been sent to the user.</p>
                        </div>
                    </div>
                )}

                {/* Warning list popup */}
                {showWarningsList && (
                    <div className="popup-backdrop" onClick={() => setShowWarningsList(false)}>
                        <div className="card p-4" style={{ minWidth: "500px", maxWidth: "650px" }} onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="text-warning mb-0">Your Warnings</h4>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowWarningsList(false)}>✕</button>
                            </div>
                            {warnings.length === 0 ? (
                                <p className="text-muted mb-0">You have no warnings.</p>
                            ) : (
                                <div className="list-group">
                                    {warnings.map((w, idx) => (
                                        <div key={idx} className="list-group-item bg-dark text-white mb-2 border border-warning" style={{ borderWidth: '1px' }}>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <strong>⚠️ Warning {idx + 1}</strong>
                                                <span className="text-muted small">{w.created_at ? new Date(w.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''}</span>
                                            </div>
                                            <div className="mt-2">{w.message}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="card mb-4">
                    <div className="card-body">
                        <h3 className="card-title fw-bold">
                            Welcome back, {user?.name}!
                        </h3>
                        <p className="text-muted mb-0">
                            You are logged in as a{' '}
                            <span className="fw-semibold" style={{ color: '#8b5cf6' }}>
                                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                            </span>
                        </p>
                    </div>
                </div>

                {user?.role === 'teacher' ? (
                    <>
                        {pendingChannels.length > 0 && (
                            <div className="alert alert-warning mb-4 d-flex align-items-center gap-3">
                                <span style={{ fontSize: '1.5em' }}>⏳</span>
                                <div>
                                    <strong>You have {pendingChannels.length} pending channel{pendingChannels.length !== 1 ? 's' : ''}</strong>
                                    <p className="mb-0 small">Awaiting admin approval. You can view and edit pending channels, but they won't be visible to students until approved.</p>
                                </div>
                            </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="h4 fw-semibold text-white">My Teaching Channels</h3>
                            <Link to="/channels/create" className="btn btn-primary">
                                + Create New Channel
                            </Link>
                        </div>

                        {loading ? (
                            <div className="text-white">Loading...</div>
                        ) : channels.length === 0 && pendingChannels.length === 0 ? (
                            <div className="card">
                                <div className="card-body text-center text-muted">
                                    <p>You haven't created any channels yet.</p>
                                    <p className="small mb-0">
                                        Create a channel to start sharing notes and exercises.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {pendingChannels.length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-warning mb-3">
                                            <span className="badge bg-warning text-dark me-2">PENDING APPROVAL</span>
                                        </h5>
                                        <div className="row g-4">
                                            {pendingChannels.map((channel) => (
                                                <div key={channel.id} className="col-md-6 col-lg-4">
                                                    <Link
                                                        to={`/channels/${channel.id}`}
                                                        className="card text-decoration-none h-100"
                                                        style={{ transition: 'all 0.3s', opacity: 0.7, borderColor: '#f59e0b' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fbbf24'}
                                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                                                    >
                                                        <div className="card-body">
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <h5 className="card-title text-white mb-0">{channel.title}</h5>
                                                                <span className="badge bg-warning text-dark">PENDING</span>
                                                            </div>
                                                            <p className="card-text text-muted small">{channel.description}</p>
                                                        </div>
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {channels.length > 0 && (
                                    <div>
                                        <h5 className="text-success mb-3">
                                            <span className="badge bg-success me-2">APPROVED</span>
                                        </h5>
                                        <div className="row g-4">
                                            {channels.map((channel) => (
                                                <div key={channel.id} className="col-md-6 col-lg-4">
                                                    <Link
                                                        to={`/channels/${channel.id}`}
                                                        className="card text-decoration-none h-100"
                                                        style={{ transition: 'all 0.3s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                                    >
                                                        <div className="card-body">
                                                            <h5 className="card-title text-white">{channel.title}</h5>
                                                            <p className="card-text text-muted small">{channel.description}</p>
                                                        </div>
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : user?.role === 'administrator' ? (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="h4 fw-semibold text-white">Admin Analytics</h3>
                        </div>

                        {loadingReports ? (
                            <div className="text-white">Loading analytics...</div>
                        ) : (
                            <div className="row g-4">
                                <div className="col-md-6 col-lg-3">
                                    <div 
                                        className="card h-100" 
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={() => openApprovalModal('channels')}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                    >
                                        <div className="card-body">
                                            <div className="text-muted small mb-2">Channels <span style={{ color: '#a855f7' }}>(click to review)</span></div>
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <div className="small text-muted">Pending</div>
                                                    <div className="h4 fw-bold" style={{ color: '#f59e0b' }}>{reports?.channelsPending ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Approved</div>
                                                    <div className="h4 fw-bold" style={{ color: '#22c55e' }}>{reports?.channelsApproved ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Rejected</div>
                                                    <div className="h4 fw-bold" style={{ color: '#ef4444' }}>{reports?.channelsRejected ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div 
                                        className="card h-100"
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={() => openApprovalModal('materials')}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                    >
                                        <div className="card-body">
                                            <div className="text-muted small mb-2">Materials <span style={{ color: '#a855f7' }}>(click to review)</span></div>
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <div className="small text-muted">Pending</div>
                                                    <div className="h4 fw-bold" style={{ color: '#f59e0b' }}>{reports?.materialsPending ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Approved</div>
                                                    <div className="h4 fw-bold" style={{ color: '#22c55e' }}>{reports?.materialsApproved ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Rejected</div>
                                                    <div className="h4 fw-bold" style={{ color: '#ef4444' }}>{reports?.materialsRejected ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div 
                                        className="card h-100"
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={() => openTeacherModal('pending')}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                    >
                                        <div className="card-body">
                                            <div className="text-muted small mb-2">Teacher Verification <span style={{ color: '#a855f7' }}>(click to review)</span></div>
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <div className="small text-muted">Pending</div>
                                                    <div className="h4 fw-bold" style={{ color: '#f59e0b' }}>{teacherPendingCount}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Teachers</div>
                                                    <div className="h4 fw-bold" style={{ color: '#06b6d4' }}>{reports?.teacherCount ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Students</div>
                                                    <div className="h4 fw-bold" style={{ color: '#a855f7' }}>{reports?.studentCount ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div 
                                        className="card h-100"
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={openUsersModal}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                    >
                                        <div className="card-body">
                                            <div className="text-muted small mb-2">Users <span style={{ color: '#a855f7' }}>(click to manage)</span></div>
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <div className="small text-muted">Students</div>
                                                    <div className="h4 fw-bold" style={{ color: '#a855f7' }}>{reports?.studentCount ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Teachers</div>
                                                    <div className="h4 fw-bold" style={{ color: '#06b6d4' }}>{reports?.teacherCount ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Admins</div>
                                                    <div className="h4 fw-bold" style={{ color: '#cbd5e1' }}>{reports?.adminCount ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div 
                                        className="card h-100"
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={openDownloadsModal}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                    >
                                        <div className="card-body">
                                            <div className="text-muted small mb-2">Activity <span style={{ color: '#a855f7' }}>(click to view)</span></div>
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <div className="small text-muted">Downloads</div>
                                                    <div className="h4 fw-bold" style={{ color: '#a855f7' }}>{reports?.totalDownloads ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="small text-muted">Access Requests</div>
                                                    <div className="h4 fw-bold" style={{ color: '#a855f7' }}>{reports?.pendingAccessRequests ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div 
                                        className="card h-100"
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={openAllChannelsModal}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                    >
                                        <div className="card-body">
                                            <div className="text-muted small mb-2">All Channels <span style={{ color: '#a855f7' }}>(click to view list)</span></div>
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <div className="small text-muted">Total</div>
                                                    <div className="h4 fw-bold" style={{ color: '#06b6d4' }}>{reports?.totalChannels ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div 
                                        className="card h-100"
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={openAllMaterialsModal}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                    >
                                        <div className="card-body">
                                            <div className="text-muted small mb-2">All Materials <span style={{ color: '#a855f7' }}>(click to view list)</span></div>
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <div className="small text-muted">Total</div>
                                                    <div className="h4 fw-bold" style={{ color: '#06b6d4' }}>{reports?.totalMaterials ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="h4 fw-semibold text-white">My Study Channels</h3>
                            <div className="d-flex gap-2" style={{ alignItems: 'center' }}>
                                <form onSubmit={handleSearch} className="d-flex gap-2" style={{ margin: 0 }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search channels..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ maxWidth: '250px' }}
                                    />
                                    <button className="btn btn-secondary" type="submit" disabled={searching}>
                                        {searching ? '...' : 'Search'}
                                    </button>
                                </form>
                                <Link to="/join" className="btn btn-primary">
                                    + Join Channel
                                </Link>
                            </div>
                        </div>

                        {studentPendingRequests.length > 0 && (
                            <button 
                                className="btn btn-warning mb-4"
                                onClick={openStudentPendingRequestsModal}
                                style={{ position: 'relative', minWidth: '60px', padding: '10px 20px' }}
                            >
                                ⏳ Pending Requests <span className="badge bg-danger ms-2">{studentPendingRequests.length}</span>
                            </button>
                        )}

                        {loading ? (
                            <div className="text-white">Loading...</div>
                        ) : channels.length === 0 ? (
                            <div className="card">
                                <div className="card-body text-center text-muted">
                                    <p>You haven't joined any channels yet.</p>
                                    <p className="small mb-0">
                                        Find a teacher's channel to access their materials.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="row g-4">
                                {channels.map((channel) => (
                                    <div key={channel.id} className="col-md-6 col-lg-4">
                                        <Link
                                            to={`/channels/${channel.id}`}
                                            className="card text-decoration-none h-100"
                                            style={{ transition: 'all 0.3s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2b2f3f'}
                                        >
                                            <div className="card-body">
                                                <h5 className="card-title text-white">{channel.title}</h5>
                                                <p className="card-text text-muted small">{channel.description}</p>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

            {/* Search Results Modal (students only) */}
            {user?.role === 'student' && showSearchModal && (
                <div className="popup-backdrop">
                    <div className="card p-5" style={{ minWidth: "600px" }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="text-white mb-0">Search Results</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowSearchModal(false)}
                            ></button>
                        </div>

                        {searchResults.length > 0 ? (
                            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                                {searchResults.map((channel) => (
                                    <div key={channel.id} className="p-3 mb-2" style={{ background: "#1a1a20", borderRadius: "5px" }}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center gap-2">
                                                    <h6 className="text-white mb-1">{channel.title}</h6>
                                                    <span className={`badge ${Number(channel.is_private) === 1 ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                        {Number(channel.is_private) === 1 ? 'Private' : 'Public'}
                                                    </span>
                                                </div>
                                                <p className="text-muted small mb-0">{channel.description || "No description"}</p>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2 mt-3">
                                            <Link
                                                to={`/channels/${channel.id}`}
                                                state={{ fromSearchModal: true, searchTerm, returnTo: location.pathname }}
                                                className="btn btn-sm btn-outline-primary flex-fill"
                                                onClick={() => setShowSearchModal(false)}
                                            >
                                                View Channel
                                            </Link>
                                            {Number(channel.is_private) === 1 ? (
                                                <button
                                                    className="btn btn-sm btn-outline-primary flex-fill"
                                                    onClick={() => handleRequestAccess(channel.id)}
                                                    disabled={requestingAccess[channel.id]}
                                                >
                                                    {requestingAccess[channel.id] ? 'Requesting...' : 'Request Access'}
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-sm btn-primary flex-fill"
                                                    onClick={async () => {
                                                        try {
                                                            await axios.post(`/api/channels/${channel.id}/join-public`);
                                                            setShowSearchModal(false);
                                                            window.location.href = `/channels/${channel.id}`;
                                                        } catch (err) {
                                                            alert(err?.response?.data?.error || 'Join failed');
                                                        }
                                                    }}
                                                >
                                                    Join Channel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted">
                                <p>No channels found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showPopup && latestAnnouncement && (
  <div className="popup-backdrop">
    <div className="card p-4 text-center" style={{ minWidth: "500px" }}>

      <span className="badge bg-primary mb-2">
        {latestAnnouncement.channel_name}
      </span>

      <h4 className="text-white mb-2">
        {latestAnnouncement.title}
      </h4>

      <p className="text-muted">
        {latestAnnouncement.message}
      </p>

      <button
        className="btn btn-secondary mt-3"
        onClick={async () => {
          await axios.post(`/api/announcements/${latestAnnouncement.id}/read`);
          setShowPopup(false);
        }}
      >
        Close
      </button>

    </div>
  </div>
)}

            {/* Approval Modal for Admin */}
            {showApprovalModal && (
                <div className="popup-backdrop" onClick={() => setShowApprovalModal(null)}>
                    <div className="card p-4" style={{ minWidth: "800px", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="text-white mb-0">
                                {showApprovalModal === 'channels' ? 'Channel Approvals' : 'Material Approvals'}
                            </h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowApprovalModal(null)}
                            ></button>
                        </div>

                        {/* Status Overview Chart */}
                        {!loadingPending && reports && (
                            <div className="mb-4 p-3" style={{ background: '#1a1a20', borderRadius: '8px' }}>
                                <h5 className="text-white mb-3">Status Overview</h5>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={showApprovalModal === 'channels' ? [
                                        { status: 'Pending', count: reports.channelsPending, color: '#f59e0b' },
                                        { status: 'Approved', count: reports.channelsApproved, color: '#22c55e' },
                                        { status: 'Rejected', count: reports.channelsRejected, color: '#ef4444' }
                                    ] : [
                                        { status: 'Pending', count: reports.materialsPending, color: '#f59e0b' },
                                        { status: 'Approved', count: reports.materialsApproved, color: '#22c55e' },
                                        { status: 'Rejected', count: reports.materialsRejected, color: '#ef4444' }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="status" stroke="#999" />
                                        <YAxis stroke="#999" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1a1a20', border: '1px solid #333' }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="count">
                                            {(showApprovalModal === 'channels' ? [
                                                { status: 'Pending', count: reports.channelsPending, color: '#f59e0b' },
                                                { status: 'Approved', count: reports.channelsApproved, color: '#22c55e' },
                                                { status: 'Rejected', count: reports.channelsRejected, color: '#ef4444' }
                                            ] : [
                                                { status: 'Pending', count: reports.materialsPending, color: '#f59e0b' },
                                                { status: 'Approved', count: reports.materialsApproved, color: '#22c55e' },
                                                { status: 'Rejected', count: reports.materialsRejected, color: '#ef4444' }
                                            ]).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {loadingPending ? (
                            <div className="text-center text-white">Loading...</div>
                        ) : pendingItems.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <h5>✓ Nothing to approve or reject</h5>
                                <p>All {showApprovalModal} are up to date!</p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {showApprovalModal === 'channels' && pendingItems.map((channel) => (
                                    <div key={channel.id} className="p-3" style={{ background: "#1a1a20", borderRadius: "8px", border: "1px solid #333" }}>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h5 className="text-white mb-1">{channel.title || channel.name}</h5>
                                                <span className="badge bg-primary">{channel.teacher_name}</span>
                                            </div>
                                            <span className={`badge ${Number(channel.is_private) === 1 ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                {Number(channel.is_private) === 1 ? 'Private' : 'Public'}
                                            </span>
                                        </div>
                                        <p className="text-muted small mb-3">{channel.description || 'No description'}</p>
                                        
                                        {showRejectInput === `channel-${channel.id}` ? (
                                            <div className="mb-2">
                                                <textarea
                                                    className="form-control mb-2"
                                                    placeholder="Reason for rejection (optional)..."
                                                    value={rejectReason[`channel-${channel.id}`] || ''}
                                                    onChange={(e) => setRejectReason({ ...rejectReason, [`channel-${channel.id}`]: e.target.value })}
                                                    rows={2}
                                                />
                                                <div className="d-flex gap-2">
                                                    <button className="btn btn-danger btn-sm flex-fill" onClick={() => handleRejectChannel(channel.id)}>
                                                        Confirm Reject
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm flex-fill" onClick={() => setShowRejectInput(null)}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="d-flex gap-2">
                                                <button className="btn btn-success btn-sm flex-fill" onClick={() => handleApproveChannel(channel.id)}>
                                                    Approve
                                                </button>
                                                <button className="btn btn-danger btn-sm flex-fill" onClick={() => setShowRejectInput(`channel-${channel.id}`)}>
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {showApprovalModal === 'materials' && pendingItems.map((material) => (
                                    <div key={material.id} className="p-3" style={{ background: "#1a1a20", borderRadius: "8px", border: "1px solid #333" }}>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h5 className="text-white mb-1">{material.title || material.file_name}</h5>
                                                <div className="d-flex gap-2">
                                                    <span className="badge bg-info">{material.channel_title}</span>
                                                    <span className="badge bg-primary">{material.uploader_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-muted small mb-2">{material.description || 'No description'}</p>
                                        <p className="text-muted small mb-3">
                                            <strong>File:</strong> {material.file_name} ({material.file_mime})
                                        </p>
                                        
                                        {showRejectInput === `material-${material.id}` ? (
                                            <div className="mb-2">
                                                <textarea
                                                    className="form-control mb-2"
                                                    placeholder="Reason for rejection (optional)..."
                                                    value={rejectReason[`material-${material.id}`] || ''}
                                                    onChange={(e) => setRejectReason({ ...rejectReason, [`material-${material.id}`]: e.target.value })}
                                                    rows={2}
                                                />
                                                <div className="d-flex gap-2">
                                                    <button className="btn btn-danger btn-sm flex-fill" onClick={() => handleRejectMaterial(material.id)}>
                                                        Confirm Reject
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm flex-fill" onClick={() => setShowRejectInput(null)}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="d-flex gap-2">
                                                <button 
                                                    className="btn btn-sm flex-fill"
                                                    style={{ backgroundColor: '#a855f7', color: 'white', border: 'none' }}
                                                    onClick={() => setPreviewMaterial(material)}
                                                >
                                                    Preview
                                                </button>
                                                <button className="btn btn-success btn-sm flex-fill" onClick={() => handleApproveMaterial(material.id)}>
                                                    Approve
                                                </button>
                                                <button className="btn btn-danger btn-sm flex-fill" onClick={() => setShowRejectInput(`material-${material.id}`)}>
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Teacher Verification Modal */}
            {showTeacherModal && (
                <div className="popup-backdrop" onClick={() => setShowTeacherModal(false)}>
                    <div className="card p-4" style={{ minWidth: "900px", maxWidth: "95vw", height: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h4 className="text-white mb-1">Teacher Verifications</h4>
                                <div className="btn-group btn-group-sm" role="group" aria-label="Status filter">
                                    {['pending','approved','rejected'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            className={`btn ${teacherStatusFilter === status ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => openTeacherModal(status)}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowTeacherModal(false)}
                            ></button>
                        </div>

                        {loadingTeacherVerifications ? (
                            <div className="text-center text-white">Loading verifications...</div>
                        ) : teacherVerifications.length === 0 ? (
                            <div className="text-center text-muted py-4">No {teacherStatusFilter} verifications.</div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {teacherVerifications.map((item) => (
                                    <div key={item.id} className="p-3" style={{ background: '#1a1a20', borderRadius: '8px', border: '1px solid #333' }}>
                                        <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                                            <div>
                                                <h5 className="text-white mb-1">{item.name}</h5>
                                                <div className="text-muted small">{item.email}</div>
                                                <div className="text-muted small">Requested: {new Date(item.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className={`badge ${item.status === 'approved' ? 'bg-success' : item.status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                                    {item.status.toUpperCase()}
                                                </span>
                                                {item.proof_path && (
                                                    <button
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => {
                                                            setPreviewProof(item);
                                                            setPreviewProofUrl(`http://localhost:3001${item.proof_path}`);
                                                        }}
                                                    >
                                                        View Proof
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {item.status === 'rejected' && item.reason && (
                                            <div className="text-danger small mb-2">Reason: {item.reason}</div>
                                        )}

                                        {item.status === 'pending' ? (
                                            <div className="d-flex flex-column gap-2">
                                                <textarea
                                                    className="form-control"
                                                    rows={2}
                                                    placeholder="Reason for rejection (required if rejecting)"
                                                    value={teacherRejectReason[item.id] || ''}
                                                    onChange={(e) => setTeacherRejectReason((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                />
                                                <div className="d-flex gap-2">
                                                    <button className="btn btn-success btn-sm flex-fill" onClick={() => handleApproveTeacher(item.id)}>
                                                        Approve
                                                    </button>
                                                    <button className="btn btn-danger btn-sm flex-fill" onClick={() => handleRejectTeacher(item.id)}>
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-muted small">Reviewed by admin {item.approved_by || '—'}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Material Preview Modal for Admin */}
            {previewMaterial && (
                <div className="popup-backdrop" onClick={() => setPreviewMaterial(null)}>
                    <div className="card p-4" style={{ minWidth: "80vw", minHeight: "80vh", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="text-white mb-0">{previewMaterial.title || previewMaterial.file_name}</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setPreviewMaterial(null)}
                            ></button>
                        </div>
                        {previewUrl ? (
                            <iframe
                                src={previewUrl}
                                style={{ width: "100%", height: "75vh", border: "1px solid #333", borderRadius: "8px" }}
                                title="Material Preview"
                            />
                        ) : (
                            <div className="text-center text-white">Loading preview...</div>
                        )}
                    </div>
                </div>
            )}

            {/* Teacher Proof Preview Modal */}
            {previewProof && (
                <div className="popup-backdrop" onClick={() => setPreviewProof(null)}>
                    <div className="card p-4" style={{ minWidth: "80vw", minHeight: "80vh", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="text-white mb-0">Teacher Verification Proof - {previewProof.name}</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setPreviewProof(null)}
                            ></button>
                        </div>
                        {previewProofUrl ? (
                            <iframe
                                src={previewProofUrl}
                                style={{ width: "100%", height: "75vh", border: "1px solid #333", borderRadius: "8px" }}
                                title="Proof Preview"
                            />
                        ) : (
                            <div className="text-center text-white">Loading preview...</div>
                        )}
                    </div>
                </div>
            )}

            {/* User Management Modal */}
            {showUsersModal && (
                <div className="popup-backdrop" onClick={() => setShowUsersModal(false)}>
                    <div className="card p-4" style={{ minWidth: "1000px", maxWidth: "95vw", height: "95vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="text-white mb-0">User Management ({users.filter(u => u.role !== 'administrator').length} users)</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowUsersModal(false)}
                            ></button>
                        </div>

                        {loadingUsers ? (
                            <div className="text-center text-white">Loading users...</div>
                        ) : users.length === 0 ? (
                            <div className="text-center text-muted">No users found</div>
                        ) : (
                            <>
                                {console.log('Rendering users modal with', users.length, 'users')}
                                {/* User Distribution Pie Chart */}
                                <div className="mb-3 p-2" style={{ background: '#1a1a20', borderRadius: '8px' }}>
                                    <h6 className="text-white mb-2">User Distribution</h6>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Students', value: users.filter(u => u.role === 'student').length, color: '#22c55e' },
                                                    { name: 'Teachers', value: users.filter(u => u.role === 'teacher').length, color: '#3b82f6' }
                                                ]}
                                                cx="40%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Students', value: users.filter(u => u.role === 'student').length, color: '#22c55e' },
                                                    { name: 'Teachers', value: users.filter(u => u.role === 'teacher').length, color: '#3b82f6' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1a1a20', border: '1px solid #333' }}
                                                labelStyle={{ color: '#fff' }}
                                            />
                                            <Legend layout="vertical" align="left" verticalAlign="middle" wrapperStyle={{ paddingLeft: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Gender Distribution - Side by Side */}
                                <div className="row mb-3">
                                    {/* Student Gender Distribution */}
                                    <div className="col-md-6">
                                        <div className="p-2" style={{ background: '#1a1a20', borderRadius: '8px' }}>
                                            <h6 className="text-white mb-2">Student Gender</h6>
                                            {(() => {
                                                const students = users.filter(u => u.role === 'student');
                                                const maleCount = students.filter(u => (u.gender || '').toLowerCase() === 'male').length;
                                                const femaleCount = students.filter(u => (u.gender || '').toLowerCase() === 'female').length;
                                                
                                                if (maleCount === 0 && femaleCount === 0) {
                                                    return <p className="text-muted text-center">No gender data available</p>;
                                                }
                                                
                                                const genderData = [
                                                    { name: 'Male', value: maleCount, color: '#60a5fa' },
                                                    { name: 'Female', value: femaleCount, color: '#f472b6' }
                                                ].filter(d => d.value > 0);
                                                
                                                return (
                                                    <ResponsiveContainer width="100%" height={250}>
                                                        <PieChart>
                                                            <Pie
                                                                data={genderData}
                                                                cx="40%"
                                                                cy="50%"
                                                                labelLine={false}
                                                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                                outerRadius={70}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                            >
                                                                {genderData.map((entry, index) => (
                                                                    <Cell key={`student-gender-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip 
                                                                contentStyle={{ backgroundColor: '#1a1a20', border: '1px solid #333' }}
                                                                labelStyle={{ color: '#fff' }}
                                                            />
                                                            <Legend layout="vertical" align="left" verticalAlign="middle" wrapperStyle={{ paddingLeft: '20px' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Teacher Gender Distribution */}
                                    <div className="col-md-6">
                                        <div className="p-2" style={{ background: '#1a1a20', borderRadius: '8px' }}>
                                            <h6 className="text-white mb-2">Teacher Gender</h6>
                                            {(() => {
                                                const teachers = users.filter(u => u.role === 'teacher');
                                                const maleCount = teachers.filter(u => (u.gender || '').toLowerCase() === 'male').length;
                                                const femaleCount = teachers.filter(u => (u.gender || '').toLowerCase() === 'female').length;
                                                
                                                if (maleCount === 0 && femaleCount === 0) {
                                                    return <p className="text-muted text-center">No gender data available</p>;
                                                }
                                                
                                                const genderData = [
                                                    { name: 'Male', value: maleCount, color: '#60a5fa' },
                                                    { name: 'Female', value: femaleCount, color: '#f472b6' }
                                                ].filter(d => d.value > 0);
                                                
                                                return (
                                                    <ResponsiveContainer width="100%" height={250}>
                                                        <PieChart>
                                                            <Pie
                                                                data={genderData}
                                                                cx="40%"
                                                                cy="50%"
                                                                labelLine={false}
                                                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                                outerRadius={70}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                            >
                                                                {genderData.map((entry, index) => (
                                                                    <Cell key={`teacher-gender-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip 
                                                                contentStyle={{ backgroundColor: '#1a1a20', border: '1px solid #333' }}
                                                                labelStyle={{ color: '#fff' }}
                                                            />
                                                            <Legend layout="vertical" align="left" verticalAlign="middle" wrapperStyle={{ paddingLeft: '20px' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* User Table */}
                                <div className="mt-3" style={{ background: '#1a1a20', borderRadius: '8px', padding: '20px' }}>
                                    <h4 className="text-white mb-3">📋 All Users ({users.filter(u => u.role !== 'administrator').length})</h4>
                                    {console.log('Filtered users:', users.filter(u => u.role !== 'administrator'))}
                                    <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #444' }}>
                                    <table className="table table-dark table-striped table-hover mb-0">
                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#212529', zIndex: 10 }}>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Gender</th>
                                                <th>Channels</th>
                                                <th>Materials</th>
                                                <th>Joined</th>
                                                <th>Warnings</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.filter(u => u.role !== 'administrator').map((user) => (
                                                <tr key={user.id}>
                                                    <td>{user.name}</td>
                                                    <td className="small">{user.email}</td>
                                                    <td>
                                                        <span className={`badge ${
                                                            user.role === 'administrator' ? 'bg-danger' :
                                                            user.role === 'teacher' ? 'bg-primary' : 'bg-success'
                                                        }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge" style={{
                                                            backgroundColor: (user.gender || '').toLowerCase() === 'male' ? '#0dcaf0' : 
                                                                           (user.gender || '').toLowerCase() === 'female' ? '#f472b6' : '#dc3545',
                                                            color: '#fff'
                                                        }}>
                                                            {user.gender || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td>{user.channel_count}</td>
                                                    <td>{user.material_count}</td>
                                                    <td className="small">{new Date(user.created_at).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</td>
                                                    <td>
                                                        {editingComment === user.id ? (
                                                            <div className="d-flex gap-1">
                                                                <textarea
                                                                    className="form-control form-control-sm"
                                                                    value={commentText}
                                                                    onChange={(e) => setCommentText(e.target.value)}
                                                                    placeholder="Add warning message (e.g., Inappropriate content, Policy violation)..."
                                                                    rows="2"
                                                                    style={{ minWidth: '250px' }}
                                                                />
                                                                <button 
                                                                    className="btn btn-sm btn-success"
                                                                    onClick={() => handleSaveComment(user.id)}
                                                                >
                                                                    ✓
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-secondary"
                                                                    onClick={() => {
                                                                        setEditingComment(null);
                                                                    setCommentText('');
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex gap-2 align-items-center">
                                                            {user.admin_comment && (
                                                                <span className="badge bg-warning text-dark" title={user.admin_comment}>
                                                                    ⚠️ {user.admin_comment.substring(0, 20)}...
                                                                </span>
                                                            )}
                                                            {!user.admin_comment && (
                                                                <span className="text-muted small">—</span>
                                                            )}
                                                            <button 
                                                                className="btn btn-sm btn-outline-warning"
                                                                onClick={() => {
                                                                    setEditingComment(user.id);
                                                                    setCommentText(user.admin_comment || '');
                                                                }}
                                                                title="Add or edit warning"
                                                            >
                                                                ⚠️
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button 
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Download History Modal */}
            {showDownloadsModal && (
                <div className="popup-backdrop" onClick={() => setShowDownloadsModal(false)}>
                    <div className="card p-4" style={{ minWidth: "1000px", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="text-white mb-0">Download History</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowDownloadsModal(false)}
                            ></button>
                        </div>

                        {loadingDownloads ? (
                            <div className="text-center text-white">Loading downloads...</div>
                        ) : downloads.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <h5>No downloads yet</h5>
                                <p>Download history will appear here once users start downloading materials.</p>
                            </div>
                        ) : (
                            <>
                                {/* Download Activity Bar Chart */}
                                {downloadsByDate.length > 0 && (
                                    <div className="mb-4 p-3" style={{ background: '#1a1a20', borderRadius: '8px' }}>
                                        <h5 className="text-white mb-3">Download Activity (Last 30 Days)</h5>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={downloadsByDate.map(d => ({
                                                date: new Date(d.date).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', month: 'short', day: 'numeric' }),
                                                downloads: d.count
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                <XAxis 
                                                    dataKey="date" 
                                                    stroke="#999"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={80}
                                                />
                                                <YAxis stroke="#999" />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1a1a20', border: '1px solid #333' }}
                                                    labelStyle={{ color: '#fff' }}
                                                />
                                                <Bar dataKey="downloads" fill="#a855f7" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Download History Table */}
                                <div className="table-responsive">
                                    <table className="table table-dark table-striped">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>User</th>
                                                <th>Role</th>
                                                <th>Material</th>
                                                <th>File</th>
                                                <th>Channel</th>
                                            </tr>
                                    </thead>
                                    <tbody>
                                        {downloads.map((download) => (
                                            <tr key={download.id}>
                                                <td className="small">{new Date(download.download_date).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td>
                                                <td>
                                                    <div>{download.user_name}</div>
                                                    <div className="small text-muted">{download.user_email}</div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${
                                                        download.user_role === 'teacher' ? 'bg-primary' : 'bg-success'
                                                    }`}>
                                                        {download.user_role}
                                                    </span>
                                                </td>
                                                <td>{download.material_title}</td>
                                                <td className="small text-muted">{download.file_name}</td>
                                                <td>{download.channel_name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* All Channels Modal */}
            {showAllChannelsModal && (
                <div className="popup-backdrop" onClick={() => setShowAllChannelsModal(false)}>
                    <div className="card p-4" style={{ minWidth: "1000px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="text-white mb-0">All Channels ({allChannels.length})</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowAllChannelsModal(false)}
                            ></button>
                        </div>

                        {loadingAllChannels ? (
                            <div className="text-center text-white">Loading channels...</div>
                        ) : allChannels.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <h5>No channels found</h5>
                                <p>Channels will appear here once teachers create them.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-dark table-striped table-hover">
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#212529', zIndex: 10 }}>
                                        <tr>
                                            <th>Title</th>
                                            <th>Teacher</th>
                                            <th>Status</th>
                                            <th>Privacy</th>
                                            <th>Members</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allChannels.map((channel) => (
                                            <tr key={channel.id}>
                                                <td className="fw-semibold">
                                                    <Link to={`/channels/${channel.id}`} className="text-primary text-decoration-none">
                                                        {channel.title}
                                                    </Link>
                                                </td>
                                                <td>{channel.teacher_name || 'Unknown'}</td>
                                                <td>
                                                    <span className={`badge ${
                                                        channel.status === 'approved' ? 'bg-success' :
                                                        channel.status === 'pending' ? 'bg-warning text-dark' :
                                                        'bg-danger'
                                                    }`}>
                                                        {channel.status?.charAt(0).toUpperCase() + channel.status?.slice(1)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${Number(channel.is_private) === 1 ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                        {Number(channel.is_private) === 1 ? 'Private' : 'Public'}
                                                    </span>
                                                </td>
                                                <td>{channel.subscriber_count || 0}</td>
                                                <td className="small text-muted">{new Date(channel.created_at).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* All Materials Modal */}
            {showAllMaterialsModal && (
                <div className="popup-backdrop" onClick={() => setShowAllMaterialsModal(false)}>
                    <div className="card p-4" style={{ minWidth: "1100px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="text-white mb-0">All Materials ({allMaterials.length})</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowAllMaterialsModal(false)}
                            ></button>
                        </div>

                        {loadingAllMaterials ? (
                            <div className="text-center text-white">Loading materials...</div>
                        ) : allMaterials.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <h5>No materials found</h5>
                                <p>Materials will appear here once teachers upload them.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-dark table-striped table-hover">
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#212529', zIndex: 10 }}>
                                        <tr>
                                            <th>File Name</th>
                                            <th>Title</th>
                                            <th>Channel</th>
                                            <th>Uploader</th>
                                            <th>Status</th>
                                            <th>Size</th>
                                            <th>Uploaded</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allMaterials.map((material) => (
                                            <tr key={material.id}>
                                                <td className="small text-muted">{material.file_name}</td>
                                                <td className="fw-semibold">{material.title || 'Untitled'}</td>
                                                <td>{material.channel_title || 'Unknown'}</td>
                                                <td>{material.uploader_name || 'Unknown'}</td>
                                                <td>
                                                    <span className={`badge ${
                                                        material.status === 'approved' ? 'bg-success' :
                                                        material.status === 'pending' ? 'bg-warning text-dark' :
                                                        'bg-danger'
                                                    }`}>
                                                        {material.status?.charAt(0).toUpperCase() + material.status?.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="small text-muted">{material.file_size ? (material.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                                                <td className="small text-muted">{new Date(material.created_at).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showStudentPendingRequestsModal && (
                <div className="popup-backdrop" onClick={() => setShowStudentPendingRequestsModal(false)}>
                    <div className="card p-4" style={{ minWidth: "700px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="text-white mb-0">Pending Access Requests ({studentPendingRequests.length})</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={() => setShowStudentPendingRequestsModal(false)}
                            ></button>
                        </div>

                        {loadingStudentRequests ? (
                            <div className="text-center text-white">Loading requests...</div>
                        ) : studentPendingRequests.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <h5>No pending requests</h5>
                                <p>All your access requests have been processed or approved.</p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {studentPendingRequests.map((request) => (
                                    <div key={request.id} className="p-3" style={{ background: "#1a1a20", borderRadius: "8px", border: "1px solid #333" }}>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div className="flex-grow-1">
                                                <h5 className="text-white mb-1">{request.channel_title}</h5>
                                                <p className="text-muted small mb-0">
                                                    Requested: {new Date(request.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                                </p>
                                            </div>
                                            <span className="badge bg-warning text-dark">PENDING</span>
                                        </div>
                                        <p className="text-muted small">
                                            Your access request is awaiting teacher approval. Once approved, you'll be able to join the channel.
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>
            )}
        </div>
    );
}

