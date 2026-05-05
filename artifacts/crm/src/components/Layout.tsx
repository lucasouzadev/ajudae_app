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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black text-slate-900">
            A
          </div>
          <div>
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
      <main className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
