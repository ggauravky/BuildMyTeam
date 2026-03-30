import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { hackathonApi } from "../../api/hackathon.api";
import { joinRequestApi } from "../../api/joinRequest.api";
import { teamApi } from "../../api/team.api";
import { TeamsPage } from "../TeamsPage";

vi.mock("../../api/team.api", () => ({
  teamApi: {
    list: vi.fn(),
  },
}));

vi.mock("../../api/hackathon.api", () => ({
  hackathonApi: {
    list: vi.fn(),
  },
}));

vi.mock("../../api/joinRequest.api", () => ({
  joinRequestApi: {
    createByCode: vi.fn(),
  },
}));

vi.mock("../../components/teams/TeamCard", () => ({
  TeamCard: ({ team }) => <div>{team.name}</div>,
}));

vi.mock("../../components/teams/QRCodeScanner", () => ({
  QRCodeScanner: ({ onCodeDetected }) => (
    <button type="button" onClick={() => onCodeDetected("AB12CD34EF")}>
      Mock Scan
    </button>
  ),
}));

function renderTeamsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/teams"]}>
        <Routes>
          <Route path="/teams" element={<TeamsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TeamsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamApi.list.mockResolvedValue({ teams: [] });
    hackathonApi.list.mockResolvedValue({ hackathons: [] });
    joinRequestApi.createByCode.mockResolvedValue({ message: "ok" });
  });

  test("blocks invalid join code submission", async () => {
    renderTeamsPage();

    await waitFor(() => {
      expect(teamApi.list).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("Enter code"), {
      target: { value: "12" },
    });

    fireEvent.click(screen.getByRole("button", { name: /request to join/i }));

    expect(await screen.findByText(/valid join code/i)).toBeInTheDocument();
    expect(joinRequestApi.createByCode).not.toHaveBeenCalled();
  });

  test("applies search input with debounce", async () => {
    renderTeamsPage();

    await waitFor(() => {
      expect(teamApi.list).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByPlaceholderText(/nexus builders/i), {
      target: { value: "Alpha Builders" },
    });

    await waitFor(() => {
      expect(teamApi.list).toHaveBeenLastCalledWith({
        search: "Alpha Builders",
        hackathon: "",
      });
    }, { timeout: 1200 });
  });

  test("fills join code from scanner callback", async () => {
    renderTeamsPage();

    await waitFor(() => {
      expect(teamApi.list).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Mock Scan" }));

    expect(screen.getByPlaceholderText("Enter code")).toHaveValue("AB12CD34EF");
  });
});
