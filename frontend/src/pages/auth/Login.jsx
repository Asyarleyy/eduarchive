import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotPassword, setForgotPassword] = useState('');
    const [forgotConfirm, setForgotConfirm] = useState('');
    const [forgotStep, setForgotStep] = useState(1); // 1 = email, 2 = password
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotError, setForgotError] = useState('');
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

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);

        try {
            // Step 1: Verify email exists
            if (forgotStep === 1) {
                const res = await axios.post('/api/auth/verify-email', { email: forgotEmail });
                if (res.data.exists) {
                    setForgotStep(2);
                    setShowForgotPassword(true);
                } else {
                    setForgotError('Email not found');
                }
            } 
            // Step 2: Reset password
            else if (forgotStep === 2) {
                if (forgotPassword !== forgotConfirm) {
                    setForgotError('Passwords do not match');
                    setForgotLoading(false);
                    return;
                }
                if (forgotPassword.length < 6) {
                    setForgotError('Password must be at least 6 characters');
                    setForgotLoading(false);
                    return;
                }
                
                const res = await axios.post('/api/auth/reset-by-email', { 
                    email: forgotEmail, 
                    newPassword: forgotPassword 
                });
                setForgotMessage('Password reset successfully!');
                setTimeout(() => {
                    setShowForgot(false);
                    setForgotStep(1);
                    setForgotEmail('');
                    setForgotPassword('');
                    setForgotConfirm('');
                    setShowForgotPassword(false);
                    setForgotMessage('');
                }, 1500);
            }
        } catch (err) {
            setForgotError(err.response?.data?.error || 'Failed to process request');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <>
        {!showForgot ? (
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
                        <label className="form-label mb-1">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, lineHeight: 1, color: '#888' }}
                                onClick={() => setShowPassword(p => !p)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.password && (
                            <div className="text-danger small mt-1">{errors.password[0]}</div>
                        )}
                    </div>

                    {errors.general && !errors.reason && (
                        <div className="alert alert-danger small mb-3">
                            {errors.general[0]}
                        </div>
                    )}

                    {errors.reason && (
                        <div className="alert small mb-3" style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}>
                            <strong>Account Deleted:</strong> {errors.reason}
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

                <p className="mt-3 text-center text-muted small">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none"
                        style={{ color: '#8b5cf6' }}
                        onClick={() => setShowForgot(true)}
                    >
                        Forgot password?
                    </button>
                </p>

                <p className="mt-4 text-center text-muted small">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-decoration-none" style={{ color: '#8b5cf6' }}>
                        Register
                    </Link>
                </p>
            </div>
        </div>
        ) : (
        <div className="auth-card">
                <div className="auth-header">
                    <h2 className="h3 fw-bold">Reset Password</h2>
                    <p className="mb-0 small">Enter your email and new password</p>
                </div>
                <div className="auth-body">
                    {forgotMessage ? (
                        <div className="alert alert-success mb-0">{forgotMessage}</div>
                    ) : (
                        <form onSubmit={handleForgotPassword}>
                            {forgotStep === 1 ? (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            required
                                            placeholder="Enter your email"
                                        />
                                    </div>

                                    {forgotError && (
                                        <div className="alert alert-danger small mb-3">{forgotError}</div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100"
                                        disabled={forgotLoading}
                                    >
                                        {forgotLoading ? 'Verifying...' : 'Next'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label mb-1">New Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-control"
                                                value={forgotPassword}
                                                onChange={(e) => setForgotPassword(e.target.value)}
                                                required
                                                placeholder="Enter new password"
                                            />
                                            <button
                                                type="button"
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, color: '#888' }}
                                                onClick={() => setShowPassword(p => !p)}
                                            >
                                                {showPassword ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label mb-1">Confirm Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-control"
                                                value={forgotConfirm}
                                                onChange={(e) => setForgotConfirm(e.target.value)}
                                                required
                                                placeholder="Confirm password"
                                            />
                                            <button
                                                type="button"
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, color: '#888' }}
                                                onClick={() => setShowPassword(p => !p)}
                                            >
                                                {showPassword ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>

                                    {forgotError && (
                                        <div className="alert alert-danger small mb-3">{forgotError}</div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100"
                                        disabled={forgotLoading}
                                    >
                                        {forgotLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </>
                            )}
                        </form>
                    )}

                    <p className="mt-3 text-center">
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-decoration-none text-muted"
                            onClick={() => {
                                setShowForgot(false);
                                setForgotStep(1);
                                setForgotEmail('');
                                setForgotPassword('');
                                setForgotConfirm('');
                                setShowForgotPassword(false);
                                setForgotMessage('');
                                setForgotError('');
                            }}
                        >
                            Back to Login
                        </button>
                    </p>
                </div>
            </div>
        )}
        </>
    );
}

