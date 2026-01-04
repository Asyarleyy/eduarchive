import React from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
    return (
        /* The hero-container handles the full-screen atmospheric glow */
        <div className="hero-container d-flex align-items-center justify-content-center">
            <div className="text-center px-4">
                {/* hero-title displays the large hero icon via CSS */}
                <h1 className="hero-title fw-bold text-white mb-3">
                    EduArchive
                </h1>
                <p className="hero-subtitle mb-5">
                    Educational Materials Management System
                </p>
                <div className="d-flex gap-4 justify-content-center flex-wrap">
                    <Link to="/login" className="btn btn-hero btn-primary">
                        Get Started
                    </Link>
                    <Link to="/register" className="btn btn-hero btn-outline-purple">
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}