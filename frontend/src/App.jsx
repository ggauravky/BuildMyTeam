import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { CreateTeamPage } from "./pages/CreateTeamPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HackathonsPage } from "./pages/HackathonsPage";
import { HomePage } from "./pages/HomePage";
import { JoinTeamEntryPage } from "./pages/JoinTeamEntryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PendingPage } from "./pages/PendingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TeamWorkspacePage } from "./pages/TeamWorkspacePage";
import { TeamsPage } from "./pages/TeamsPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { AdminRoute } from "./routes/AdminRoute";
import { ApprovedRoute } from "./routes/ApprovedRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/admin/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route path="/profile/:username" element={<ProfilePage />} />

      <Route
        path="/join-team"
        element={
          <ProtectedRoute>
            <JoinTeamEntryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pending"
        element={
          <ProtectedRoute>
            <PendingPage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:id" element={<TeamWorkspacePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <ApprovedRoute>
              <AppShell />
            </ApprovedRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/hackathons" element={<HackathonsPage />} />
        <Route path="/teams/create" element={<CreateTeamPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanelPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
