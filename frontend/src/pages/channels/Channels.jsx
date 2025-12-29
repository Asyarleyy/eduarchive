import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Channels() {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChannels();
    }, []);

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

    return (
        <div className="py-5">
            <div className="container">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h2 fw-bold text-white">My Channels</h1>
                    <Link to="/channels/create" className="btn btn-primary">
                        + Create New Channel
                    </Link>
                </div>

                {loading ? (
                    <div className="text-white">Loading...</div>
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
                                        <p className="card-text text-muted small mb-3">{channel.description}</p>
                                        <div className="small text-muted">
                                            Access Code: <span className="text-white font-monospace" style={{ color: '#8b5cf6' }}>{channel.access_code}</span>
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

