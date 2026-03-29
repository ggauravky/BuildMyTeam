import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "../components/common/LoadingScreen";

export function JoinTeamEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, isAuthenticated, isApproved } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    const code = searchParams.get("code");

    if (!isAuthenticated) {
      navigate(`/login${code ? `?code=${code}` : ""}`, { replace: true });
      return;
    }

    if (!isApproved) {
      navigate("/pending", { replace: true });
      return;
    }

    navigate(`/teams${code ? `?code=${code}` : ""}`, { replace: true });
  }, [loading, isAuthenticated, isApproved, navigate, searchParams]);

  return <LoadingScreen message="Preparing team join flow..." />;
}
