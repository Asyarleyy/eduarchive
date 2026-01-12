import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function CreateChannel() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    is_private: false,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.title,
        description: form.description,
        is_private: form.is_private ? 1 : 0
      };

      await axios.post('/api/channels', payload);

      alert("Channel created successfully!");
      navigate('/dashboard');

    } catch (error) {
      console.error("Create channel error:", error);
      alert(error.response?.data?.error || "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-5">
      <div className="container">

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h2 fw-bold text-white">Create Channel</h1>
          <Link to="/dashboard" className="btn btn-secondary">
            Back
          </Link>
        </div>

        <div className="card">
          <div className="card-body">

            <form onSubmit={handleSubmit}>

              {/* TITLE */}
              <div className="mb-3">
                <label className="form-label">Channel Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                ></textarea>
              </div>

              {/* PRIVACY SETTING */}
              <div className="mb-3">
                <label className="form-label">Channel Privacy</label>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="privacy"
                    id="privacyPublic"
                    checked={!form.is_private}
                    onChange={() => setForm({ ...form, is_private: false })}
                  />
                  <label className="form-check-label" htmlFor="privacyPublic">
                    <strong>Public</strong> - Students can find and join via search
                  </label>
                </div>
                <div className="form-check mt-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="privacy"
                    id="privacyPrivate"
                    checked={form.is_private}
                    onChange={() => setForm({ ...form, is_private: true })}
                  />
                  <label className="form-check-label" htmlFor="privacyPrivate">
                    <strong>Private</strong> - Students need access code to join
                  </label>
                </div>
                <small className="text-muted d-block mt-2">
                  {form.is_private 
                    ? "An access code will be generated. Share it with students to allow them to join."
                    : "Anyone can search and join this channel directly."}
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Channel"}
              </button>

            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
