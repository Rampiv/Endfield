export interface Character {
  id: string;
  name: string;
  element: string;
  rarity: string;
  image?: string;
  constellation?: number
}

export interface Weapon {
  id: string;
  name: string;
  type: string;
  rarity: string;
  image?: string;
  constellation?: number
}

// Дуэли

export type DuelStatus =
  | "drafting"
  | "weapons"
  | "fighting"
  | "finished"
  | "cancelled";
export type TurnPhase = "ban" | "pick" | "weapon" | "result";

export interface DuelTimer {
  baseTime: number; // 120 секунд
  extraTime: number; // 300 секунд
  startTime: number; // timestamp начала хода
}

export interface DuelSettings {
  picksCount: number;
  bansCount: number;
  pickTimeLimit: number;
  extraTime: number;
  weaponsCount?: number;
  maxRetries?: number;
}

export interface DuelDraft {
  bans: Record<string, string[]>;
  picks: Record<string, string[]>;
}

export interface DuelResult {
  bossTime: number;
  submittedAt: number;
}

export interface Duel {
  id: string;
  player1: string;
  player2: string;
  status: DuelStatus;
  createdAt: number;
  startedAt?: number;

  settings: DuelSettings;

  currentTurn?: string;
  turnStartTime?: number;
  playerTimers?: Record<string, DuelTimer>;
  retries?: {
    [userId: string]: {
      remaining: number; // Сколько осталось
      max: number; // Максимальное количество
      used: number; // Сколько использовано
    };
  };
  draft?: DuelDraft;
  weapons?: Record<string, string[]>;
  results?: Record<string, DuelResult> & {
    winner?: string;
    finishedAt?: number;
  };
  resultHistory?: {
    [userId: string]: Array<{
      modifiedBy: any;
      bossTime: number;
      submittedAt: number;
      retryCount: number;
      reason?: string;
    }>;
  };
}

export interface DuelInvite {
  id: string;
  from: string;
  to: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}
