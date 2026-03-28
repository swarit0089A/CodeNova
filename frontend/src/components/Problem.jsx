import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import '../index.css';
import Editor from '@monaco-editor/react';
import Header from './Header';
import API_BASE_URL from "../config/api";
import { LANGUAGE_OPTIONS, getEditorLanguage, getLanguageLabel } from "../config/languages";

const Problem = () => {
  const [problem, setProblem] = useState("");
  const [logs, setLogs] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [yourOutput, setYourOutput] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [access, setAccess] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const loadProblem = async () => {
    if (!token) {
      return navigate('/login');
    }

    try {
      const response = await fetch(`${API_BASE_URL}${location.pathname}`, {
        method: "GET",
        headers: {
          authorization: token,
        }
      });

      const json = await response.json();
      setProblem(json);
    } catch (error) {
      console.error("Error fetching problem:", error);
    }
  };

  const logout = () => {
    const newLoginState = !isLoggedIn;
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUsername("");
    setAccess("user");
    localStorage.setItem('isLoggedIn', newLoginState);
  }

  useEffect(() => {
    loadProblem();
    const loginState = localStorage.getItem('isLoggedIn') === 'true';
    const storedUsername = localStorage.getItem('username');
    const storedAccess = localStorage.getItem('access');
    setIsLoggedIn(loginState);
    setUsername(storedUsername || '');
    setAccess(storedAccess || '');
  }, []);

  const onSubmit = async () => {
    setResult("PENDING");
    setLogs("LOGS");

    try {
      const response = await fetch(`${API_BASE_URL}/testing`, {
        method: "POST",
        headers: {
          authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'title': problem.title,
          'code': code,
          'username': localStorage.getItem('username'),
          'language': language,
        }),
      });

      const received = await response.json();
      setResult(received.result);
      setLogs(received.log);
      setOutput(received.expectedOutput);
      setInput(received.input);
      setYourOutput(received.actualOutput);
    } catch (error) {
      console.error("Error submitting code:", error);
    }
  };

  const statusClasses = () => {
    switch (result) {
      case "ACCEPTED":
        return "status-pill status-success";
      case "PENDING":
        return "status-pill status-warning";
      default:
        return result ? "status-pill status-danger" : "text-slate-400";
    }
  };

  const openWorkspace = () => {
    if (!problem?.title) {
      return;
    }

    navigate(`/ide?problem=${encodeURIComponent(problem.title)}`);
  };

  return (
    <div className="page-shell">
      <Header 
        isLoggedIn={isLoggedIn} 
        username={username} 
        logout={logout} 
        access={access} 
      />
      <main className="app-frame px-3 pb-14 pt-8">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="glass-card rounded-[1.75rem] p-6 md:p-8">
            <span className="brand-badge">Problem View</span>
            <h1 className="section-title mt-5">{problem.title || "Loading problem..."}</h1>
            <p className="section-copy mt-3">
              Read the statement, build your solution, and validate it against the platform tests.
            </p>

            <div className="mt-8 rounded-[1.4rem] border border-white/10 bg-slate-950/40 p-5">
              <p className="metric-label">Description</p>
              <p className="section-copy mt-4 whitespace-pre-wrap">{problem.description}</p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="metric-tile">
                <p className="metric-label">Language</p>
                <p className="metric-value">{getLanguageLabel(language)}</p>
              </div>
              <div className="metric-tile">
                <p className="metric-label">Status</p>
                <p className="metric-value text-lg">{result || "Idle"}</p>
              </div>
              <div className="metric-tile">
                <p className="metric-label">Author</p>
                <p className="metric-value text-lg">{username || "Guest"}</p>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={openWorkspace}
                className="secondary-btn"
              >
                Solve in Workspace
              </button>
            </div>
          </div>

          <div className="glass-card rounded-[1.75rem] p-6 md:p-8">
            <div className="mb-5">
              <label htmlFor="language-select" className="field-label">Choose Language</label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="field-input"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950/50">
              <Editor
                height="430px"
                language={getEditorLanguage(language)}
                value={code}
                onChange={(value) => setCode(value)}
                options={{ automaticLayout: true, theme: 'vs-dark', minimap: { enabled: false } }}
                className="rounded"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button 
                id="submitbutton" 
                className="primary-btn"
                onClick={onSubmit}
              >
                Submit Solution
              </button>
              <span className={statusClasses()}>{result || "Ready"}</span>
            </div>

            <pre className="soft-code mt-5">{logs || "Execution logs will appear here."}</pre>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="metric-tile">
                <p className="metric-label">Input</p>
                <p className="mt-3 whitespace-pre-wrap text-slate-200">{input || "-"}</p>
              </div>
              <div className="metric-tile">
                <p className="metric-label">Expected Output</p>
                <p className="mt-3 whitespace-pre-wrap text-slate-200">{output || "-"}</p>
              </div>
              <div className="metric-tile">
                <p className="metric-label">Your Output</p>
                <p className="mt-3 whitespace-pre-wrap text-slate-200">{yourOutput || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Problem;
