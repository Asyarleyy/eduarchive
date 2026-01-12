import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen" style={{ background: '#0f0f14', minHeight: '100vh' }}>
            <nav className="navbar navbar-expand-lg" style={{ background: '#0b0b10', borderBottom: '1px solid #2b2f3f' }}>
                <div className="container-fluid">
                    <Link to="/dashboard" className="navbar-brand text-white">
                        EduArchive
                    </Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav me-auto">
                            <li className="nav-item">
                                <Link to="/dashboard" className="nav-link text-white">
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <span className="nav-link text-white-50">
                                    {user?.name} ({user?.role})
                                </span>
                            </li>
                            <li className="nav-item">
                                <Link to="/profile" className="nav-link text-white">
                                    Profile
                                </Link>
                            </li>
                            <li className="nav-item">
                                <button
                                    onClick={handleLogout}
                                    className="btn btn-link nav-link text-white"
                                    style={{ border: 'none', background: 'none' }}
                                >
                                    Logout
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <main>
                <Outlet />
            </main>
        </div>
    );
}

