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
    first_name: "", last_name: "", name: "", email: "", 
    school: "", gender: "", birth_date: "",
  });
  
  const [pendingImage, setPendingImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);

  const [passForm, setPassForm] = useState({
    current_password: "", new_password: ""
  });

  // 🟢 1. Robust URL Helper
  const getFullImageUrl = (path) => {
    if (!path || path === "null") return null;
    if (path.startsWith('http')) return path; 
    
    // Ensure the backend port (3001) is correct
    // Remove any accidental double slashes
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const finalUrl = `http://localhost:3001${cleanPath}`;
    
    return finalUrl;
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
      // Diagnostic: See what path is coming from the database
      console.log("Current user image path:", user.profile_image);
      setPreviewUrl(getFullImageUrl(user.profile_image));
    }
  }, [user]);

  // ===== IMAGE CROP LOGIC =====
  const [showCrop, setShowCrop] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const getCroppedImage = async () => {
    const img = await new Promise((resolve) => {
      const i = new Image();
      i.src = imageSrc;
      i.onload = () => resolve(i);
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 300;
    canvas.height = 300;
    ctx.beginPath(); ctx.arc(150, 150, 150, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 300, 300);
    return new Promise((res) => canvas.toBlob((b) => res(new File([b], "profile.png", { type: "image/png" })), "image/png"));
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
      formData.append("_method", "PUT");
      Object.keys(profileForm).forEach(k => formData.append(k, profileForm[k] || ""));
      if (pendingImage) formData.append("image", pendingImage);

      const response = await axios.post("/api/user/update", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.user) {
        setUser(response.data.user); 
        alert("Profile updated!");
        setShowEdit(false);
        setPendingImage(null);
      }
    } catch (err) { alert("Update failed"); } finally { setLoading(false); }
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
              <div className="card-body p-4 text-center">
                
                {/* 🟢 2. Diagnostic Image Tag */}
                {user?.profile_image ? (
                  <img 
                    src={getFullImageUrl(user.profile_image)} 
                    alt="Profile" 
                    key={user.profile_image} 
                    style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", border: "3px solid #a855f7" }} 
                    onError={(e) => {
                        console.error("Failed to load image from:", e.target.src);
                        e.target.onerror = null; 
                        e.target.src=`https://ui-avatars.com/api/?name=${user.name}&background=a855f7&color=fff`;
                    }}
                  />
                ) : (
                  <InitialAvatar />
                )}

                <h5 style={{ color: "#a855f7", fontWeight: "bold" }} className="mt-5 mb-4 text-center text-uppercase">
                  Personal Information
                </h5>

                <div className="row g-4 text-start text-white px-md-4">
                  <div className="col-md-6 border-end" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    <ProfileItem label="First Name" value={user?.first_name} />
                    <ProfileItem label="Last Name" value={user?.last_name} />
                    <ProfileItem label="Gender" value={user?.gender} />
                    <ProfileItem label="Birth Date" value={user?.birth_date ? new Date(user.birth_date).toLocaleDateString('en-GB') : null} />
                  </div>
                  <div className="col-md-6 ps-md-5">
                    <ProfileItem label="Display Name" value={user?.name} />
                    <ProfileItem label="Email Address" value={user?.email} lowercase />
                    <ProfileItem label="School / Institution" value={user?.school} />
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

      {/* Modals... (Keep your existing modal code below) */}
      {/* ... Update Modal, Crop Modal, Password Modal ... */}
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