import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

export default function Announcements() {
  const { id } = useParams(); // channel id
  const { user } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: ""
  });

  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, [id]);

  const loadAnnouncements = async () => {
    try {
      const res = await axios.get(`/api/channels/${id}/announcements`);
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  // ===== CREATE =====
  const createAnnouncement = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`/api/channels/${id}/announcements`, form);
      setForm({ title: "", message: "" });
      setShowCreate(false);
      loadAnnouncements();
    } catch (err) {
      alert("Failed to post");
    }
  };

  // ===== DELETE =====
  const deleteAnnouncement = async (aid) => {
    if (!window.confirm("Delete this announcement?")) return;

    try {
      await axios.delete(`/api/announcements/${aid}`);
      loadAnnouncements();
    } catch {
      alert("Failed to delete");
    }
  };

  // ===== PIN =====
  const togglePin = async (aid) => {
    try {
      await axios.put(`/api/announcements/${aid}/pin`);
      loadAnnouncements();
    } catch {
      alert("Failed");
    }
  };

  // ===== EDIT =====
  const startEdit = (a) => {
    setEditId(a.id);
    setForm({
      title: a.title,
      message: a.message
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(`/api/announcements/${editId}`, form);
      setEditId(null);
      setForm({ title: "", message: "" });
      loadAnnouncements();
    } catch {
      alert("Update failed");
    }
  };

  return (
    <div className="py-4">
      <div className="container">

        <h3 className="text-white mb-3">Channel Announcements</h3>

        {/* TEACHER CREATE */}
        {user?.role === "teacher" && (
          <div className="mb-3">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(!showCreate)}
            >
              {showCreate ? "Cancel" : "Create Announcement"}
            </button>

            {showCreate && (
              <div className="card mt-3">
                <div className="card-body">
                  <form onSubmit={createAnnouncement}>
                    <label className="form-label">Title</label>
                    <input
                      className="form-control mb-2"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      required
                    />

                    <label className="form-label">Message</label>
                    <textarea
                      className="form-control mb-2"
                      rows={3}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      required
                    />

                    <button className="btn btn-primary mt-2">
                      Post Announcement
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIST */}
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="card">
            <div className="card-body text-center text-muted">
              No announcements yet.
            </div>
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="card mb-3"
              style={{
                borderLeft: a.pinned ? "5px solid gold" : "5px solid transparent"
              }}
            >
              <div className="card-body">

                {editId === a.id ? (
                  <>
                    <input
                      className="form-control mb-2"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                    />

                    <textarea
                      className="form-control mb-2"
                      rows={3}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                    />

                    <button className="btn btn-primary me-2" onClick={saveEdit}>
                      Save
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <h5 className="text-white">
                      {a.title} {a.pinned && "📌"}
                    </h5>
                    <p className="text-muted">{a.message}</p>
                    <small className="text-muted">
                      Posted by: {a.creator_name}
                    </small>

                    {user?.role === "teacher" && (
                      <div className="mt-2">
                        <button
                          className="btn btn-warning btn-sm me-2"
                          onClick={() => startEdit(a)}
                        >
                          Edit
                        </button>

                        <button
                          className="btn btn-danger btn-sm me-2"
                          onClick={() => deleteAnnouncement(a.id)}
                        >
                          Delete
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => togglePin(a.id)}
                        >
                          {a.pinned ? "Unpin" : "Pin"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
