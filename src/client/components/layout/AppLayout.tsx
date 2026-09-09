import { NavLink, Outlet } from "react-router-dom";
import "./AppLayout.css";

export function AppLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-title">
          <h1>Village Trade Planner</h1>
          <span>Local Trading Route Simulator</span>
        </div>

        <nav className="app-nav">
          <NavLink to="/world">World</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/villages">Villages</NavLink>
          <NavLink to="/routes">Routes</NavLink>
          <NavLink to="/market">Markets</NavLink>
          <NavLink to="/simulator">Simulation</NavLink>
          <NavLink to="/optimizer">Optimizer</NavLink>
          <NavLink to="/settings">Database & Settings</NavLink>
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
