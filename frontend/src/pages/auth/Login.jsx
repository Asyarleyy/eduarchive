import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        const result = await login(email, password);

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
                <h2 className="h3 fw-bold">Login</h2>
                <p className="mb-0 small">Welcome back!</p>
            </div>
            <div className="auth-body">
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {errors.email && (
                            <div className="text-danger small mt-1">{errors.email[0]}</div>
                        )}
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {errors.password && (
                            <div className="text-danger small mt-1">{errors.password[0]}</div>
                        )}
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
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="mt-4 text-center text-muted small">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-decoration-none" style={{ color: '#8b5cf6' }}>
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}

