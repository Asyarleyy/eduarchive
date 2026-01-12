import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import Cropper from "react-easy-crop";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    first_name: "", last_name: "", name: "", email: "", school: "", gender: "", birth_date: "",
  });
  
  const [pendingImage, setPendingImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const [passForm, setPassForm] = useState({ current_password: "", new_password: "" });

  const getFullImageUrl = (path) => {
    if (!path || path === "null") return null;
    if (path.startsWith('http')) return path; 
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `http://localhost:3001${cleanPath}`;
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        name: user.name || "",
        email: user.email || "", 
        school: user.school || "",
        gender: user.gender || "",
        birth_date: user.birth_date ? user.birth_date.split('T')[0] : "" 
      });
      setPreviewUrl(getFullImageUrl(user.profile_image));
    }
  }, [user]);

  const [showCrop, setShowCrop] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const getCroppedImage = async () => {
    const img = await new Promise(r => { const i = new Image(); i.src = imageSrc; i.onload = () => r(i); });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 300; canvas.height = 300;
    ctx.beginPath(); ctx.arc(150, 150, 150, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 300, 300);
    return new Promise(r => canvas.toBlob(b => r(new File([b], "profile.png", { type: "image/png" })), "image/png"));
  };

  const handleCropConfirm = async () => {
    const file = await getCroppedImage();
    setPendingImage(file);
    setPreviewUrl(URL.createObjectURL(file)); 
    setShowCrop(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(profileForm).forEach(k => formData.append(k, profileForm[k] || ""));
      if (pendingImage) formData.append("image", pendingImage);
      const res = await axios.post("/api/user/update", formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.user) { setUser(res.data.user); alert("Profile updated!"); setShowEdit(false); setPendingImage(null); }
    } catch (err) { alert("Update failed"); } finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
        await axios.put("/api/user/password", passForm);
        alert("Password updated!");
        setShowPassword(false);
        setPassForm({ current_password: "", new_password: "" });
    } catch (err) { alert(err.response?.data?.error || "Password update failed"); }
  };

  const InitialAvatar = () => (
    <div style={{ width: 130, height: 130, borderRadius: "50%", background: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", color: "white", border: "3px solid white", margin: "auto" }}>
      {user?.name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );

  return (
    <div className="py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <h1 className="profile-title mb-4">Profile</h1>
            <div className="card glass-card shadow-lg">
              <div className="card-body p-4 text-center text-white">
                {user?.profile_image ? (
                  <img src={getFullImageUrl(user.profile_image)} alt="Profile" key={user.profile_image} style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", border: "3px solid #a855f7" }} />
                ) : <InitialAvatar />}
                <h5 className="mt-5 mb-4 text-uppercase fw-bold" style={{ color: "#a855f7" }}>Personal Information</h5>
                <div className="row g-4 text-start px-md-4">
                    <div className="col-md-6 border-end" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                        <ProfileItem label="First Name" value={user?.first_name} />
                        <ProfileItem label="Last Name" value={user?.last_name} />
                        <ProfileItem label="Gender" value={user?.gender} />
                        <ProfileItem label="Birth Date" value={user?.birth_date ? new Date(user.birth_date).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) : null} />
                    </div>
                    <div className="col-md-6 ps-md-5">
                        <ProfileItem label="Display Name" value={user?.name} />
                        <ProfileItem label="Email Address" value={user?.email} lowercase />
                        <ProfileItem label="School" value={user?.school} />
                        <ProfileItem label="Role" value={user?.role} capitalize />
                    </div>
                </div>
                <div className="mt-5 border-top pt-4 d-flex justify-content-center gap-3">
                  <button className="btn btn-primary px-4" onClick={() => setShowEdit(true)}>Edit Profile</button>
                  <button className="btn btn-secondary px-4" onClick={() => setShowPassword(true)}>Security Settings</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="popup-backdrop" style={{ zIndex: 1000 }}>
          <div className="card p-4 shadow-lg" style={{ minWidth: "450px", background: "#111", border: "1px solid #a855f7" }}>
            <h4 className="text-white text-center mb-4">Update Profile</h4>
            <form onSubmit={updateProfile}>
                <div className="text-center mb-3">
                    <label className="btn btn-sm btn-outline-primary">
                        Change Photo
                        <input type="file" hidden accept="image/*" onChange={e => {
                            const reader = new FileReader();
                            reader.onload = () => { setImageSrc(reader.result); setShowCrop(true); };
                            reader.readAsDataURL(e.target.files[0]);
                        }} />
                    </label>
                </div>
                <div className="row g-2 mb-2">
                    <div className="col-6"><input className="form-control" placeholder="First Name" value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} /></div>
                    <div className="col-6"><input className="form-control" placeholder="Last Name" value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} /></div>
                </div>
                <input className="form-control mb-2" placeholder="Display Name" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                <input className="form-control mb-2" placeholder="School" value={profileForm.school} onChange={e => setProfileForm({...profileForm, school: e.target.value})} />
                
                <div className="row g-2 mb-2">
                    <div className="col-6">
                        <select className="form-control" value={profileForm.gender} onChange={e => setProfileForm({...profileForm, gender: e.target.value})} style={{ color: '#fff', backgroundColor: '#1a1a20' }}>
                            <option value="" style={{ color: '#888' }}>Select Gender</option>
                            <option value="Male" style={{ color: '#fff', backgroundColor: '#1a1a20' }}>Male</option>
                            <option value="Female" style={{ color: '#fff', backgroundColor: '#1a1a20' }}>Female</option>
                        </select>
                    </div>
                    <div className="col-6">
                        <input type="date" className="form-control" placeholder="Birth Date" value={profileForm.birth_date} onChange={e => setProfileForm({...profileForm, birth_date: e.target.value})} style={{ color: '#fff', backgroundColor: '#1a1a20' }} />
                    </div>
                </div>
                
                <input type="email" className="form-control mb-3" placeholder="Email Address" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                
                <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCrop && (
        <div className="popup-backdrop" style={{ zIndex: 2000 }}>
          <div className="card p-4" style={{ width: 400, background: "#111" }}>
            <div style={{ position: "relative", height: 300 }}>
              <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(c, p) => setCroppedAreaPixels(p)} />
            </div>
            <button className="btn btn-primary mt-3 w-100" onClick={handleCropConfirm}>Confirm</button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPassword && (
        <div className="popup-backdrop" style={{ zIndex: 1000 }}>
          <div className="card p-4" style={{ width: 400, background: "#111", border: "1px solid #a855f7" }}>
            <h4 className="text-white text-center mb-4">Change Password</h4>
            <form onSubmit={handlePasswordChange}>
                <input type="password" placeholder="Current Password" required className="form-control mb-2" value={passForm.current_password} onChange={e => setPassForm({...passForm, current_password: e.target.value})} />
                <input type="password" placeholder="New Password" required className="form-control mb-4" value={passForm.new_password} onChange={e => setPassForm({...passForm, new_password: e.target.value})} />
                <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPassword(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Update</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileItem({ label, value, lowercase, capitalize }) {
  return (
    <div className="mb-3">
      <label className="small text-muted d-block">{label}</label>
      <span className={`fw-bold text-white ${lowercase ? 'text-lowercase' : ''} ${capitalize ? 'text-capitalize' : ''}`}>
        {value || "-"}
      </span>
    </div>
  );
}