// client/src/App.jsx
// Router shell only: site navigation plus the two routes. The live dashboard moved to
// Dashboard.jsx exactly as it was — this file adds routing, not behaviour.
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './Dashboard';
import History from './History';

const navClass = ({ isActive }) =>
  isActive ? 'site-nav__link site-nav__link--current' : 'site-nav__link';

function App() {
  return (
    <>
      <nav className="site-nav">
        <NavLink to="/" end className={navClass}>Dashboard</NavLink>
        <NavLink to="/history" className={navClass}>History</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </>
  );
}

export default App;
