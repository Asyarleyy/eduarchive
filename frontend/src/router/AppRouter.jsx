import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/dashboard/Dashboard";
import Profile from "../pages/dashboard/Profile";

import TeacherChannels from "../pages/channels/TeacherChannels";
import CreateChannel from "../pages/channels/CreateChannel";
import ChannelDetails from "../pages/channels/ChannelDetails";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />

        {/* Channels (Teacher) */}
        <Route path="/channels" element={<TeacherChannels />} />
        <Route path="/channels/create" element={<CreateChannel />} />
        <Route path="/channels/:id" element={<ChannelDetails />} />

        {/* Default */}
        <Route path="*" element={<Dashboard />} />

      </Routes>
    </BrowserRouter>
  );
}
