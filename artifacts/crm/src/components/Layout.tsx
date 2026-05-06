import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { to: "/", icon: "⊞", label: "Dashboard" },
  { to: "/providers", icon: "🚚", label: "Prestadores" },
  { to: "/documents", icon: "📄", label: "Documentos" },
  { to: "/tickets", icon: "🎫", label: "Tickets" },
  { to: "/forms", icon: "📋", label: "Formulários" },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:relative md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black text-slate-900">
            A
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">Ajudaê</div>
            <div className="text-xs text-slate-400">Painel CRM</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Menu
          </div>
          <ul className="space-y-0.5">
            {NAV.map(({ to, icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-yellow-50 text-yellow-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <span className="text-base leading-none">{icon}</span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User / sign out */}
        <div className="border-t border-slate-100 p-4">
          <div className="mb-2 truncate text-xs text-slate-500">{user?.email}</div>
          <button
            onClick={signOut}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Abrir menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect y="2" width="16" height="2" rx="1" />
              <rect y="7" width="16" height="2" rx="1" />
              <rect y="12" width="16" height="2" rx="1" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-sm font-black text-slate-900">
              A
            </div>
            <span className="text-sm font-bold text-slate-900">Ajudaê CRM</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
