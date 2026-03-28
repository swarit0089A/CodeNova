import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email.trim() || !username.trim() || !password) {
      setResponseMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setResponseMessage("");

    try {
      const registerResponse = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          'Content-Type': "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      });

      const registerData = await registerResponse.json();

      if (registerResponse.status === 201) {
        const loginResponse = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
          localStorage.setItem("token", loginData.token);
          localStorage.setItem("username", username);
          localStorage.setItem("access", loginData.access);
          localStorage.setItem("isLoggedIn", true);
          navigate(-1);
        } else {
          setResponseMessage(loginData.msg || "Invalid username or password.");
        }
      } else {
        setResponseMessage(registerData.msg || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration/Login failed:", error);
      setResponseMessage("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card rounded-[1.75rem] p-8 md:p-10">
          <span className="brand-badge">Welcome to CodeNova</span>
          <h2 className="section-title mt-5">Create your coding identity.</h2>
          <p className="section-copy mt-4 max-w-xl">
            Register once and unlock the full CodeNova experience: problems, workspace runs, submissions, blogs, notes, and profile streaks.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="metric-tile">
              <p className="metric-label">Workspace</p>
              <p className="metric-value">Live</p>
            </div>
            <div className="metric-tile">
              <p className="metric-label">Progress</p>
              <p className="metric-value">Tracked</p>
            </div>
            <div className="metric-tile">
              <p className="metric-label">Notes</p>
              <p className="metric-value">Private</p>
            </div>
          </div>
        </div>

        <div className="glass-card-strong rounded-[1.75rem] p-8 md:p-10">
          <h3 className="text-3xl font-bold tracking-[-0.04em] text-white">Register</h3>
          <p className="mt-2 text-sm text-slate-400">Start building your profile on CodeNova.</p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="field-label">Username</label>
              <input
                type="text"
                className="field-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                placeholder="Enter your password"
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
            {loading ? "Registering..." : "Create CodeNova Account"}
          </button>
          {responseMessage && (
            <p className="mt-4 text-center text-red-300">{responseMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
