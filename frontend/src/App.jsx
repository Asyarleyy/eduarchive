import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import GuestLayout from './components/GuestLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Channels from './pages/channels/Channels';
import ChannelCreate from './pages/channels/ChannelCreate';
import ChannelShow from './pages/channels/ChannelShow';
import Profile from './pages/Profile';
import Welcome from './pages/Welcome';

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen d-flex align-items-center justify-content-center" style={{ background: '#0f0f14', minHeight: '100vh' }}>
                <div className="text-white fs-5">Loading...</div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<Welcome />} />
            
            {/* Guest Routes */}
            <Route element={<GuestLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/channels/create" element={<ChannelCreate />} />
                <Route path="/channels/:id" element={<ChannelShow />} />
                <Route path="/profile" element={<Profile />} />
            </Route>
        </Routes>
    );
}

export default AppRoutes;

