import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import API_BASE_URL from "../config/api";

const ProblemSet = () => {
  const [problems, setProblems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [topicFilter, setTopicFilter] = useState("All");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [access, setAccess] = useState("user");
  const nav = useNavigate();

  const getProblems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/problems`, {
        method: "GET",
      });
      const json = await response.json();
      setProblems(json);
    } catch (error) {
      console.error("Error fetching problems:", error);
    }
  };

  const getAccess = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "username": localStorage.getItem('username'),
        })
      });
      const json = await response.json();
      setAccess(json.access);
    } catch (error) {
      console.error("Error fetching access:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    localStorage.removeItem('access');
    setIsLoggedIn(false);
    setUsername("");
    setAccess("user");
    localStorage.setItem('isLoggedIn', 'false');
  };

  const loginStatus = () => {
    const user = localStorage.getItem('username');
    if (user) {
      setUsername(user);
      setIsLoggedIn(true);
      getAccess();
    } else {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    loginStatus();
    getProblems();
    const savedLoginState = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(savedLoginState);
  }, []);

  const availableTopics = ["All", ...new Set(problems.map((problem) => problem.topic).filter(Boolean))];

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      !searchTerm ||
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (problem.topic || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDifficulty =
      difficultyFilter === "All" || (problem.difficulty || "Unknown") === difficultyFilter;

    const matchesTopic =
      topicFilter === "All" || (problem.topic || "Unknown") === topicFilter;

    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  const openWorkspace = (problemTitle) => {
    nav(`/ide?problem=${encodeURIComponent(problemTitle)}`);
  };

  return (
    <div className="page-shell">
      <Header isLoggedIn={isLoggedIn} username={username} access={access} logout={logout} />

      <main className="app-frame px-3 pb-14 pt-8">
        <section className="glass-card rounded-[1.75rem] p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="metric-label">CodeNova Archive</p>
              <h2 className="section-title mt-2">Problem set</h2>
              <p className="section-copy mt-3 max-w-2xl">
                Browse a Striver-inspired practice archive, open any challenge in the workspace, and build consistency one submission at a time.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="metric-tile min-w-[170px]">
                <p className="metric-label">Total Problems</p>
                <p className="metric-value">{problems.length}</p>
              </div>
              <div className="metric-tile min-w-[170px]">
                <p className="metric-label">Mode</p>
                <p className="metric-value">Workspace</p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card mt-8 rounded-[1.75rem] p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1.3fr_0.8fr_1fr]">
            <div>
              <label htmlFor="problem-search" className="field-label">Search Problems</label>
              <input
                id="problem-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search Two Sum, Graph, DP..."
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="difficulty-filter" className="field-label">Difficulty</label>
              <select
                id="difficulty-filter"
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value)}
                className="field-input"
              >
                <option value="All">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label htmlFor="topic-filter" className="field-label">Topic</label>
              <select
                id="topic-filter"
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value)}
                className="field-input"
              >
                {availableTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="status-pill status-success">Visible {filteredProblems.length}</span>
            <span className="status-pill status-warning">Archive {problems.length}</span>
            <span className="status-pill status-danger">Mode Workspace-first</span>
          </div>
        </section>

        <section className="glass-card mt-8 overflow-hidden rounded-[1.75rem]">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Problem</th>
                  <th>Topic</th>
                  <th>Difficulty</th>
                  <th className="text-right">Rating</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.length > 0 ? filteredProblems.map((prob, index) => (
                  <tr key={prob.title}>
                    <td className="text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                    <td>
                      <a
                        onClick={(e) => {
                          e.preventDefault();
                          openWorkspace(prob.title);
                        }}
                        href="/"
                        className="font-semibold text-white transition hover:text-sky-300"
                      >
                        {prob.title}
                      </a>
                    </td>
                    <td className="text-slate-300">{prob.topic || "-"}</td>
                    <td>
                      <span className={`status-pill ${
                        prob.difficulty === 'Hard'
                          ? 'status-danger'
                          : prob.difficulty === 'Medium'
                            ? 'status-warning'
                            : 'status-success'
                      }`}>
                        {prob.difficulty || "Unknown"}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="inline-flex rounded-full bg-blue-500/12 px-3 py-1 text-sm font-semibold text-blue-100">
                        {prob.rating}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => openWorkspace(prob.title)}
                        className="secondary-btn !px-4 !py-2 text-sm"
                      >
                        Open Workspace
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">No problems matched your current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProblemSet;
