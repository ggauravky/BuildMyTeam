import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "../components/common/LoadingScreen";

export function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated, isApproved } = useAuth();

  if (loading) {
    return <LoadingScreen message="Preparing workspace..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={isApproved ? "/dashboard" : "/pending"} replace />;
  }

  return children;
}
