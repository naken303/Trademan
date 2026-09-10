import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./AppLayout.css";

const management = [["/world", "World"], ["/products", "Products"], ["/villages", "Villages"], ["/routes", "Routes"], ["/market", "Markets"]] as const;
const planning = [["/simulator", "Simulation"], ["/optimizer", "Optimizer"]] as const;

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = (items: readonly (readonly [string, string])[]) => items.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</NavLink>);
  return <div className="app-layout">
    <header className="mobile-header"><div><strong>Village Trade Planner</strong><span>Strategy dashboard</span></div><button type="button" className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? "Close" : "Menu"}</button></header>
    <aside className={`app-sidebar${menuOpen ? " open" : ""}`}>
      <div className="app-title"><span className="brand-mark" aria-hidden="true">VT</span><div><h1>Village Trade Planner</h1><span>Strategy dashboard</span></div></div>
      <nav id="main-navigation" className="app-nav" aria-label="Main navigation"><div className="nav-group"><span>World management</span>{links(management)}</div><div className="nav-group"><span>Planning tools</span>{links(planning)}</div><div className="nav-group nav-settings">{links([["/settings", "Database & Settings"]])}</div></nav>
    </aside>
    {menuOpen && <button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <main className="app-content"><Outlet /></main>
  </div>;
}
