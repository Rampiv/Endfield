import { renderWithProviders, RootState } from "@/lib/utils/test-utils";
import { DraftPhase } from "./DraftPhase";
import { screen, within } from "@testing-library/react"; // ✅ Добавили within
import { Duel, Character } from "@/lib/types";

jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

const mockCharacters: Character[] = [
  {
    id: "char1",
    name: "Hero 1",
    element: "fire",
    rarity: "5",
    image: "url1",
    constellation: 0,
  },
  {
    id: "char2",
    name: "Hero 2",
    element: "water",
    rarity: "5",
    image: "url2",
    constellation: 1,
  },
];

const createMockDuel = (overrides?: Partial<Duel>): Duel => ({
  id: "duel-1",
  player1: "user1",
  player2: "user2",
  status: "drafting",
  currentTurn: "user1",
  createdAt: 100,
  startedAt: 100,
  settings: {
    picksCount: 2,
    bansCount: 1,
    pickTimeLimit: 120,
    extraTime: 300,
    maxRetries: 3,
    weaponsCount: 4,
  },
  draft: { bans: { user1: [], user2: [] }, picks: { user1: [], user2: [] } },
  playerTimers: {
    user1: { baseTime: 120, extraTime: 300, startTime: Date.now() },
    user2: { baseTime: 120, extraTime: 300, startTime: 0 },
  },
  retries: {
    user1: { max: 3, remaining: 3, used: 0 },
    user2: { max: 3, remaining: 3, used: 0 },
  },
  results: {},
  weapons: {},
  ...overrides,
});

const getPreloadedState = (
  overrides?: Partial<RootState>,
): Partial<RootState> => ({
  auth: {
    user: {
      uid: "user1",
      role: "user",
      displayName: "Player One",
      email: "test@test.com",
      emailVerified: false,
    },
    status: "succeeded",
    error: null,
  },
  characters: {
    items: mockCharacters,
    status: "succeeded",
    error: null,
  },
  weapons: {
    items: [],
    status: "idle",
    error: null,
  },
  users: {
    list: [
      {
        uid: "user1",
        displayName: "Player One",
        email: "p1@test.com",
        role: "user",
        characters: { char1: { addedAt: 1 }, char2: { addedAt: 2 } },
        weapons: {},
      },
      {
        uid: "user2",
        displayName: "Player Two",
        email: "p2@test.com",
        role: "user",
        characters: {},
        weapons: {},
      },
    ] as any,
    status: "succeeded",
  },
  adminSettings: {
    maxTeamCost: 10,
    maxWeaponCost: 10,
    status: "succeeded",
    error: null,
  },
  duels: {
    activeDuel: null,
    activeDuels: [],
    finishedDuels: [],
    receivedInvites: [],
    sentInvites: [],
    status: "idle",
    error: null,
  },
  ...overrides,
});

describe("DraftPhase Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("должен отображать индикатор стоимости пула", () => {
    const duel = createMockDuel();
    renderWithProviders(<DraftPhase duel={duel} currentUserId="user1" />, {
      preloadedState: getPreloadedState({
        duels: {
          activeDuel: duel,
          activeDuels: [],
          finishedDuels: [],
          receivedInvites: [],
          sentInvites: [],
          status: "idle",
          error: null,
        },
      }),
    });

    const weightIcons = screen.getAllByText(/⚖️/i);
    expect(weightIcons).toHaveLength(2);
    expect(weightIcons[0]).toBeInTheDocument();
    const costTexts = screen.getAllByText(/3 \/ 10/i);
    expect(costTexts.length).toBeGreaterThan(0);
  });

  it("должен отображать имена игроков", () => {
    const duel = createMockDuel();
    renderWithProviders(<DraftPhase duel={duel} currentUserId="user1" />, {
      preloadedState: getPreloadedState({
        duels: {
          activeDuel: duel,
          activeDuels: [],
          finishedDuels: [],
          receivedInvites: [],
          sentInvites: [],
          status: "idle",
          error: null,
        },
      }),
    });

    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("Player Two")).toBeInTheDocument();
  });

  it("должен показывать кнопки действий, если мой ход", () => {
    const duelMyTurn = createMockDuel({ currentTurn: "user1" });

    const { container } = renderWithProviders(
      <DraftPhase duel={duelMyTurn} currentUserId="user1" />,
      {
        preloadedState: getPreloadedState({
          duels: {
            activeDuel: duelMyTurn,
            activeDuels: [],
            finishedDuels: [],
            receivedInvites: [],
            sentInvites: [],
            status: "idle",
            error: null,
          },
        }),
      },
    );

    const myColumn = container.querySelector(".column.me") as HTMLElement;
    expect(myColumn).toBeInTheDocument();

    if (myColumn) {
      const waitingMsg = within(myColumn).queryByText(/ожидание хода/i);
      expect(waitingMsg).not.toBeInTheDocument();

      const banButtons = within(myColumn).queryAllByRole("button", {
        name: /🚫/i,
      });

      expect(banButtons.length).toBeGreaterThan(0);
    }
  });

  it("должен запрещать действие, если не мой ход", () => {
    const duelEnemyTurn = createMockDuel({ currentTurn: "user2" });

    const { container } = renderWithProviders(
      <DraftPhase duel={duelEnemyTurn} currentUserId="user1" />,
      {
        preloadedState: getPreloadedState({
          duels: {
            activeDuel: duelEnemyTurn,
            activeDuels: [],
            finishedDuels: [],
            receivedInvites: [],
            sentInvites: [],
            status: "idle",
            error: null,
          },
        }),
      },
    );

    const myColumn = container.querySelector(".column.me") as HTMLElement;
    expect(myColumn).toBeInTheDocument();

    if (myColumn) {
      const banButtons = within(myColumn).queryAllByRole("button", {
        name: /🚫/i,
      });
      expect(banButtons).toHaveLength(0);

      const waitingMsg = within(myColumn).getByText(/ожидание хода/i);
      expect(waitingMsg).toBeInTheDocument();
    }
  });
});
