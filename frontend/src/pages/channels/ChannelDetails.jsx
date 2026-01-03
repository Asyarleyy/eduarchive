import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export default function ChannelShow() {
    const { id } = useParams();
    const { user } = useAuth();
    const [channel, setChannel] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [showCodePopup, setShowCodePopup] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        file: null,
    });

    const copyAccessCode = () => {
    navigator.clipboard.writeText(channel.access_code);
    alert("Access code copied to clipboard!");
};


    useEffect(() => {
        fetchChannel();
        fetchMaterials();
    }, [id]);

    const fetchChannel = async () => {
        try {
            const response = await axios.get(`/api/channels/${id}`);
            setChannel(response.data);
        } catch (error) {
            console.error('Error fetching channel:', error);
        }
    };

    const fetchMaterials = async () => {
        try {
            const response = await axios.get(`/api/channels/${id}/materials`);
            setMaterials(response.data);
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', uploadForm.title);
        formData.append('description', uploadForm.description || '');
        formData.append('file', uploadForm.file);

        try {
            await axios.post(`/api/channels/${id}/materials`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setShowUploadForm(false);
            setUploadForm({ title: '', description: '', file: null });
            fetchMaterials();
        } catch (error) {
            console.error('Error uploading material:', error);
            alert(error.response?.data?.error || 'Upload failed');
        }
    };

    const handleDownload = async (material) => {
        try {
            const response = await axios.get(`/api/materials/${material.id}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', material.file_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed');
        }
    };

    if (loading) {
        return <div className="text-white p-5">Loading...</div>;
    }

    return (
        <div className="py-5">
            <div className="container">
                {channel && (
                    <div className="card mb-4">
                        <div className="card-body">
                            <h1 className="h2 fw-bold text-white mb-2">{channel.title}</h1>
                            <p className="text-muted mb-0">{channel.description}</p>
                            {user?.role === 'teacher' && (
                                <div className="mt-3">
                                    <button
                                        className="btn btn-primary"
                                    onClick={() => setShowCodePopup(true)}
                        >
            Show Access Code
        </button>
    </div>
)}

                        </div>
                    </div>
                )}

                {user?.role === 'teacher' && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowUploadForm(!showUploadForm)}
                            className="btn btn-primary"
                        >
                            {showUploadForm ? 'Cancel Upload' : '+ Upload Material'}
                        </button>

                        {showUploadForm && (
                            <div className="card mt-3">
                                <div className="card-body">
                                    <form onSubmit={handleFileUpload}>
                                        <div className="mb-3">
                                            <label className="form-label">Title</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={uploadForm.title}
                                                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">File</label>
                                            <input
                                                type="file"
                                                className="form-control"
                                                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary">
                                            Upload
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <h2 className="h4 fw-bold text-white mb-4">Materials</h2>
                    {materials.length === 0 ? (
                        <div className="card">
                            <div className="card-body text-center text-muted">
                                No materials yet.
                            </div>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {materials.map((material) => (
                                <div key={material.id} className="col-md-6 col-lg-4">
                                    <div className="card h-100">
                                        <div className="card-body">
                                            <h5 className="card-title text-white">{material.title}</h5>
                                            <p className="card-text text-muted small mb-3">{material.description}</p>
                                            <button
                                                onClick={() => handleDownload(material)}
                                                className="btn btn-primary w-100"
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {showCodePopup && (
    <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
        style={{ background: "rgba(0,0,0,.6)", zIndex: 9999 }}
    >
        <div className="card p-4 text-center" style={{ minWidth: "400px" }}>
            <h4 className="mb-3 text-white">Channel Access Code</h4>

            <div className="fs-3 fw-bold text-white mb-3 font-monospace">
                {channel.access_code}
            </div>

            <button className="btn btn-primary me-2" onClick={copyAccessCode}>
                Copy Code
            </button>

            <button className="btn btn-secondary" onClick={() => setShowCodePopup(false)}>
                Close
            </button>
        </div>
    </div>
)}

        </div>
    );
}

