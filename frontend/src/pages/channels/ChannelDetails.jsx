import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

export default function ChannelShow() {
  const { id } = useParams();
  const { user } = useAuth();

  const [channel, setChannel] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const [previewMaterial, setPreviewMaterial] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    file: null,
  });

  // ================= LOAD DATA =================
  useEffect(() => {
    fetchChannel();
    fetchMaterials();
  }, [id]);

  const fetchChannel = async () => {
    try {
      const res = await axios.get(`/api/channels/${id}`);
      setChannel(res.data);
    } catch {
      console.error("Channel load error");
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await axios.get(`/api/channels/${id}/materials`);
      setMaterials(res.data);
    } catch {
      console.error("Materials load error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`/api/channels/${id}/members`);
      setMembers(res.data);
    } catch {
      console.error("Members load error");
    }
  };

  // ================= CHANNEL =================
  const deleteChannel = async () => {
    if (!window.confirm("Delete this channel permanently?")) return;

    try {
      await axios.delete(`/api/channels/${id}`);
      alert("Channel deleted");
      window.location.href = "/channels";
    } catch {
      alert("Delete failed");
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

  // ================= UPLOAD =================
  const handleUpload = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("description", uploadForm.description || "");
    formData.append("file", uploadForm.file);

    try {
      await axios.post(`/api/channels/${id}/materials`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowUploadForm(false);
      setUploadForm({ title: "", description: "", file: null });
      fetchMaterials();
    } catch {
      alert("Upload failed");
    }
  };

  // ================= MATERIAL ACTIONS =================
  const handleDownload = async (mat) => {
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

  if (loading) return <div className="text-white p-5">Loading...</div>;

  return (
    <div className="py-5">
      <div className="container">

        {/* ================= CHANNEL HEADER ================= */}
        {channel && (
          <div className="card mb-4">
            <div className="card-body">
              <h2 className="text-white">{channel.title}</h2>
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
                </>
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

                    <button className="btn btn-primary mt-3">Upload</button>
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
                    <h5 className="text-white">{m.title}</h5>
                    <p className="text-muted small">{m.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= PREVIEW POPUP ================= */}
      {previewMaterial && (
        <div className="popup-backdrop">
          <div className="card p-4" style={{ minWidth: "900px" }}>
            <div className="row">
              
              {/* LEFT PREVIEW */}
              <div className="col-md-8">
                <h5 className="text-white mb-3">Preview</h5>

                <iframe
                  src={`/api/materials/${previewMaterial.id}/preview`}
                  width="100%"
                  height="500px"
                  title="Preview"
                  style={{ borderRadius: "10px", background: "#000" }}
                ></iframe>
              </div>

              {/* RIGHT PANEL */}
              <div className="col-md-4">
                <h4 className="text-white">{previewMaterial.title}</h4>
                <p className="text-muted">{previewMaterial.description}</p>

                <button
                  className="btn btn-primary w-100 mb-2"
                  onClick={() => handleDownload(previewMaterial)}
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
                  </>
                )}

                <button
                  className="btn btn-secondary w-100"
                  onClick={() => setPreviewMaterial(null)}
                >
                  Close
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {showCodePopup && (
  <div className="popup-backdrop">
    <div className="card p-4 text-center" style={{ minWidth: "400px" }}>
      <h4 className="text-white mb-3">Channel Access Code</h4>

      <div className="fs-3 fw-bold text-white mb-3 font-monospace">
        {channel.access_code}
      </div>

      <button
        className="btn btn-primary me-2"
        onClick={() => {
          navigator.clipboard.writeText(channel.access_code);
          alert("Copied!");
        }}
      >
        Copy Code
      </button>

      <button
        className="btn btn-secondary"
        onClick={() => setShowCodePopup(false)}
      >
        Close
      </button>
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
            >
              <div>
                <strong>{m.name}</strong>
                <br />
                <small className="text-muted">{m.email}</small>
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


    </div>
  );
}
