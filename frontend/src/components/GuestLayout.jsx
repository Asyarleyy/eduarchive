import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function GuestLayout() {
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen d-flex align-items-center justify-content-center py-5" style={{ background: '#0f0f14', minHeight: '100vh' }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}

