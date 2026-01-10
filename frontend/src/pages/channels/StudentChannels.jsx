import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function StudentChannels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchJoinedChannels();
  }, []);

  const fetchJoinedChannels = async () => {
    try {
      const response = await axios.get("/api/channels/joined");
      setChannels(response.data);
    } catch (error) {
      console.error("Failed to load joined channels:", error);
      alert("Failed to load joined channels");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-5">
      <div className="container">

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h2 fw-bold text-white">My Joined Channels</h1>
          <div>
            <JoinModal open={showJoinModal} onClose={() => setShowJoinModal(false)} onJoined={fetchJoinedChannels} />
          </div>
          <button>
              Join By Code
            </button>

            <Link to="/join" className="btn btn-primary">
              + Join New Channel
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-white">Loading...</div>
        ) : channels.length === 0 ? (
          <div className="card">
            <div className="card-body text-center text-muted">
              You have not joined any channels yet.
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {channels.map((channel) => (
              <div key={channel.id} className="col-md-6 col-lg-4">
                <div>
                  <Link to="/join" className="btn btn-primary">
                    + Join Channel
                  </Link>
                </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
      
  );

}

// Inline join modal markup (rendered via state)
function JoinModal({ open, onClose, onJoined }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setCode("");
  }, [open]);

  const joinChannel = async (e) => {
    e && e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/channels/join', { invite_code: code });
      alert('Successfully joined channel');
      onJoined && onJoined();
      onClose && onClose();
    } catch (err) {
      console.error('Join failed:', err);
      alert(err?.response?.data?.error || 'Invalid access code');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="popup-backdrop">
      <div className="card p-4" style={{ minWidth: 420 }}>
        <h4 className="text-white mb-3">Join Channel by Access Code</h4>
        <form onSubmit={joinChannel}>
          <div className="mb-3">
            <label className="form-label">Access Code</label>
            <input className="form-control" value={code} onChange={e => setCode(e.target.value)} required />
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Joining...' : 'Join'}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
