import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
    const { user } = useAuth();

    return (
        <div className="py-5">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        {/* Integrated the professional title style */}
                        <h1 className="profile-title mb-4">Profile</h1>

                        <div className="card glass-card">
                            <div className="card-body p-4">
                                <div className="row g-4">
                                    
                                    {/* Left Column: Personal Details */}
                                    <div className="col-md-6">
                                        <div className="info-group">
                                            <label className="info-label">Full Name</label>
                                            <div className="info-value">{user?.name || 'N/A'}</div>
                                        </div>

                                        <div className="info-group">
                                            <label className="info-label">Email Address</label>
                                            <div className="info-value text-white">{user?.email}</div>
                                        </div>
                                    </div>

                                    {/* Right Column: Academic/Role Details */}
                                    <div className="col-md-6">
                                        <div className="info-group">
                                            <label className="info-label">Current Role</label>
                                            <div className="info-value">
                                                <span className="text-white text-capitalize">
                                                    {user?.role}
                                                </span>
                                            </div>
                                        </div>

                                        {user?.school && (
                                            <div className="info-group">
                                                <label className="info-label">Institution</label>
                                                <div className="info-value">
                                                    <span className="info-value text-white">
                                                        {user?.school.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* Optional Edit Button to fill space and add functionality */}
                                <div className="mt-4 pt-3 text-end">
                                    <button className="btn btn-hero btn-outline-purple btn-sm">
                                        Update Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}