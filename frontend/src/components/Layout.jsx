import {
  Banknote,
  ChevronRight,
  Crown,
  KanbanSquare,
  LayoutDashboard,
  List,
  LogOut,
  Medal,
  Search,
  Settings,
  SquareActivity,
  TrendingUp,
  UserCircle2,
  Users2,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import NotificationBell from "../features/notifications/NotificationBell";

const linkClass = ({ isActive }) =>
  `group flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
    isActive
      ? "bg-brand-600 text-white shadow-[0_10px_24px_rgba(67,56,202,0.32)]"
      : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

export default function Layout({ children }) {
  const { user, clear } = useAuthStore();
  const nav = useNavigate();

  const isManager = user?.role === "MANAGER";
  const isAdmin = user?.role === "ADMIN";
  const initial = (user?.username || user?.role || "U")
    .slice(0, 1)
    .toUpperCase();

  const [term, setTerm] = useState("");
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const [theme, setTheme] = useState(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  const goSearch = () => {
    const t = term.trim();

    if (!t) {
      nav("/leads");
      return;
    }

    const qs = new URLSearchParams({ q: t });
    nav(`/leads?${qs.toString()}`);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";

    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const handleLogout = () => {
    clear();
    nav("/login");
  };

  return (
    <>
      <div className="crm-page-shell">
        <div className="crm-app-frame">
          <aside className="fixed top-0 bottom-0 left-0 w-60 bg-[linear-gradient(180deg,#101b3d_0%,#0b1533_100%)] p-4 hidden md:flex md:flex-col">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-700/30">
                <SquareActivity size={20} />
                {/* Todo add brand image  */}
              </div>
              <div className="text-lg font-extrabold tracking-tight text-white">
                CRM<span className="text-brand-300 ml-2 ">LEADS</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-300 to-emerald-300 text-slate-950 flex items-center justify-center font-bold">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white">
                  {(user?.username || "CRM User").replace(/\b\w/g, (char) =>
                    char.toUpperCase(),
                  )}
                </div>
                <div className="text-[11px] text-slate-300">{user?.role}</div>
              </div>
              <button
                type="button"
                className="p-1 rounded-full hover:bg-white/10 text-slate-300"
                onClick={() => nav("/profile")}
              >
                <ChevronRight size={15} className="text-slate-300" />
              </button>
            </div>

            <nav className="mt-6 space-y-1 animate-in-up">
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Main
              </div>
              <NavLink to="/" className={linkClass}>
                <LayoutDashboard size={16} /> Dashboard
              </NavLink>

              {isAdmin && (
                <NavLink to="/leads" className={linkClass}>
                  <List size={16} /> All Leads
                </NavLink>
              )}

              {!isAdmin && (
                <>
                  <NavLink to="/leads" className={linkClass}>
                    <List size={16} /> Leads
                  </NavLink>

                  <NavLink to="/kanban" className={linkClass}>
                    <KanbanSquare size={16} /> Kanban
                  </NavLink>
                </>
              )}

              {isManager && (
                <NavLink to="/projects" className={linkClass}>
                  <SquareActivity size={16} /> Projects
                </NavLink>
              )}

              {isManager && (
                <NavLink to="/analytics" className={linkClass}>
                  <TrendingUp size={16} /> Analytics
                </NavLink>
              )}

              <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Activity
              </div>

              {isManager && (
                <NavLink to="/team" className={linkClass}>
                  <Users2 size={16} /> Team Performance
                </NavLink>
              )}

              {isManager && (
                <NavLink to="/revenue" className={linkClass}>
                  <Banknote size={16} /> Revenue
                </NavLink>
              )}

              {isManager && (
                <NavLink to="/my-team" className={linkClass}>
                  <Users2 size={16} /> My Team
                </NavLink>
              )}

              {/* {!isAdmin && (
              <NavLink to="/views" className={linkClass}>
                <Bookmark size={16} /> Saved Views
              </NavLink>
            )} */}

              {!isAdmin && (
                <NavLink to="/invoices" className={linkClass}>
                  <Banknote size={16} /> Invoices
                </NavLink>
              )}

              {!isManager && !isAdmin && (
                <NavLink to="/achievements" className={linkClass}>
                  <Medal size={16} /> Achievements
                </NavLink>
              )}

              <NavLink to="/profile" className={linkClass}>
                <UserCircle2 size={16} /> My Profile
              </NavLink>

              <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Settings
              </div>

              <NavLink to="/settings" className={linkClass}>
                <Settings size={16} /> Settings
              </NavLink>
            </nav>

            <div className="mt-auto rounded-2xl bg-[linear-gradient(135deg,rgba(67,56,202,0.48),rgba(79,70,229,0.28))] p-4 ring-1 ring-white/10">
              <div className="flex align-center gap-0">
                <div className="h-9 w-9 text-amber-200">
                  <Crown size={18} />
                </div>
                <div className="text-sm font-bold text-white">CRM LEADS</div>
              </div>
              <div className="mt-1 text-[11px] leading-5 text-slate-300">
                Track leads, followups, teams, and revenue from one workspace.
              </div>
            </div>
          </aside>

          <div className="md:ml-60 min-h-[calc(100vh-2.25rem)]">
            <header className="bg-white/90 backdrop-blur-xl dark:bg-slate-900/90 border-b border-slate-200/60 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
              <div className="font-bold text-slate-950 dark:text-slate-100 tracking-tight text-sm">
                Welcome, {user?.username || "User"}
              </div>

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-6">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goSearch()}
                    placeholder="Search name, phone, company"
                    className="w-full pl-9 pr-12 h-10 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm">
                    ⌘ K
                  </span>
                </div>

                <button
                  type="button"
                  onClick={goSearch}
                  className="crm-btn crm-btn-primary px-4"
                >
                  Search
                </button>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                {/* <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 rounded-full border border-slate-100 bg-white hover:bg-slate-50 dark:hover:bg-slate-800"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <Sun
                      size={18}
                      className="text-slate-700 dark:text-slate-200"
                    />
                  ) : (
                    <Moon size={18} className="text-slate-700" />
                  )}
                </button> */}

                {!isAdmin && <NotificationBell />}

                <button
                  type="button"
                  onClick={() => setShowLogoutPopup(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-soft"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </header>

            <main className="p-4 md:p-6 animate-in-up">{children}</main>
          </div>
        </div>
      </div>

      {/* Logout Popup */}
      {showLogoutPopup &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 w-[340px] rounded-lg shadow-2xl p-5 border border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold mb-3">Logout</h2>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                Are you sure you want to log out?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutPopup(false)}
                  className="px-3 py-1.5 border rounded-md text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
