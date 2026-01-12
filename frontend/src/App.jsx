import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import GuestLayout from './components/GuestLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import CreateChannel from './pages/channels/CreateChannel';
import ChannelDetails from './pages/channels/ChannelDetails';
import Profile from './pages/dashboard/Profile';
import Welcome from './pages/Welcome';
import JoinChannel from "./pages/channels/JoinChannel";


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
                <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/channels" element={<Navigate to="/dashboard" />} />
                <Route path="/channels/create" element={<CreateChannel />} />
                <Route path="/channels/:id" element={<ChannelDetails />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/join" element={<JoinChannel />} />

            </Route>
        </Routes>
    );
}

export default AppRoutes;

