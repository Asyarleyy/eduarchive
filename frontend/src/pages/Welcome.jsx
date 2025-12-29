import React from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
    return (
        <div className="min-h-screen d-flex align-items-center justify-content-center" style={{ background: '#0f0f14', minHeight: '100vh' }}>
            <div className="text-center">
                <h1 className="display-4 fw-bold text-white mb-4">Welcome to EduArchive</h1>
                <p className="text-muted mb-5">Educational Materials Management System</p>
                <div className="d-flex gap-3 justify-content-center">
                    <Link to="/login" className="btn btn-primary">
                        Login
                    </Link>
                    <Link to="/register" className="btn btn-primary">
                        Register
                    </Link>
                </div>
            </div>
        </div>
    );
}

