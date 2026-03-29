import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ApprovedRoute({ children }) {
  const { isApproved } = useAuth();

  if (!isApproved) {
    return <Navigate to="/pending" replace />;
  }

  return children;
}
