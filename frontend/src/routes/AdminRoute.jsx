import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AdminRoute({ children }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
