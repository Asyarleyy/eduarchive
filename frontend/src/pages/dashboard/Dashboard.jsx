import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

export default function Dashboard() {
    const { user } = useAuth();
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [latestAnnouncement, setLatestAnnouncement] = useState(null);
    const [showPopup, setShowPopup] = useState(false);

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
    
    const fetchLatestAnnouncement = async () => {
        try {
            const res = await axios.get("/api/announcements/unread");
            if (res.data) {
                setLatestAnnouncement(res.data);
                setShowPopup(true);
            }
        } catch (err) {
            console.error("Announcement load failed");
        }
    };

    useEffect(() => {
        if (user) {
            fetchChannels();
            if (user.role === 'student') {
                fetchLatestAnnouncement();
            }
        }
    }, [user]);

    const fetchJoinedChannels = async () => {
        try {
            const response = await axios.get('/api/channels/joined');
            setChannels(response.data);
        } catch (error) {
            console.error('Error fetching joined channels:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-5">
            <div className="container">
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
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="h4 fw-semibold text-white">My Teaching Channels</h3>
                            <Link to="/channels/create" className="btn btn-primary">
                                + Create New Channel
                            </Link>
                        </div>

                        {loading ? (
                            <div className="text-white">Loading...</div>
                        ) : channels.length === 0 ? (
                            <div className="card">
                                <div className="card-body text-center text-muted">
                                    <p>You haven't created any channels yet.</p>
                                    <p className="small mb-0">
                                        Create a channel to start sharing notes and exercises.
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
                ) : (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="h4 fw-semibold text-white">My Study Channels</h3>
                            <Link to="/join" className="btn btn-primary">
                                + Join Channel
                            </Link>
                        </div>

                        {loading ? (
                            <div className="text-white">Loading...</div>
                        ) : channels.length === 0 ? (
                            <div className="card">
                                <div className="card-body text-center text-muted">
                                    <p>You haven't joined any channels yet.</p>
                                    <p className="small mb-3">
                                        Find a teacher's channel to access their materials.
                                    </p>
                                    <Link to="/join" className="btn btn-primary btn-sm">+ Join Channel</Link>
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
            </div>
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


        </div>
    );
}

