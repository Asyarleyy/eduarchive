import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ChannelCreate() {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const response = await axios.post('/api/channels', formData);
            navigate(`/channels/${response.data.id}`);
        } catch (error) {
            if (error.response?.data?.error) {
                setErrors({ name: [error.response.data.error] });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-5">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <h1 className="h2 fw-bold text-white mb-4">Create New Channel</h1>

                        <div className="card">
                            <div className="card-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Channel Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                        {errors.name && (
                                            <div className="text-danger small mt-1">{errors.name[0]}</div>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Description</label>
                                        <textarea
                                            name="description"
                                            className="form-control"
                                            rows="4"
                                            value={formData.description}
                                            onChange={handleChange}
                                        />
                                        {errors.description && (
                                            <div className="text-danger small mt-1">{errors.description[0]}</div>
                                        )}
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? 'Creating...' : 'Create Channel'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => navigate('/channels')}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

