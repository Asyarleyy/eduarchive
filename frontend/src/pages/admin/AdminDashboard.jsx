import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import '../../css/admin.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('channels');
  const [pendingChannels, setPendingChannels] = useState([]);
  const [pendingMaterials, setPendingMaterials] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role?.toLowerCase() !== 'administrator') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch pending channels
  useEffect(() => {
    if (activeTab === 'channels') {
      fetchPendingChannels();
    }
  }, [activeTab]);

  // Fetch pending materials
  useEffect(() => {
    if (activeTab === 'materials') {
      fetchPendingMaterials();
    }
  }, [activeTab]);

  // Fetch reports
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  const fetchPendingChannels = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/channels/pending');
      setPendingChannels(response.data);
    } catch (error) {
      console.error('Error fetching pending channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingMaterials = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/materials/pending');
      setPendingMaterials(response.data);
    } catch (error) {
      console.error('Error fetching pending materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/reports/overview');
      const data = response.data || {};

      const toMap = (list, key) => {
        return (list || []).reduce((acc, row) => {
          if (row && row[key]) {
            acc[row[key]] = row.count || 0;
          }
          return acc;
        }, {});
      };

      const channelCounts = toMap(data.channelCounts, 'status');
      const materialCounts = toMap(data.materialCounts, 'status');
      const userCounts = toMap(data.userCounts, 'role');
      const totalDownloads = (data.downloadCounts || []).reduce(
        (sum, row) => sum + (row.downloads || 0),
        0
      );

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
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveChannel = async (channelId) => {
    try {
      await axios.post(`/api/admin/channels/${channelId}/approve`);
      await fetchPendingChannels();
    } catch (error) {
      console.error('Error approving channel:', error);
      alert('Failed to approve channel');
    }
  };

  const handleRejectChannel = async (channelId) => {
    try {
      const reason = rejectReason[`channel-${channelId}`] || '';
      await axios.post(`/api/admin/channels/${channelId}/reject`, { reason });
      setShowRejectModal(null);
      setRejectReason({});
      await fetchPendingChannels();
    } catch (error) {
      console.error('Error rejecting channel:', error);
      alert('Failed to reject channel');
    }
  };

  const handleApproveMaterial = async (materialId) => {
    try {
      await axios.post(`/api/admin/materials/${materialId}/approve`);
      await fetchPendingMaterials();
    } catch (error) {
      console.error('Error approving material:', error);
      alert('Failed to approve material');
    }
  };

  const handleRejectMaterial = async (materialId) => {
    try {
      const reason = rejectReason[`material-${materialId}`] || '';
      await axios.post(`/api/admin/materials/${materialId}/reject`, { reason });
      setShowRejectModal(null);
      setRejectReason({});
      await fetchPendingMaterials();
    } catch (error) {
      console.error('Error rejecting material:', error);
      alert('Failed to reject material');
    }
  };

  if (user?.role?.toLowerCase() !== 'administrator') {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          Pending Channels
        </button>
        <button
          className={`tab-button ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('materials')}
        >
          Pending Materials
        </button>
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'channels' && (
          <div className="tab-content">
            <h2>Pending Channels ({pendingChannels.length})</h2>
            {loading ? (
              <p>Loading...</p>
            ) : pendingChannels.length === 0 ? (
              <p className="empty-state">No pending channels</p>
            ) : (
              <div className="pending-list">
                {pendingChannels.map((channel) => (
                  <div key={channel.id} className="pending-item">
                    <div className="item-header">
                      <h3>{channel.title || channel.name}</h3>
                      <span className="teacher-badge">by {channel.teacher_name}</span>
                    </div>
                    <p className="item-description">{channel.description}</p>
                    <p className="item-meta">
                      Privacy: <strong>{Number(channel.is_private) === 1 ? 'Private' : 'Public'}</strong>
                    </p>
                    <div className="item-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleApproveChannel(channel.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => setShowRejectModal(`channel-${channel.id}`)}
                      >
                        Reject
                      </button>
                    </div>
                    {showRejectModal === `channel-${channel.id}` && (
                      <div className="reject-modal">
                        <textarea
                          placeholder="Reason for rejection (optional)..."
                          value={rejectReason[`channel-${channel.id}`] || ''}
                          onChange={(e) =>
                            setRejectReason({
                              ...rejectReason,
                              [`channel-${channel.id}`]: e.target.value,
                            })
                          }
                        />
                        <div className="modal-actions">
                          <button
                            className="btn-confirm"
                            onClick={() => handleRejectChannel(channel.id)}
                          >
                            Confirm Reject
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => {
                              setShowRejectModal(null);
                              setRejectReason({});
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="tab-content">
            <h2>Pending Materials ({pendingMaterials.length})</h2>
            {loading ? (
              <p>Loading...</p>
            ) : pendingMaterials.length === 0 ? (
              <p className="empty-state">No pending materials</p>
            ) : (
              <div className="pending-list">
                {pendingMaterials.map((material) => (
                  <div key={material.id} className="pending-item">
                    <div className="item-header">
                      <h3>{material.title || material.file_name}</h3>
                      <span className="channel-badge">in {material.channel_title || material.channel_name}</span>
                    </div>
                    <p className="item-description">{material.description || 'No description'}</p>
                    <p className="item-meta">
                      Type: <strong>{material.file_mime || material.file_name}</strong> | Teacher: <strong>{material.uploader_name || material.teacher_name}</strong>
                    </p>
                    <div className="item-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleApproveMaterial(material.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => setShowRejectModal(`material-${material.id}`)}
                      >
                        Reject
                      </button>
                    </div>
                    {showRejectModal === `material-${material.id}` && (
                      <div className="reject-modal">
                        <textarea
                          placeholder="Reason for rejection (optional)..."
                          value={rejectReason[`material-${material.id}`] || ''}
                          onChange={(e) =>
                            setRejectReason({
                              ...rejectReason,
                              [`material-${material.id}`]: e.target.value,
                            })
                          }
                        />
                        <div className="modal-actions">
                          <button
                            className="btn-confirm"
                            onClick={() => handleRejectMaterial(material.id)}
                          >
                            Confirm Reject
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => {
                              setShowRejectModal(null);
                              setRejectReason({});
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="tab-content">
            <h2>Reports Overview</h2>
            {loading ? (
              <p>Loading...</p>
            ) : !reports ? (
              <p className="empty-state">No reports available</p>
            ) : (
              <div className="reports-grid">
                <div className="report-card">
                  <div className="report-title">Channels</div>
                  <div className="report-stats">
                    <div className="stat">
                      <span className="stat-label">Pending</span>
                      <span className="stat-value pending">{reports.channelsPending || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Approved</span>
                      <span className="stat-value approved">{reports.channelsApproved || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Rejected</span>
                      <span className="stat-value rejected">{reports.channelsRejected || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <div className="report-title">Materials</div>
                  <div className="report-stats">
                    <div className="stat">
                      <span className="stat-label">Pending</span>
                      <span className="stat-value pending">{reports.materialsPending || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Approved</span>
                      <span className="stat-value approved">{reports.materialsApproved || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Rejected</span>
                      <span className="stat-value rejected">{reports.materialsRejected || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <div className="report-title">Users</div>
                  <div className="report-stats">
                    <div className="stat">
                      <span className="stat-label">Students</span>
                      <span className="stat-value">{reports.studentCount || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Teachers</span>
                      <span className="stat-value">{reports.teacherCount || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Admins</span>
                      <span className="stat-value">{reports.adminCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="report-card">
                  <div className="report-title">Activity</div>
                  <div className="report-stats">
                    <div className="stat">
                      <span className="stat-label">Total Downloads</span>
                      <span className="stat-value">{reports.totalDownloads || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Access Requests</span>
                      <span className="stat-value">{reports.pendingAccessRequests || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
