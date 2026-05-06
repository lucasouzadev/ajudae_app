import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Providers } from "@/pages/Providers";
import { Documents } from "@/pages/Documents";
import { Tickets } from "@/pages/Tickets";
import { Forms } from "@/pages/Forms";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/forms" element={<Forms />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
