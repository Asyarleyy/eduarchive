import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function StudentChannels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState({});
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    fetchJoinedChannels();
  }, []);

  const fetchJoinedChannels = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/channels/joined");
      setChannels(response.data || []);
    } catch (error) {
      console.error("Failed to load joined channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchPublicChannels = async (e) => {
    e && e.preventDefault();
    setSearchError("");
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults([]);
      setHasSearched(true);
      return;
    }
    setSearching(true);
    try {
      const res = await axios.get("/api/channels/search", { params: { q: term } });
      setSearchResults(res.data || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Search failed", err);
      setSearchError(err?.response?.data?.error || "Search failed");
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleRequestAccess = async (channelId) => {
    setRequestingAccess((prev) => ({ ...prev, [channelId]: true }));
    try {
      await axios.post(`/api/channels/${channelId}/request-access`);
      alert("Access request sent! Awaiting teacher approval.");
    } catch (err) {
      console.error("Request failed", err);
      alert(err?.response?.data?.error || "Request failed");
    } finally {
      setRequestingAccess((prev) => ({ ...prev, [channelId]: false }));
    }
  };

  return (
    <div className="py-5">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h2 fw-bold text-white">My Joined Channels</h1>
          <Link to="/join" className="btn btn-primary">
            + Join Channel
          </Link>
        </div>

        {loading ? (
          <div className="text-white">Loading...</div>
        ) : channels.length === 0 ? (
          <div className="card">
            <div className="card-body text-center text-muted">
              <p className="mb-1">You haven't joined any channels yet.</p>
              <p className="small mb-0">Find a teacher's channel to access their materials.</p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {channels.map((channel) => (
              <div key={channel.id} className="col-md-6 col-lg-4">
                <Link to={`/channels/${channel.id}`} className="card text-decoration-none h-100">
                  <div className="card-body">
                    <h5 className="card-title text-white">{channel.title}</h5>
                    <p className="text-muted small mb-0">{channel.description}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="card mt-4">
          <div className="card-body">
            <h4 className="text-white mb-3">Find Public Channels</h4>
            <form className="row g-2" onSubmit={searchPublicChannels}>
              <div className="col-md-8">
                <input
                  className="form-control"
                  placeholder="Search by channel name or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-4 d-flex gap-2">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={searching}
                  onClick={searchPublicChannels}
                >
                  {searching ? "Searching..." : "Search"}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSearchResults([]);
                    setHasSearched(false);
                    setSearchError("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            {searchError && <div className="text-danger small mt-2">{searchError}</div>}

            {searchResults.length > 0 && (
              <div className="row g-3 mt-3">
                {searchResults.map((c) => (
                  <div key={c.id} className="col-md-6 col-lg-4">
                    <div className="card h-100" style={{ background: "#1f2230", borderColor: "#2c3245" }}>
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <h5 className="card-title text-white mb-0">{c.title}</h5>
                          <span className={`badge ${Number(c.is_private) === 1 ? "bg-warning text-dark" : "bg-success"}`}>
                            {Number(c.is_private) === 1 ? "Private" : "Public"}
                          </span>
                        </div>
                        <p className="text-muted small mb-0 flex-grow-1">{c.description}</p>
                        <div className="d-flex gap-2 mt-3">
                          <Link
                            to={`/channels/${c.id}`}
                            state={{ fromSearch: true }}
                            className="btn btn-sm btn-outline-primary flex-fill"
                          >
                            View Channel
                          </Link>
                          {Number(c.is_private) === 1 ? (
                            <button
                              className="btn btn-sm btn-outline-primary flex-fill"
                              onClick={() => handleRequestAccess(c.id)}
                              disabled={requestingAccess[c.id]}
                            >
                              {requestingAccess[c.id] ? "Requesting..." : "Request Access"}
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary flex-fill"
                              onClick={async () => {
                                try {
                                  await axios.post(`/api/channels/${c.id}/join-public`);
                                  alert('Joined successfully');
                                  // navigate to channel view
                                  window.location.href = `/channels/${c.id}`;
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
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasSearched && searchResults.length === 0 && (
              <div className="text-muted mt-3">No channels found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
