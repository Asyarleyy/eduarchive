import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'student',
        school: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
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

        // Validate password confirmation
        if (formData.password !== formData.password_confirmation) {
            setErrors({ password: ['Passwords do not match'] });
            setLoading(false);
            return;
        }

        // Remove password_confirmation before sending
        const { password_confirmation, ...registerData } = formData;

        const result = await register(registerData);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setErrors(result.errors || {});
        }

        setLoading(false);
    };

    return (
        <div className="auth-card">
            <div className="auth-header">
                <h2 className="h3 fw-bold">Register</h2>
                <p className="mb-0 small">Create your account</p>
            </div>
            <div className="auth-body">
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Name</label>
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
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="form-control"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        {errors.email && (
                            <div className="text-danger small mt-1">{errors.email[0]}</div>
                        )}
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Role</label>
                        <select
                            name="role"
                            className="form-control"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                        {errors.role && (
                            <div className="text-danger small mt-1">{errors.role[0]}</div>
                        )}
                    </div>

                    <div className="mb-3">
                        <label className="form-label">School (Optional)</label>
                        <input
                            type="text"
                            name="school"
                            className="form-control"
                            value={formData.school}
                            onChange={handleChange}
                        />
                        {errors.school && (
                            <div className="text-danger small mt-1">{errors.school[0]}</div>
                        )}
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-control"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        {errors.password && (
                            <div className="text-danger small mt-1">{errors.password[0]}</div>
                        )}
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            name="password_confirmation"
                            className="form-control"
                            value={formData.password_confirmation}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {errors.general && (
                        <div className="alert alert-danger small mb-3">
                            {errors.general[0]}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <p className="mt-4 text-center text-muted small">
                    Already have an account?{' '}
                    <Link to="/login" className="text-decoration-none" style={{ color: '#8b5cf6' }}>
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}

