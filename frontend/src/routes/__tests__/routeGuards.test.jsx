import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { AdminRoute } from "../AdminRoute";
import { ApprovedRoute } from "../ApprovedRoute";
import { ProtectedRoute } from "../ProtectedRoute";
import { PublicOnlyRoute } from "../PublicOnlyRoute";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = useAuth;

function renderRoute({ initialEntry, routePath, routeElement, fallbackRoutes = [] }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {fallbackRoutes}
        <Route path={routePath} element={routeElement} />
      </Routes>
    </MemoryRouter>
  );
}

describe("route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ProtectedRoute sends anonymous users to login", () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
    });

    renderRoute({
      initialEntry: "/secure",
      routePath: "/secure",
      routeElement: (
        <ProtectedRoute>
          <div>Private area</div>
        </ProtectedRoute>
      ),
      fallbackRoutes: [<Route key="login" path="/login" element={<div>Login page</div>} />],
    });

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  test("ProtectedRoute renders children for authenticated users", () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
    });

    renderRoute({
      initialEntry: "/secure",
      routePath: "/secure",
      routeElement: (
        <ProtectedRoute>
          <div>Private area</div>
        </ProtectedRoute>
      ),
    });

    expect(screen.getByText("Private area")).toBeInTheDocument();
  });

  test("ApprovedRoute redirects unapproved users to pending", () => {
    mockedUseAuth.mockReturnValue({
      isApproved: false,
    });

    renderRoute({
      initialEntry: "/workspace",
      routePath: "/workspace",
      routeElement: (
        <ApprovedRoute>
          <div>Approved workspace</div>
        </ApprovedRoute>
      ),
      fallbackRoutes: [<Route key="pending" path="/pending" element={<div>Pending page</div>} />],
    });

    expect(screen.getByText("Pending page")).toBeInTheDocument();
  });

  test("AdminRoute redirects non-admin users to dashboard", () => {
    mockedUseAuth.mockReturnValue({
      isAdmin: false,
    });

    renderRoute({
      initialEntry: "/admin",
      routePath: "/admin",
      routeElement: (
        <AdminRoute>
          <div>Admin panel</div>
        </AdminRoute>
      ),
      fallbackRoutes: [<Route key="dashboard" path="/dashboard" element={<div>Dashboard page</div>} />],
    });

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  test("PublicOnlyRoute redirects approved users to dashboard", () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      isApproved: true,
    });

    renderRoute({
      initialEntry: "/login",
      routePath: "/login",
      routeElement: (
        <PublicOnlyRoute>
          <div>Public auth page</div>
        </PublicOnlyRoute>
      ),
      fallbackRoutes: [<Route key="dashboard" path="/dashboard" element={<div>Dashboard page</div>} />],
    });

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  test("PublicOnlyRoute keeps anonymous users on auth pages", () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      isApproved: false,
    });

    renderRoute({
      initialEntry: "/register",
      routePath: "/register",
      routeElement: (
        <PublicOnlyRoute>
          <div>Public auth page</div>
        </PublicOnlyRoute>
      ),
    });

    expect(screen.getByText("Public auth page")).toBeInTheDocument();
  });
});
