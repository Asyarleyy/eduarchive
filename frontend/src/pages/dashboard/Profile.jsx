import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
    const { user } = useAuth();

    return (
        <div className="py-5">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <h1 className="h2 fw-bold text-white mb-4">Profile</h1>

                        <div className="card">
                            <div className="card-body">
                                <div className="mb-3">
                                    <label className="form-label">Name</label>
                                    <div className="text-white">{user?.name}</div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <div className="text-white">{user?.email}</div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Role</label>
                                    <div className="text-white text-capitalize">{user?.role}</div>
                                </div>
                                {user?.school && (
                                    <div className="mb-3">
                                        <label className="form-label">School</label>
                                        <div className="text-white">{user?.school}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

