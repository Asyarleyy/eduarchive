import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function JoinChannel() {
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const joinChannel = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post("/api/channels/join", {
        invite_code: code,
      });

      alert("Successfully joined channel!");

      // redirect to student dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error("Join failed:", error);
      alert(error?.response?.data?.message || "Invalid access code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-5">
      <div className="container">

        <h1 className="h3 fw-bold text-white mb-4">
          Join a Channel
        </h1>

        <div className="card">
          <div className="card-body">

            <form onSubmit={joinChannel}>
              <div className="mb-3">
                <label className="form-label">Enter Access Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Joining..." : "Join Channel"}
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
