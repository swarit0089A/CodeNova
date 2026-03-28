import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import API_BASE_URL from "../config/api";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginResponse, setLoginResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setLoginResponse("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setLoginResponse("");

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", username);
        localStorage.setItem("access", data.access);
        localStorage.setItem("isLoggedIn", true);
        navigate(-1);
      } else {
        setLoginResponse(data.msg || "Invalid username or password.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setLoginResponse("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-gray-100">
      <Particles
        id="tsparticles"
        init={loadSlim}
        options={{
          background: { color: "#08111f" },
          particles: {
            number: { value: 60, density: { enable: true, area: 800 } },
            shape: { type: "circle" },
            opacity: { value: 0.35 }, 
            size: { value: 2.5 },
            move: { enable: true, speed: 1.8 },
            color: { value: "#60a5fa" }, 
            links: { 
              enable: true, 
              distance: 150, 
              color: "#2563eb",
              opacity: 0.22
            },
          },
          interactivity: {
            events: { 
              onHover: { enable: true, mode: "grab" }, 
              onClick: { enable: true, mode: "push" } 
            },
          },
        }}
        className="absolute inset-0 w-full h-full"
      />

      <div className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_0.92fr]">
        <div className="glass-card rounded-[1.75rem] p-8 md:p-10">
          <span className="brand-badge">CodeNova Access</span>
          <h2 className="section-title mt-5">A cleaner workspace for serious problem solving.</h2>
          <p className="section-copy mt-4 max-w-xl">
            Sign in to continue coding in the browser, track your accepted solutions, and maintain your personal learning log.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="metric-tile">
              <p className="metric-label">Problems</p>
              <p className="metric-value">Solve</p>
            </div>
            <div className="metric-tile">
              <p className="metric-label">Submissions</p>
              <p className="metric-value">Review</p>
            </div>
            <div className="metric-tile">
              <p className="metric-label">Profile</p>
              <p className="metric-value">Grow</p>
            </div>
          </div>
        </div>

        <div className="glass-card-strong rounded-[1.75rem] p-8 md:p-10">
          <h3 className="text-3xl font-bold tracking-[-0.04em] text-white">Sign In</h3>
          <p className="mt-2 text-sm text-slate-400">Jump back into your CodeNova workspace.</p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="field-label">Username</label>
              <input
                className="field-input"
                placeholder="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                className="field-input"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="primary-btn mt-8 w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Enter CodeNova"}
          </button>

          {loginResponse && <p className="mt-4 text-center text-red-300">{loginResponse}</p>}
        </div>
      </div>
    </div>
  );
};

export default Login;
