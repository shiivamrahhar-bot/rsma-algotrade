import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api/client";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/Login";
import { LoadingSpinner } from "./components/ui";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "auth" | "guest">("loading");

  useEffect(() => {
    api
      .me()
      .then((res) => setStatus(res.authenticated ? "auth" : "guest"))
      .catch(() => setStatus("guest"));
  }, []);

  if (status === "loading") return <LoadingSpinner />;
  if (status === "guest") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/demo" element={<Dashboard demoMode />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
