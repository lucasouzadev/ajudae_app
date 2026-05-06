import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, adminVerified, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <span className="text-sm text-slate-500">Verificando acesso...</span>
        </div>
      </div>
    );
  }

  /* Require both a valid session AND a verified admin role.
     adminVerified is set to true only after DB role check in AuthContext. */
  if (!session || !adminVerified) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
