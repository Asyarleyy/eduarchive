import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function StudentChannels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

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

          <Link to="/join" className="btn btn-primary">
            + Join New Channel
          </Link>
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
                <Link
                  to={`/channels/${channel.id}`}
                  className="card text-decoration-none h-100"
                >
                  <div className="card-body">
                    <h5 className="card-title text-white">{channel.title}</h5>
                    <p className="text-muted small mb-3">
                      {channel.description}
                    </p>
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
