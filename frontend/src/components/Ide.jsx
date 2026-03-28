import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import Header from './Header';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API_BASE_URL from "../config/api";
import { Braces, CheckCheck, FileCode2, Play, ScanSearch, Send, TerminalSquare, TimerReset } from "lucide-react";
import { LANGUAGE_OPTIONS, getEditorLanguage, getLanguageLabel } from "../config/languages";

const FILE_NAMES = {
  cpp: "main.cpp",
  py: "main.py",
  js: "main.js",
  cs: "Program.cs",
  java: "Main.java",
};

const CodeEditor = () => {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [submissionResult, setSubmissionResult] = useState("");
  const [submissionLogs, setSubmissionLogs] = useState("");
  const [submissionInput, setSubmissionInput] = useState("");
  const [submissionExpectedOutput, setSubmissionExpectedOutput] = useState("");
  const [submissionYourOutput, setSubmissionYourOutput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [access, setAccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedProblemTitle = searchParams.get('problem');
  const token = localStorage.getItem('token');

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const response = await fetch(`${API_BASE_URL}/runcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, input, language }),
      });

      const result = await response.json();
      if (!response.ok) {
        setOutput(result.error || result.log || result.result || "Failed to run code.");
        setIsRunning(false);
        return;
      }

      setOutput(result.output || result.error || result.log || "No output returned.");
    } catch (error) {
      console.error("Error running code:", error);
      setOutput("Unable to reach the code runner. Check whether the backend and Docker are available.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblem?.title) {
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult("PENDING");
    setSubmissionLogs("Submitting your solution...");
    setSubmissionInput("");
    setSubmissionExpectedOutput("");
    setSubmissionYourOutput("");

    try {
      const response = await fetch(`${API_BASE_URL}/testing`, {
        method: "POST",
        headers: {
          authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: selectedProblem.title,
          code,
          username: localStorage.getItem('username'),
          language,
        }),
      });

      const received = await response.json();
      setSubmissionResult(received.result || "UNKNOWN");
      setSubmissionLogs(received.log || "No judge log returned.");
      setSubmissionInput(received.input || "");
      setSubmissionExpectedOutput(received.expectedOutput || "");
      setSubmissionYourOutput(received.actualOutput || received.output || received.error || "");
    } catch (error) {
      console.error("Error submitting code:", error);
      setSubmissionResult("SERVER ERROR");
      setSubmissionLogs("Unable to submit the solution right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    localStorage.removeItem('access');
    setIsLoggedIn(false);
    setUsername("");
    setAccess("user");
    localStorage.setItem('isLoggedIn', false);
    navigate('/login');
  };

  useEffect(() => {
    const loginState = localStorage.getItem('isLoggedIn') === 'true';
    const storedUsername = localStorage.getItem('username');
    const storedAccess = localStorage.getItem('access');
    setIsLoggedIn(loginState);
    setUsername(storedUsername || '');
    setAccess(storedAccess || '');
  }, []);

  useEffect(() => {
    const loadSelectedProblem = async () => {
      if (!selectedProblemTitle) {
        setSelectedProblem(null);
        setSubmissionResult("");
        setSubmissionLogs("");
        setSubmissionInput("");
        setSubmissionExpectedOutput("");
        setSubmissionYourOutput("");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(selectedProblemTitle)}`);
        const json = await response.json();

        if (!response.ok) {
          setSelectedProblem(null);
          return;
        }

        setSelectedProblem(json);
        setSubmissionResult("");
        setSubmissionLogs("");
        setSubmissionInput("");
        setSubmissionExpectedOutput("");
        setSubmissionYourOutput("");
      } catch (error) {
        console.error("Error fetching selected problem:", error);
        setSelectedProblem(null);
      }
    };

    loadSelectedProblem();
  }, [selectedProblemTitle]);

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code.length;
  const inputLines = input ? input.split('\n').length : 0;
  const activeFileName = FILE_NAMES[language] || `main.${language}`;
  const outputState = isRunning
    ? "Running"
    : output
      ? "Ready"
      : "Idle";
  const judgeStateClass =
    submissionResult === "ACCEPTED"
      ? "status-pill status-success"
      : submissionResult === "PENDING"
        ? "status-pill status-warning"
        : submissionResult
          ? "status-pill status-danger"
          : "status-pill status-warning";

  return (
    <div className="page-shell">
      <Header 
        isLoggedIn={isLoggedIn} 
        username={username} 
        logout={logout} 
        access={access} 
        wide
        compact
      />
      <main className="workspace-page-frame px-1 pb-4 pt-2">
        <div className="glass-card rounded-[1.1rem] p-2 md:p-2.5 xl:p-3">
          {selectedProblem && (
            <section className="workspace-problem-card">
              <div className="workspace-problem-header">
                <div>
                  <span className="brand-badge">Workspace Problem</span>
                  <h2 className="workspace-problem-title">{selectedProblem.title}</h2>
                  <p className="workspace-problem-copy">
                    {selectedProblem.description}
                  </p>
                </div>

                <div className="workspace-problem-meta">
                  <span className="workspace-chip">{selectedProblem.topic || 'Practice'}</span>
                  <span className="workspace-chip workspace-chip-soft">{selectedProblem.difficulty || 'Mixed'}</span>
                  <span className="workspace-chip workspace-chip-soft">Rating {selectedProblem.rating || '--'}</span>
                </div>
              </div>
            </section>
          )}

          <div className="workspace-hero">
            <div>
              <span className="brand-badge">Live Workspace</span>
              <h1 className="mt-1 text-[1.08rem] font-bold leading-tight tracking-[-0.03em] text-white md:text-[1.16rem]">
                Code, run, and inspect in one flow.
              </h1>
            </div>

            <div className="workspace-hero-actions">
              <div className="workspace-mini-stat">
                <span className="workspace-mini-label">Logged in</span>
                <strong>{username || 'Guest'}</strong>
              </div>
              <div className="workspace-mini-stat">
                <span className="workspace-mini-label">Current stack</span>
                <strong>{getLanguageLabel(language)}</strong>
              </div>
              <button
                onClick={handleRun}
                className="primary-btn workspace-run-btn"
                disabled={isRunning}
              >
                <Play size={16} />
                {isRunning ? "Running..." : "Run Code"}
              </button>
              {selectedProblem && (
                <button
                  onClick={handleSubmit}
                  className="secondary-btn workspace-submit-btn"
                  disabled={isSubmitting}
                >
                  <Send size={15} />
                  {isSubmitting ? "Submitting..." : "Submit Solution"}
                </button>
              )}
            </div>
          </div>

          <div className="workspace-stats-grid">
            <div className="workspace-stat-card">
              <div className="workspace-stat-icon">
                <FileCode2 size={18} />
              </div>
              <div>
                <p className="metric-label">File</p>
                <p className="workspace-stat-value">{activeFileName}</p>
              </div>
            </div>
            <div className="workspace-stat-card">
              <div className="workspace-stat-icon">
                <ScanSearch size={18} />
              </div>
              <div>
                <p className="metric-label">Code size</p>
                <p className="workspace-stat-value">{lineCount} lines</p>
              </div>
            </div>
            <div className="workspace-stat-card">
              <div className="workspace-stat-icon">
                <Braces size={18} />
              </div>
              <div>
                <p className="metric-label">Characters</p>
                <p className="workspace-stat-value">{charCount}</p>
              </div>
            </div>
            <div className="workspace-stat-card">
              <div className="workspace-stat-icon">
                <TimerReset size={18} />
              </div>
              <div>
                <p className="metric-label">Runner state</p>
                <p className="workspace-stat-value">{outputState}</p>
              </div>
            </div>
          </div>

          <div className="workspace-layout">
            <section className="workspace-pane workspace-editor-pane">
              <div className="workspace-pane-header">
                <div>
                  <p className="workspace-pane-kicker">Editor</p>
                  <h2 className="workspace-pane-title">Code Surface</h2>
                </div>
                <div className="workspace-pane-actions">
                  <span className="workspace-chip">{activeFileName}</span>
                  <span className="workspace-chip workspace-chip-soft">{lineCount} lines</span>
                </div>
              </div>

              <div className="workspace-editor-shell">
                <div className="workspace-editor-toolbar">
                  <div className="workspace-editor-tabs">
                    <span className="workspace-editor-dot workspace-editor-dot-red" />
                    <span className="workspace-editor-dot workspace-editor-dot-yellow" />
                    <span className="workspace-editor-dot workspace-editor-dot-green" />
                    <span className="workspace-editor-file">{activeFileName}</span>
                  </div>

                  <div className="workspace-language-wrap">
                    <label htmlFor="language-select" className="workspace-toolbar-label">Language</label>
                    <select
                      id="language-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="workspace-language-select"
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="workspace-editor-frame">
                  <Editor
                    height="46vh"
                    language={getEditorLanguage(language)}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    options={{
                      automaticLayout: true,
                      theme: 'vs-dark',
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineHeight: 22,
                      padding: { top: 12 },
                      smoothScrolling: true,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="workspace-pane workspace-side-pane">
              <div className="workspace-pane-header">
                <div>
                  <p className="workspace-pane-kicker">Execution</p>
                  <h2 className="workspace-pane-title">Input and Output</h2>
                </div>
                <span className={`status-pill ${output ? 'status-success' : 'status-warning'}`}>
                  <TerminalSquare size={14} />
                  {isRunning ? 'Running' : output ? 'Output Ready' : 'Awaiting Run'}
                </span>
              </div>

              <div className="workspace-side-stack">
                <div className="workspace-console-card">
                  <div className="workspace-console-header">
                    <div>
                      <p className="workspace-console-title">Custom Input</p>
                      <p className="workspace-console-subtitle">Pass stdin values exactly as your program expects.</p>
                    </div>
                    <span className="workspace-chip workspace-chip-soft">{inputLines} lines</span>
                  </div>
                  <textarea
                    id="input"
                    className="workspace-console-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Example:
5
1 2 3 4 5"
                    rows={10}
                  />
                </div>

                <div className="workspace-console-card">
                  <div className="workspace-console-header">
                    <div>
                      <p className="workspace-console-title">Output</p>
                      <p className="workspace-console-subtitle">Compiler feedback, runtime output, or execution errors.</p>
                    </div>
                    <span className="workspace-chip">{getLanguageLabel(language)}</span>
                  </div>
                  <div className="workspace-output-shell">
                    <pre>{output || "Your output will appear here after you run the program."}</pre>
                  </div>
                </div>

                {selectedProblem && (
                  <div className="workspace-console-card">
                    <div className="workspace-console-header">
                      <div>
                        <p className="workspace-console-title">Submission Verdict</p>
                        <p className="workspace-console-subtitle">Submit directly from the workspace after solving the selected problem.</p>
                      </div>
                      <span className={judgeStateClass}>
                        <CheckCheck size={14} />
                        {submissionResult || 'Ready to Submit'}
                      </span>
                    </div>

                    <div className="workspace-output-shell">
                      <pre>{submissionLogs || "Judge feedback will appear here after submission."}</pre>
                    </div>

                    <div className="workspace-judge-grid">
                      <div className="metric-tile">
                        <p className="metric-label">Judge Input</p>
                        <p className="workspace-judge-copy">{submissionInput || "-"}</p>
                      </div>
                      <div className="metric-tile">
                        <p className="metric-label">Expected Output</p>
                        <p className="workspace-judge-copy">{submissionExpectedOutput || "-"}</p>
                      </div>
                      <div className="metric-tile">
                        <p className="metric-label">Your Output</p>
                        <p className="workspace-judge-copy">{submissionYourOutput || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CodeEditor;
