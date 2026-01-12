import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ResetPassword from "../pages/auth/ResetPassword";
import Dashboard from "../pages/dashboard/Dashboard";
import Profile from "../pages/dashboard/Profile";

import CreateChannel from "../pages/channels/CreateChannel";
import ChannelDetails from "../pages/channels/ChannelDetails";
import SearchChannels from "../pages/channels/SearchChannels";

import Announcements from "../pages/channels/Announcements";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />

        {/* Channels */}
        <Route path="/channels" element={<Navigate to="/dashboard" />} />
        <Route path="/channels/create" element={<CreateChannel />} />
        <Route path="/search" element={<SearchChannels />} />
        <Route path="/channels/:id" element={<ChannelDetails />} />

        {/* Default */}
        <Route path="*" element={<Dashboard />} />
        <Route path="/announcements" element={<Announcements />} />

      </Routes>
    </BrowserRouter>
  );
}
