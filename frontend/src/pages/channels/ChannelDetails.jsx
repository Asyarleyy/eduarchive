import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

export default function ChannelShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [channel, setChannel] = useState(null);
  const [materials, setMaterials] = useState([]); // This will be filled from the channel object
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState([]);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAccessRequests, setShowAccessRequests] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [rejectReasonInputs, setRejectReasonInputs] = useState({});

  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editMaterial, setEditMaterial] = useState(null);
const [editForm, setEditForm] = useState({
  title: "",
  description: ""
});


  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    file: null,
  });
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);

  const [announcements, setAnnouncements] = useState([]);
  const [editAnnouncementId, setEditAnnouncementId] = useState(null);
  const [announcementEditForm, setAnnouncementEditForm] = useState({ title: "", message: "" });
const [newAnnouncement, setNewAnnouncement] = useState({
  title: "",
  message: ""
});
const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [isJoined, setIsJoined] = useState(false);


  // ================= LOAD DATA =================
  useEffect(() => {
    fetchChannelAndMaterials();
    fetchMaterials();
    fetchAnnouncements();
    fetchJoinedStatus();
  }, [id]);

  const fetchChannelAndMaterials = async () => {
    try {
      // 🟢 This one call now returns BOTH channel details and the materials array
      const res = await axios.get(`/api/channels/${id}`);
      setChannel(res.data);
      setMaterials(res.data.materials || []); // Extract materials from the main object
    } catch (err) {
      console.error("Data load error");
    } finally {
      setLoading(false);
    }
  };

  // Separate materials fetch used by upload/delete/update flows
  const fetchMaterials = async () => {
    try {
      const res = await axios.get(`/api/channels/${id}/materials`);
      setMaterials(res.data);
    } catch (err) {
      console.error('Materials load error', err);
    }
  };

  const fetchAnnouncements = async () => {
  try {
    const res = await axios.get(`/api/channels/${id}/announcements`);
    setAnnouncements(res.data);
  } catch {
    console.error("Announcements load error");
  }
};

  const fetchJoinedStatus = async () => {
    try {
      const res = await axios.get('/api/channels/joined');
      const joinedIds = (res.data || []).map(c => c.id);
      setIsJoined(joinedIds.includes(Number(id)));
    } catch (err) {
      console.error('Joined status load error', err);
    }
  };

  const canDownload = !(
    channel && Number(channel.is_private) === 1 && user?.role === 'student' && !isJoined
  );

const createAnnouncement = async (e) => {
  e.preventDefault();

  try {
    await axios.post(`/api/channels/${id}/announcements`, newAnnouncement);
    alert("Announcement posted!");
    setShowAnnouncementForm(false);
    setNewAnnouncement({ title: "", message: "" });
    fetchAnnouncements();
  } catch {
    alert("Failed to post announcement");
  }
};

// ===== ANNOUNCEMENT ACTIONS =====
const startEditAnnouncement = (a) => {
  setEditAnnouncementId(a.id);
  setAnnouncementEditForm({ title: a.title, message: a.message });
};

const saveAnnouncementEdit = async (e) => {
  e.preventDefault();
  try {
    await axios.put(`/api/announcements/${editAnnouncementId}`, announcementEditForm);
    setEditAnnouncementId(null);
    setAnnouncementEditForm({ title: "", message: "" });
    fetchAnnouncements();
  } catch {
    alert("Update failed");
  }
};

const deleteAnnouncement = async (aid) => {
  if (!window.confirm("Delete this announcement?")) return;
  try {
    await axios.delete(`/api/announcements/${aid}`);
    fetchAnnouncements();
  } catch {
    alert("Delete failed");
  }
};

// Pin feature removed per request


  const fetchMembers = async () => {
    try {
      const res = await axios.get(`/api/channels/${id}/members`);
      setMembers(res.data);
    } catch {
      console.error("Members load error");
    }
  };

  const fetchAccessRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await axios.get(`/api/channels/${id}/access-requests`);
      setAccessRequests(res.data || []);
    } catch (err) {
      console.error("Access requests load error", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const approveAccessRequest = async (requestId) => {
    try {
      await axios.post(`/api/access-requests/${requestId}/approve`);
      await fetchAccessRequests();
      await fetchMembers();
    } catch (err) {
      alert(err?.response?.data?.error || "Approve failed");
    }
  };

  const rejectAccessRequest = async (requestId) => {
    try {
      const reason = rejectReasonInputs[requestId] || "";
      await axios.post(`/api/access-requests/${requestId}/reject`, { reason });
      await fetchAccessRequests();
    } catch (err) {
      alert(err?.response?.data?.error || "Reject failed");
    }
  };

  // ================= CHANNEL =================
  const deleteChannel = async () => {
    if (!window.confirm("Delete this channel permanently?")) return;

    try {
      await axios.delete(`/api/channels/${id}`);
      alert("Channel deleted");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error('Delete error:', err);
      const errorMsg = err.response?.data?.error || 'Delete failed';
      alert(errorMsg);
    }
  };

  // ================= STUDENTS =================
  const removeStudent = async (uid) => {
    if (!window.confirm("Remove this student?")) return;

    try {
      await axios.delete(`/api/channels/${id}/members/${uid}`);
      fetchMembers();
    } catch {
      alert("Failed to remove");
    }
  };

  const leaveChannel = async () => {
    if (!window.confirm("Are you sure you want to leave this channel?")) return;

    try {
      await axios.post(`/api/channels/${id}/leave`);
      alert("You have left the channel");
      setIsJoined(false);
      navigate('/channels');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to leave channel');
    }
  };

  // ================= UPLOAD =================
  const handleUpload = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const formData = new FormData();
formData.append("title", uploadForm.title);
formData.append("description", uploadForm.description);
formData.append("file", uploadForm.file);

    try {
      await axios.post(`/api/channels/${id}/materials`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowUploadForm(false);
      setUploadForm({ title: "", description: "", file: null });
      fetchMaterials();
    } catch (err) {
      console.error('UPLOAD ERROR', err);
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Upload failed';
      alert(`Upload failed: ${message}`);
    }
  };

  // ================= MATERIAL ACTIONS =================
  const handleDownload = async (mat) => {
    if (!canDownload) {
      alert('Join this private channel to download materials.');
      return;
    }
    try {
      const res = await axios.get(`/api/materials/${mat.id}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = mat.file_name;
      a.click();
    } catch {
      alert("Download failed");
    }
  };

  const deleteMaterial = async (id) => {
    if (!window.confirm("Delete material?")) return;

    try {
      await axios.delete(`/api/materials/${id}`);
      fetchMaterials();
      setPreviewMaterial(null);
    } catch {
      alert("Delete failed");
    }
  };

  // Load preview via authenticated fetch and serve as blob URL to iframe
  useEffect(() => {
    let activeUrl = null;
    const loadPreview = async () => {
      if (!previewMaterial) return setPreviewUrl(null);

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

  // Cleanup upload preview object URL when it changes/unmounts
  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(uploadPreviewUrl);
        setUploadPreviewUrl(null);
      }
    };
  }, [uploadPreviewUrl]);

  const openEdit = (m) => {
  setEditMaterial(m);
  setEditForm({
    title: m.title,
    description: m.description || ""
  });
};

const updateMaterial = async (e) => {
  e.preventDefault();

  try {
    const formData = new FormData();
    formData.append("title", editForm.title);
    formData.append("description", editForm.description);

    const fileWasReplaced = !!editForm.file;
    if (fileWasReplaced) {
      formData.append("file", editForm.file);
    }

    const res = await axios.post(`/api/materials/${editMaterial.id}/update`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const updated = res.data?.material || null;

    // If preview is open and it's the same material, refresh the details and file preview
    if (previewMaterial && updated && previewMaterial.id === updated.id) {
      // Revoke old blob URL if file changed to force reload
      if (fileWasReplaced && previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch {}
      }
      setPreviewUrl(null);
      setPreviewMaterial(updated);
    }

    alert("Material updated successfully");
    setEditMaterial(null);
    fetchMaterials();

  } catch (err) {
    console.error(err);
    alert("Update failed");
  }
};



  if (loading) return <div className="text-white p-5">Loading...</div>;

  return (
    <div className="py-5">
      <div className="container">

        <button
          className="btn btn-outline-secondary mb-3"
          onClick={() => {
            if (location.state?.fromSearch) {
              navigate(-1);
            } else if (location.state?.fromSearchModal) {
              navigate(location.state.returnTo || '/dashboard', {
                state: {
                  reopenSearchModal: true,
                  searchTerm: location.state.searchTerm || ''
                }
              });
            } else {
              navigate('/channels');
            }
          }}
        >
          Back
        </button>

        {/* ================= CHANNEL HEADER ================= */}
        {channel && (
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                <h2 className="text-white mb-0">{channel.title}</h2>
                <span className={`badge ${Number(channel.is_private) === 1 ? 'bg-warning text-dark' : 'bg-success'}`}>
                  {Number(channel.is_private) === 1 ? 'Private' : 'Public'}
                </span>
              </div>
              <p className="text-muted">{channel.description}</p>

              {user?.role === "teacher" && (
                <>
                  <button className="btn btn-danger me-2" onClick={deleteChannel}>
                    Delete Channel
                  </button>

                  <button className="btn btn-primary me-2" onClick={() => setShowCodePopup(true)}>
                    Show Access Code
                  </button>

                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      fetchMembers();
                      setShowMembers(true);
                    }}
                  >
                    View Students
                  </button>

                  <button
                    className="btn btn-outline-warning ms-2"
                    onClick={() => {
                      fetchAccessRequests();
                      setShowAccessRequests(true);
                    }}
                  >
                    Access Requests
                  </button>
                </>
              )}

              {/* Leave Channel Button for Students */}
              {user?.role === "student" && isJoined && (
                <button 
                  className="btn"
                  style={{ backgroundColor: '#dc3545', color: 'white', fontWeight: 'bold' }}
                  onClick={leaveChannel}
                >
                  Leave Channel
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= UPLOAD ================= */}
        {user?.role === "teacher" && (
          <div className="mb-4">
            <button
              className="btn btn-primary"
              onClick={() => setShowUploadForm(!showUploadForm)}
            >
              {showUploadForm ? "Cancel Upload" : "+ Upload Material"}
            </button>

            {showUploadForm && (
              <div className="card mt-3">
                <div className="card-body">
                  <form onSubmit={handleUpload}>
                    <label className="form-label">Title</label>
                    <input
                      className="form-control mb-3"
                      value={uploadForm.title}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, title: e.target.value })
                      }
                      required
                    />

                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control mb-3"
                      rows={3}
                      value={uploadForm.description}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, description: e.target.value })
                      }
                    />

                    <label className="form-label">File</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, file: e.target.files[0] })
                      }
                      required
                    />

                    <div className="mt-3">
                      <button type="button" className="btn btn-secondary me-2" onClick={() => {
                        if (!uploadForm.file) return alert('Please select a file first');
                        // create preview for the selected file
                        if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
                        const url = URL.createObjectURL(uploadForm.file);
                        setUploadPreviewUrl(url);
                        setPreviewMaterial(null);
                      }}>
                        Preview
                      </button>

                      <button className="btn btn-primary" type="submit">Upload</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= MATERIALS ================= */}
        <h4 className="text-white mb-3">Materials</h4>

        {materials.length === 0 ? (
          <div className="card">
            <div className="card-body text-muted text-center">
              No materials yet
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {materials.map((m) => (
              <div key={m.id} className="col-md-6 col-lg-4">
                <div
                  className="card h-100"
                  style={{ cursor: "pointer" }}
                  onClick={() => setPreviewMaterial(m)}
                >
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h5 className="text-white" style={{ margin: 0 }}>{m.title}</h5>
                      {user?.role === 'teacher' && (
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              m.status === 'approved'
                                ? '#22c55e'
                                : m.status === 'pending'
                                ? '#f59e0b'
                                : '#ef4444',
                            color: 'white',
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.5rem',
                            whiteSpace: 'nowrap',
                            marginLeft: '0.5rem'
                          }}
                        >
                          {m.status?.charAt(0).toUpperCase() + m.status?.slice(1) || 'Pending'}
                        </span>
                      )}
                    </div>
                    <p className="text-muted small">{m.description}</p>
                    {user?.role === 'teacher' && m.status === 'rejected' && m.rejection_reason && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#1a1a20', borderLeft: '3px solid #ef4444', borderRadius: '4px' }}>
                        <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>Rejection Reason:</p>
                        <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>{m.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(user?.role === "teacher" || isJoined) && (
          <>
            <h4 className="text-white mt-5">Announcements</h4>

            {user?.role === "teacher" && (
              <>
                <button
                  className="btn btn-primary mb-3"
                  onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                >
                  {showAnnouncementForm ? "Cancel" : "+ New Announcement"}
                </button>

                {showAnnouncementForm && (
                  <div className="card mb-3">
                    <div className="card-body">
                      <form onSubmit={createAnnouncement}>
                        <input
                          className="form-control mb-2"
                          placeholder="Title"
                          value={newAnnouncement.title}
                          onChange={(e) =>
                            setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                          }
                          required
                        />

                        <textarea
                          className="form-control mb-2"
                          rows={3}
                          placeholder="Message"
                          value={newAnnouncement.message}
                          onChange={(e) =>
                            setNewAnnouncement({ ...newAnnouncement, message: e.target.value })
                          }
                          required
                        />

                        <button className="btn btn-primary">Post</button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}

            {announcements.length === 0 ? (
              <div className="card">
                <div className="card-body text-muted">
                  No announcements yet.
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body">
                  {announcements.map(a => (
                    <div key={a.id} className="mb-3 border-bottom pb-2">
                      {editAnnouncementId === a.id ? (
                        <form onSubmit={saveAnnouncementEdit}>
                          <input
                            className="form-control mb-2"
                            value={announcementEditForm.title}
                            onChange={(e) => setAnnouncementEditForm({ ...announcementEditForm, title: e.target.value })}
                            required
                          />
                          <textarea
                            className="form-control mb-2"
                            rows={3}
                            value={announcementEditForm.message}
                            onChange={(e) => setAnnouncementEditForm({ ...announcementEditForm, message: e.target.value })}
                            required
                          />
                          <div className="d-flex gap-2">
                            <button className="btn btn-primary btn-sm">Save</button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditAnnouncementId(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="d-flex justify-content-between align-items-center">
                            <h5 className="text-white mb-1">{a.title}</h5>
                            <small className="text-muted">{new Date(a.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</small>
                          </div>
                          <p className="text-muted">{a.message}</p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">Posted by: {a.creator_name}</small>
                            {user?.role === "teacher" && (
                              <div className="d-flex gap-2">
                                <button className="btn btn-warning btn-sm" onClick={() => startEditAnnouncement(a)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteAnnouncement(a.id)}>Delete</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}



      </div>

      {/* ================= PREVIEW POPUP ================= */}
      {(previewMaterial || uploadPreviewUrl) && (
        <div className="popup-backdrop">
          <div className="card p-4" style={{ minWidth: "900px" }}>
            <div className="row">

              {/* LEFT PREVIEW */}
              <div className="col-md-8">
                <h5 className="text-white mb-3">Preview</h5>

                {uploadPreviewUrl ? (
                  <iframe
                    src={uploadPreviewUrl}
                    width="100%"
                    height="500px"
                    title="Preview"
                    style={{ borderRadius: "10px", background: "#000" }}
                  ></iframe>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    width="100%"
                    height="500px"
                    title="Preview"
                    style={{ borderRadius: "10px", background: "#000" }}
                  ></iframe>
                ) : (
                  <div className="text-muted">Loading preview...</div>
                )}
              </div>

              {/* RIGHT PANEL */}
              <div className="col-md-4">
                <h4 className="text-white">{uploadPreviewUrl ? uploadForm.title : previewMaterial?.title}</h4>
                <p className="text-muted">{uploadPreviewUrl ? uploadForm.description : previewMaterial?.description}</p>

                {uploadPreviewUrl ? (
                  <>
                    <button
                      className="btn btn-secondary w-100"
                      onClick={() => {
                        if (uploadPreviewUrl) {
                          URL.revokeObjectURL(uploadPreviewUrl);
                          setUploadPreviewUrl(null);
                        }
                      }}
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-primary w-100 mb-2"
                      onClick={() => handleDownload(previewMaterial)}
                      disabled={!canDownload}
                      title={!canDownload ? "Join this private channel to download" : undefined}
                    >
                      Download
                    </button>

                    {user?.role === "teacher" && (
                      <>
                        <button
                          className="btn btn-danger w-100 mb-2"
                          onClick={() => deleteMaterial(previewMaterial.id)}
                        >
                          Delete
                        </button>
                        <button
                          className="btn btn-warning w-100 mb-2"
                          onClick={() => openEdit(previewMaterial)}
                        >
                          Edit
                        </button>
                      </>
                    )}

                    <button
                      className="btn btn-secondary w-100"
                      onClick={() => {
                        setPreviewMaterial(null);
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                        }
                      }}
                    >
                      Close
                    </button>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {editMaterial && (
  <div className="popup-backdrop">
    <div className="card p-4" style={{ minWidth: "450px" }}>
      <h4 className="text-white mb-3">Edit Material</h4>

      <form onSubmit={updateMaterial}>
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input
            className="form-control"
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
          />
        </div>

        <div className="mb-3">
          <label className="form-label">
            Replace File (optional)
          </label>
          <input
            type="file"
            className="form-control"
            onChange={(e) =>
              setEditForm({ ...editForm, file: e.target.files[0] })
            }
          />
          <small className="text-muted">
            Leave empty if you don't want to change the file.
          </small>
        </div>

        <button className="btn btn-primary me-2" type="submit">
          Save
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => setEditMaterial(null)}
          type="button"
        >
          Cancel
        </button>
      </form>
    </div>
  </div>
)}



      {showCodePopup && (
  <div className="popup-backdrop">
    {/* Added glass-card class for consistency */}
    <div className="card glass-card p-4 text-center" style={{ minWidth: "400px" }}>
      <h4 className="text-white mb-3">Channel Access Code</h4>

      <div className="fs-3 fw-bold text-white mb-3 font-monospace">
        {channel.access_code}
      </div>

      {/* 🟣 UPDATED: Added a container with d-flex, flex-column, and gap-3 */}
      <div className="d-flex flex-column gap-3 mt-4">
        <button
          className="btn btn-primary w-100" // Added w-100 for a professional full-width look
          onClick={() => {
            navigator.clipboard.writeText(channel.access_code);
            alert("Copied!");
          }}
        >
          Copy Code
        </button>

        <button
          className="btn btn-secondary w-100" // Added w-100 to match the top button
          onClick={() => setShowCodePopup(false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


{showMembers && (
  <div className="popup-backdrop">
    <div className="card p-4" style={{ minWidth: "500px" }}>
      <h4 className="text-white mb-3">
        Channel Members ({members.length})
      </h4>

      {members.length === 0 ? (
        <p className="text-muted">No students yet.</p>
      ) : (
        <ul className="list-group">
          {members.map((m) => (
            <li
              key={m.id}
              className="list-group-item d-flex justify-content-between align-items-center"
              style={{ background: "#1a1a20", borderColor: "#2c3245", color: "#ffffff" }}
            >
              <div>
                <strong>{m.name}</strong>
                <br />
                <small className="text-muted" style={{ color: "#cbd5e1" }}>{m.email}</small>
              </div>

              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeStudent(m.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        className="btn btn-secondary mt-3"
        onClick={() => setShowMembers(false)}
      >
        Close
      </button>
    </div>
  </div>
)}

{showAccessRequests && (
  <div className="popup-backdrop">
    <div className="card p-4" style={{ minWidth: "600px" }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="text-white mb-0">Access Requests</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowAccessRequests(false)}>✕</button>
      </div>

      {loadingRequests ? (
        <div className="text-white">Loading...</div>
      ) : accessRequests.length === 0 ? (
        <p className="text-muted">No pending requests.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {accessRequests.map((r) => (
            <div key={r.id} className="p-3" style={{ background: "#1a1a20", borderRadius: "8px", border: "1px solid #333" }}>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <strong className="text-white">{r.requester_name}</strong>
                  <div className="small text-muted">{r.requester_email}</div>
                  <div className="small text-muted">Requested: {new Date(r.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                </div>
                <span className="badge bg-warning text-dark">PENDING</span>
              </div>

              <div className="d-flex flex-column gap-2">
                <div className="d-flex gap-2">
                  <button className="btn btn-success btn-sm flex-fill" onClick={() => approveAccessRequest(r.id)}>Approve</button>
                  <button className="btn btn-danger btn-sm flex-fill" onClick={() => rejectAccessRequest(r.id)}>Reject</button>
                </div>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Reason for rejection (optional)"
                  value={rejectReasonInputs[r.id] || ''}
                  onChange={(e) => setRejectReasonInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}


    </div>
  );
}
