import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function CreateChannel() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: '',
        description: '',
        is_public: 0,
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post('/api/channels', {
                title: form.title,
                description: form.description,
                is_public: form.is_public,
            });

            alert("Channel created successfully!");
            navigate('/channels');   // go back to teacher channel list
        } catch (error) {
            console.error("Create channel error:", error);
            alert(error.response?.data?.message || "Failed to create channel");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-5">
            <div className="container">

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h2 fw-bold text-white">Create Channel</h1>
                    <Link to="/channels" className="btn btn-secondary">
                        Back
                    </Link>
                </div>

                <div className="card">
                    <div className="card-body">

                        <form onSubmit={handleSubmit}>
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

                            <div className="mb-3">
                                <label className="form-label">Visibility</label>
                                <select
                                    className="form-control"
                                    value={form.is_public}
                                    onChange={(e) =>
                                        setForm({ ...form, is_public: e.target.value })
                                    }
                                >
                                    <option value={0}>Private (Join Code Only)</option>
                                    <option value={1}>Public</option>
                                </select>
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
