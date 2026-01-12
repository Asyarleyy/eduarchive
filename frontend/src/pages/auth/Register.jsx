import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Cropper from "react-easy-crop";

export default function Register() {
    const [formData, setFormData] = useState({
        name: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        password_confirmation: "",
        role: "", // Force selection
        school: "",
        gender: "",
        birth_date: ""
    });

    // Image/Crop States
    const [pendingImage, setPendingImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showCrop, setShowCrop] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Teacher verification proof (png/pdf)
    const [teacherProof, setTeacherProof] = useState(null);
    const [teacherProofName, setTeacherProofName] = useState('');

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ===== IMAGE CROP LOGIC =====
    const onCropComplete = (croppedArea, pixels) => {
        setCroppedAreaPixels(pixels);
    };

    const getCroppedImage = async () => {
        const image = await new Promise((resolve) => {
            const img = new Image();
            img.src = imageSrc;
            img.onload = () => resolve(img);
        });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 300; canvas.height = 300;
        ctx.beginPath(); ctx.arc(150, 150, 150, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 300, 300);
        return new Promise((resolve) => canvas.toBlob((blob) => resolve(new File([blob], "profile.png", { type: "image/png" })), "image/png"));
    };

    const handleCropConfirm = async () => {
        try {
            const croppedFile = await getCroppedImage();
            setPendingImage(croppedFile);
            setPreviewUrl(URL.createObjectURL(croppedFile));
            setShowCrop(false);
            setImageSrc(null);
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // 1. Validation Checks
    if (!formData.role) {
        setErrors({ role: ['Please select if you are a student or teacher'] });
        return;
    }
    if (!pendingImage) {
        setErrors({ general: ['Profile picture is required'] });
        return;
    }
    if (!formData.first_name?.trim()) {
        setErrors({ general: ['First name is required'] });
        return;
    }
    if (!formData.last_name?.trim()) {
        setErrors({ general: ['Last name is required'] });
        return;
    }
    if (!formData.name?.trim()) {
        setErrors({ general: ['Display name is required'] });
        return;
    }
    if (!formData.email?.trim()) {
        setErrors({ general: ['Email is required'] });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setErrors({ general: ['Please enter a valid email address'] });
        return;
    }
    if (!formData.password) {
        setErrors({ general: ['Password is required'] });
        return;
    }
    if (formData.password.length < 6) {
        setErrors({ general: ['Password must be at least 6 characters'] });
        return;
    }
    if (!formData.password_confirmation) {
        setErrors({ general: ['Password confirmation is required'] });
        return;
    }
    if (formData.password !== formData.password_confirmation) {
        setErrors({ password: ['Passwords do not match'] });
        return;
    }
    if (!formData.gender) {
        setErrors({ general: ['Gender is required'] });
        return;
    }
    if (!formData.birth_date) {
        setErrors({ general: ['Birth date is required'] });
        return;
    }
    if (!formData.school?.trim()) {
        setErrors({ general: ['School/Institution is required'] });
        return;
    }

    if (formData.role === 'teacher' && !teacherProof) {
        setErrors({ general: ['Teacher validation proof (PNG/PDF) is required'] });
        return;
    }

    setLoading(true);

    try {
        // 2. Create FormData (Necessary for file uploads)
        const data = new FormData();
        
        // Append all text fields
        data.append('name', formData.name);
        data.append('first_name', formData.first_name);
        data.append('last_name', formData.last_name);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('role', formData.role);
        data.append('school', formData.school);
        data.append('gender', formData.gender);
        data.append('birth_date', formData.birth_date);

        // Append the cropped image file
        data.append('image', pendingImage);
        if (teacherProof) {
            data.append('teacher_proof', teacherProof);
        }

        // 3. Send to AuthContext
        const result = await register(data);

        if (result.success) {
            // Only redirect students to dashboard
            // Teachers will be redirected by the auth context to see pending verification message
            if (formData.role === 'student') {
                navigate('/dashboard');
            } else if (formData.role === 'teacher') {
                // Teacher registration successful - they'll see the pending verification modal
                // Just redirect them to dashboard where the pending modal will display
                navigate('/dashboard');
            }
        } else {
            setErrors(result.errors || { general: [result.message] });
        }
    } catch (err) {
        console.error('Registration error:', err);
        setErrors({ general: [err.message || 'An unexpected error occurred'] });
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="auth-card glass-card mx-auto" style={{ maxWidth: '650px', marginTop: '40px', marginBottom: '40px' }}>
            <div className="auth-header text-center p-4">
                <h2 className="h3 fw-bold text-white">Create Account</h2>
                <p className="text-muted small">Join EduArchive to start your journey</p>
            </div>

            <div className="auth-body p-4 pt-0">
                <form onSubmit={handleSubmit}>
                    
                    {/* ERROR MESSAGES */}
                    {errors.general && (
                        <div className="alert alert-danger mb-3" role="alert">
                            {errors.general.map((err, idx) => <div key={idx}>{err}</div>)}
                        </div>
                    )}
                    
                    {/* 1. PROFILE PICTURE SELECTION */}
                    <div className="text-center mb-4">
                        <div className="mx-auto mb-2" style={{ width: 110, height: 110, borderRadius: "50%", border: "2px solid #a855f7", overflow: 'hidden', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {previewUrl ? (
                                <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                            ) : (
                                <span className="text-muted small">No Photo</span>
                            )}
                        </div>
                        <label className="btn btn-sm btn-outline-primary" style={{ fontSize: '12px' }}>
                            {previewUrl ? "Change Photo" : "Upload Photo"}
                            <input type="file" hidden accept="image/*" onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => { setImageSrc(reader.result); setShowCrop(true); };
                                reader.readAsDataURL(file);
                            }} />
                        </label>
                    </div>

                    {/* 2. ROLE SELECTION */}
                    <div className="mb-4">
                        <label className="form-label small text-muted d-block text-center">I am a...</label>
                        <div className="gender-selection-wrapper">
                            <div className={`gender-option-card ${formData.role === 'student' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'student'})}>Student</div>
                            <div className={`gender-option-card ${formData.role === 'teacher' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'teacher'})}>Teacher</div>
                        </div>
                        {errors.role && <div className="text-danger small mt-1 text-center">{errors.role[0]}</div>}
                    </div>

                    {/* 2b. TEACHER VERIFICATION PROOF */}
                    {formData.role === 'teacher' && (
                        <div className="mb-4">
                            <label className="form-label small text-muted">Upload verification proof (PNG/PDF)</label>
                            <div className="d-flex align-items-center gap-2">
                                <label className="btn btn-outline-primary btn-sm mb-0">
                                    {teacherProofName || 'Choose file'}
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/png,image/jpeg,application/pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
                                            if (!allowed.includes(file.type)) {
                                                setErrors({ general: ['Only PNG, JPG, or PDF are allowed'] });
                                                return;
                                            }
                                            setTeacherProof(file);
                                            setTeacherProofName(file.name);
                                        }}
                                    />
                                </label>
                                {teacherProofName && <span className="text-muted small">{teacherProofName}</span>}
                            </div>
                        </div>
                    )}

                    {/* 3. NAME FIELDS */}
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label small text-muted">First Name</label>
                            <input name="first_name" className="form-control" value={formData.first_name} onChange={handleChange} required placeholder="First Name" />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small text-muted">Last Name</label>
                            <input name="last_name" className="form-control" value={formData.last_name} onChange={handleChange} required placeholder="Last Name" />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label small text-muted">Display Name (Public Nickname)</label>
                        <input name="name" className="form-control" value={formData.name} onChange={handleChange} required placeholder="e.g. Alex24" />
                        {errors.name && <div className="text-danger small mt-1">{errors.name[0]}</div>}
                    </div>

                    <div className="mb-3">
                        <label className="form-label small text-muted">Email Address</label>
                        <input name="email" type="email" className="form-control" value={formData.email} onChange={handleChange} required placeholder="name@example.com" />
                        {errors.email && <div className="text-danger small mt-1">{errors.email[0]}</div>}
                    </div>

                    {/* 4. GENDER & BIRTH DATE */}
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label small text-muted">Gender</label>
                            <div className="gender-selection-wrapper">
                                <div className={`gender-option-card ${formData.gender === 'Male' ? 'active' : ''}`} onClick={() => setFormData({...formData, gender: 'Male'})}>Male</div>
                                <div className={`gender-option-card ${formData.gender === 'Female' ? 'active' : ''}`} onClick={() => setFormData({...formData, gender: 'Female'})}>Female</div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small text-muted">Birth Date</label>
                            <input name="birth_date" type="date" className="form-control" value={formData.birth_date} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label small text-muted">School / Institution</label>
                        <input name="school" className="form-control" value={formData.school} onChange={handleChange} required placeholder="e.g. UTeM" />
                    </div>

                    {/* 5. PASSWORDS */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-6">
                            <label className="form-label small text-muted mb-1">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input name="password" type={showPassword ? 'text' : 'password'} className="form-control" value={formData.password} onChange={handleChange} required />
                                <button
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, lineHeight: 1, color: '#888' }}
                                    onClick={() => setShowPassword(p => !p)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small text-muted mb-1">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input name="password_confirmation" type={showConfirmPassword ? 'text' : 'password'} className="form-control" value={formData.password_confirmation} onChange={handleChange} required />
                                <button
                                    type="button"
                                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, lineHeight: 1, color: '#888' }}
                                    onClick={() => setShowConfirmPassword(p => !p)}
                                >
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        {errors.password && <div className="text-danger small mt-1 px-2">{errors.password[0]}</div>}
                    </div>

                    <button type="submit" className="btn btn-primary w-100 py-2 shadow" disabled={loading || !formData.role}>
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <p className="mt-4 text-center text-muted small">
                    Already have an account? <Link to="/login" className="text-decoration-none fw-bold" style={{ color: '#a855f7' }}>Login</Link>
                </p>
            </div>

            {/* CROP MODAL POPUP */}
            {showCrop && (
                <div className="popup-backdrop" style={{ zIndex: 2000 }}>
                    <div className="card p-4 shadow-lg" style={{ width: 450, background: "#111", border: "1px solid #a855f7" }}>
                        <h4 className="text-white mb-3 text-center">Adjust Profile Picture</h4>
                        <div style={{ position: "relative", width: "100%", height: 300 }}>
                            <Cropper 
                                image={imageSrc} crop={crop} zoom={zoom} aspect={1} 
                                cropShape="round" showGrid={false} 
                                onCropChange={setCrop} onZoomChange={setZoom} 
                                onCropComplete={onCropComplete} 
                            />
                        </div>
                        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(e.target.value)} className="form-range mt-3" />
                        <div className="mt-4 text-end d-flex gap-3 justify-content-center">
                            <button className="btn btn-primary" onClick={handleCropConfirm}>Confirm</button>
                            <button className="btn btn-secondary" onClick={() => {setShowCrop(false); setImageSrc(null);}}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}