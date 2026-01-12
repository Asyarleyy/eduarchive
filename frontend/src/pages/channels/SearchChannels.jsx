import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function SearchChannels() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setSearching(true);
    setHasSearched(true);
    try {
      const res = await axios.get("/api/channels/search", { params: { q: searchTerm } });
      setSearchResults(res.data || []);
    } catch (err) {
      console.error("Search failed", err);
      alert("Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="py-5">
      <div className="container">
        <div className="mb-5">
          <h1 className="h3 fw-bold text-white mb-4">Search Public Channels</h1>

          <form onSubmit={handleSearch} className="mb-4">
            <div className="input-group input-group-lg">
              <input
                type="text"
                className="form-control"
                placeholder="Search by channel name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {hasSearched && (
            <>
              {searchResults.length === 0 ? (
                <div className="card">
                  <div className="card-body text-center text-muted">
                    <p>No channels found matching "{searchTerm}"</p>
                    <p className="small mb-0">Try a different search term</p>
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="text-white mb-3">Results ({searchResults.length})</h4>
                  <div className="row g-4">
                    {searchResults.map((channel) => (
                      <div key={channel.id} className="col-md-6 col-lg-4">
                        <div className="card h-100">
                          <div className="card-body d-flex flex-column">
                            <h5 className="card-title text-white">{channel.title}</h5>
                            <p className="card-text text-muted small flex-grow-1">
                              {channel.description || "No description"}
                            </p>
                            <button
                              className="btn btn-primary btn-sm mt-3"
                              onClick={() => navigate(`/channels/${channel.id}`)}
                            >
                              View Channel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
