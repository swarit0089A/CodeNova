import { NavLink, useNavigate } from 'react-router-dom';

const Header = ({ isLoggedIn, username, access, logout, wide = false, compact = false }) => {
  const nav = useNavigate();
  const links = [
    { to: '/', label: 'Home' },
    { to: '/problemset', label: 'Problems' },
    { to: '/ide', label: 'Workspace' },
    { to: '/createblog', label: 'Write' },
    { to: '/submissions', label: 'Submissions' },
  ];

  if (isLoggedIn) {
    links.push({ to: '/notes', label: 'Notes' });
    links.push({ to: '/manageblogs', label: 'Manage' });
  }

  if (access === 'admin') {
    links.splice(4, 0, { to: '/createproblem', label: 'Create Problem' });
  }

  return (
    <div className="top-nav">
      <div className={`${wide ? 'workspace-page-frame' : 'app-frame'} px-2 ${compact ? 'py-2' : 'py-4'}`}>
        <div className={`glass-card ${compact ? 'rounded-[1.1rem] px-3 py-3 md:px-4' : 'rounded-[1.5rem] px-4 py-4 md:px-6'}`}>
          <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
            <div className={`flex flex-col justify-between ${compact ? 'gap-3' : 'gap-4'} md:flex-row md:items-center`}>
              <div
                onClick={() => nav('/')}
                className="brand-wordmark cursor-pointer"
              >
                <span className="brand-logo">&lt;/&gt;</span>
                <div>
                  <p className={`${compact ? 'text-[10px]' : 'text-xs'} uppercase tracking-[0.32em] text-sky-200/70`}>Code Faster</p>
                  <h1 className={`${compact ? 'text-[1.95rem] md:text-[2.2rem]' : 'text-2xl md:text-3xl'} font-bold tracking-[-0.05em] text-white`}>CodeNova</h1>
                </div>
              </div>

              <div className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-3'}`}>
                <span className={`brand-badge ${compact ? 'compact-badge' : ''}`}>Modern Coding Platform</span>
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => nav(`/profile/${username}`)}
                      className={`secondary-btn ${compact ? 'topnav-action' : ''}`}
                    >
                      @{username}
                    </button>
                    <button
                      onClick={logout}
                      className={`danger-btn ${compact ? 'topnav-action' : ''}`}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => nav('/login')}
                      className={`secondary-btn ${compact ? 'topnav-action' : ''}`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => nav('/register')}
                      className={`primary-btn ${compact ? 'topnav-action' : ''}`}
                    >
                      Create Account
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'bg-blue-500/15 text-blue-100' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

