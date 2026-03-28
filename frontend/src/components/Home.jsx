import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { formatDistanceToNow, parseISO } from 'date-fns';
import API_BASE_URL from "../config/api";

const Home = () => {
  const [blogs, setBlogs] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [access, setAccess] = useState("user");
  const nav = useNavigate();

  const getBlogs = async () => {
    const response = await fetch(`${API_BASE_URL}/blogs`, {
      method: "GET",
    });
    const json = await response.json();
    const filteredBlogs = json.filter(blog => !blog.visibility || blog.visibility === 'public').reverse();
    setBlogs(filteredBlogs);
  };

  const getAccess = async () => {
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
    getBlogs();
    const savedLoginState = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(savedLoginState);
  }, []);

  return (
    <div className="page-shell">
      <Header isLoggedIn={isLoggedIn} username={username} access={access} logout={logout} />

      <main className="app-frame px-3 pb-14 pt-8">
        <section className="hero-grid">
          <div className="glass-card rounded-[1.75rem] p-6 md:p-8">
            <span className="brand-badge">CodeNova Workspace</span>
            <h2 className="section-title mt-5 max-w-2xl">
              Practice problems, ship solutions, and publish coding notes in one polished workspace.
            </h2>
            <p className="section-copy mt-4 max-w-2xl">
              CodeNova brings together a fast problem set, a browser IDE, blog publishing, and personal progress tracking in a single flow inspired by modern coding platforms.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button className="primary-btn" onClick={() => nav('/problemset')}>
                Explore Problems
              </button>
              <button className="secondary-btn" onClick={() => nav('/ide')}>
                Open Workspace
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="metric-tile">
                <p className="metric-label">Public Posts</p>
                <p className="metric-value">{blogs.length}</p>
              </div>
              <div className="metric-tile">
                <p className="metric-label">Your Access</p>
                <p className="metric-value capitalize">{isLoggedIn ? access : 'guest'}</p>
              </div>
              <div className="metric-tile">
                <p className="metric-label">Account</p>
                <p className="metric-value">{username || 'Anonymous'}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[1.75rem] p-6 md:p-8">
            <p className="metric-label">Launchpad</p>
            <div className="mt-5 space-y-4">
              <button className="secondary-btn w-full justify-between" onClick={() => nav('/submissions')}>
                Track submissions
                <span className="text-sky-200">/01</span>
              </button>
              <button className="secondary-btn w-full justify-between" onClick={() => nav('/createblog')}>
                Publish a coding blog
                <span className="text-sky-200">/02</span>
              </button>
              <button className="secondary-btn w-full justify-between" onClick={() => nav(isLoggedIn ? `/profile/${username}` : '/login')}>
                Visit your profile
                <span className="text-sky-200">/03</span>
              </button>
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <p className="metric-label">Why CodeNova</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>Focused interface for problem solving and rapid iteration.</li>
                <li>Built-in coding journal via blogs and private notes.</li>
                <li>Profile stats and streak tracking for visible momentum.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="metric-label">Community Feed</p>
              <h3 className="section-title mt-2">Latest blogs on CodeNova</h3>
            </div>
            <button className="secondary-btn" onClick={() => nav('/createblog')}>
              Write yours
            </button>
          </div>

          <div className="grid gap-5">
            {blogs.length > 0 ? blogs.map((blog, index) => {
              let dateString = '';
              try {
                const date = blog.date ? parseISO(blog.date) : null;
                if (date && !isNaN(date.getTime())) {
                  dateString = formatDistanceToNow(date, { addSuffix: true });
                }
              } catch (error) {
                console.error('Error formatting date:', error);
              }

              return (
                <article key={index} className="glass-card rounded-[1.5rem] p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="brand-badge">Blog</span>
                    {blog.username && <span className="text-sm text-slate-300">By {blog.username}</span>}
                    {dateString && <span className="text-sm text-slate-400">{dateString}</span>}
                  </div>
                  <h4 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">{blog.title}</h4>
                  <div
                    className="section-copy mt-4 text-base"
                    dangerouslySetInnerHTML={{ __html: blog.content.replace(/\n/g, '<br/>') }}
                  />
                </article>
              );
            }) : (
              <div className="glass-card rounded-[1.5rem] p-8 text-center text-slate-400">
                No blogs available yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
