import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
} from "firebase/database";
import { db } from "@/lib/firebase";
import { Duel, DuelInvite, DuelSettings } from "@/lib/types";
import { RootState } from "../store";
import { getDefaultDuelSettings } from "../config/duelConfig";

export interface DuelsState {
  activeDuel: Duel | null;
  activeDuels: Duel[];
  finishedDuels: Duel[];
  receivedInvites: DuelInvite[];
  sentInvites: DuelInvite[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

export const initialState: DuelsState = {
  activeDuel: null,
  activeDuels: [],
  finishedDuels: [],
  receivedInvites: [],
  sentInvites: [],
  status: "idle",
  error: null,
};

// 🔄 Сделать ход (бан/пик персонажа)
export const makeDraftMove = createAsyncThunk(
  "duels/makeDraftMove",
  async ({
    duelId,
    userId,
    moveType,
    characterId,
  }: {
    duelId: string;
    userId: string;
    moveType: "ban" | "pick";
    characterId: string;
  }) => {
    const duelRef = ref(db, `duels/${duelId}`);
    const duelSnap = await get(duelRef);
    if (!duelSnap.exists()) throw new Error("Duel not found");

    const duel = duelSnap.val() as Duel;

    if (duel.currentTurn !== userId) throw new Error("Not your turn");

    const draftPath = `draft/${moveType === "ban" ? "bans" : "picks"}/${userId}`;
    const draftRef = ref(db, `duels/${duelId}/${draftPath}`);
    const draftSnap = await get(draftRef);
    const currentList = draftSnap.exists() ? (draftSnap.val() as string[]) : [];

    if (!currentList.includes(characterId)) {
      await set(draftRef, [...currentList, characterId]);
    }

    const nextPlayer = duel.player1 === userId ? duel.player2 : duel.player1;
    await update(ref(db, `duels/${duelId}`), {
      currentTurn: nextPlayer,
      turnStartTime: Date.now(),
    });

    return { duelId, moveType, characterId, nextPlayer, userId };
  },
);

// ⏰ Обновить таймер
export const syncDuelTimer = createAsyncThunk(
  "duels/syncTimer",
  async ({ duelId, userId }: { duelId: string; userId: string }) => {
    const duelSnap = await get(ref(db, `duels/${duelId}`));
    if (!duelSnap.exists()) return null;

    const duel = duelSnap.val() as Duel;
    const timer = duel.playerTimers?.[userId];
    if (!timer) return null;

    const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
    let remainingBase = Math.max(0, timer.baseTime - elapsed);
    let remainingExtra = timer.extraTime;

    if (remainingBase === 0 && remainingExtra > 0) {
      remainingExtra = Math.max(0, remainingExtra - (elapsed - timer.baseTime));
    }

    return {
      userId,
      remainingBase,
      remainingExtra,
      baseTimeLimit: timer.baseTime,
      extraTimeLimit: timer.extraTime,
      startTime: timer.startTime,
      isBaseTimeOut: remainingBase === 0,
    };
  },
);

// 📥 Загрузить все дуэли
export const fetchAllDuels = createAsyncThunk("duels/fetchAll", async () => {
  const duelsSnap = await get(ref(db, "duels"));
  if (!duelsSnap.exists()) return { active: [], finished: [] };

  const duels = Object.entries(duelsSnap.val()).map(([id, data]) => ({
    ...(data as Duel),
    id,
  })) as Duel[];

  const active = duels.filter(
    (d) => d.status !== "finished" && d.status !== "cancelled",
  );
  const finished = duels.filter((d) => d.status === "finished");

  return { active, finished };
});

// 🔄 Realtime-подписка на инвайты
export const subscribeToUserInvites = createAsyncThunk(
  "duels/subscribeInvites",
  async (userId: string, { dispatch }) => {
    const invitesRef = ref(db, "duelInvites");

    onValue(invitesRef, (snapshot) => {
      if (!snapshot.exists()) {
        dispatch(setInvites({ received: [], sent: [] }));
        return;
      }

      const invites = Object.entries(snapshot.val()).map(([id, data]) => ({
        ...(data as DuelInvite),
        id,
      })) as DuelInvite[];

      const received = invites.filter(
        (inv) => inv.to === userId && inv.status === "pending",
      );
      const sent = invites.filter(
        (inv) => inv.from === userId && inv.status === "pending",
      );

      dispatch(setInvites({ received, sent }));
    });

    return undefined;
  },
);

// 📥 Загрузить инвайты
export const fetchUserInvites = createAsyncThunk(
  "duels/fetchInvites",
  async (userId: string) => {
    const invitesSnap = await get(ref(db, "duelInvites"));
    if (!invitesSnap.exists()) return { received: [], sent: [] };

    const invites = Object.entries(invitesSnap.val()).map(([id, data]) => ({
      ...(data as DuelInvite),
      id,
    })) as DuelInvite[];

    const received = invites.filter(
      (inv) => inv.to === userId && inv.status === "pending",
    );
    const sent = invites.filter(
      (inv) => inv.from === userId && inv.status === "pending",
    );

    return { received, sent };
  },
);

// Принять инвайт
export const acceptDuelInvite = createAsyncThunk(
  "duels/acceptInvite",
  async ({
    inviteId,
    settings,
  }: {
    inviteId: string;
    settings?: Partial<DuelSettings>;
  }) => {
    const inviteRef = ref(db, `duelInvites/${inviteId}`);
    const inviteSnap = await get(inviteRef);
    if (!inviteSnap.exists()) throw new Error("Invite not found");

    const invite = inviteSnap.val() as DuelInvite;

    const defaultSettings = getDefaultDuelSettings();
    const finalSettings: DuelSettings = { ...defaultSettings, ...settings };

    const duelRef = push(ref(db, "duels"));
    const duel: Duel = {
      id: duelRef.key!,
      player1: invite.from,
      player2: invite.to,
      status: "drafting",
      createdAt: Date.now(),
      startedAt: Date.now(),
      settings: finalSettings,
      currentTurn: invite.from,
      turnStartTime: Date.now(),
      playerTimers: {
        [invite.from]: {
          baseTime: finalSettings.pickTimeLimit,
          extraTime: finalSettings.extraTime,
          startTime: Date.now(),
        },
        [invite.to]: {
          baseTime: finalSettings.pickTimeLimit,
          extraTime: finalSettings.extraTime,
          startTime: 0,
        },
      },
      draft: {
        bans: { [invite.from]: [], [invite.to]: [] },
        picks: { [invite.from]: [], [invite.to]: [] },
      },
      retries: {
        [invite.from]: {
          remaining: finalSettings.maxRetries || 1,
          max: finalSettings.maxRetries || 1,
          used: 0,
        },
        [invite.to]: {
          remaining: finalSettings.maxRetries || 1,
          max: finalSettings.maxRetries || 1,
          used: 0,
        },
      },
      weapons: {},
    };

    // СТРАХОВКА: Очищаем старые activeDuel перед записью новых
    await Promise.all([
      set(duelRef, duel),
      update(ref(db, `users/${invite.from}/activeDuel`), { activeDuel: null }),
      update(ref(db, `users/${invite.to}/activeDuel`), { activeDuel: null }),
      update(ref(db, `users/${invite.from}/activeDuel`), { duelId: duel.id }),
      update(ref(db, `users/${invite.to}/activeDuel`), { duelId: duel.id }),
      update(inviteRef, { status: "accepted" }),
    ]);

    return duel;
  },
);

// Отклонить инвайт
export const declineDuelInvite = createAsyncThunk(
  "duels/declineInvite",
  async (inviteId: string) => {
    await update(ref(db, `duelInvites/${inviteId}`), { status: "declined" });
    return inviteId;
  },
);

// Отправить инвайт (С УМНОЙ ПРОВЕРКОЙ)
export const sendDuelInvite = createAsyncThunk(
  "duels/sendInvite",
  async ({
    from,
    to,
    settings,
  }: {
    from: string;
    to: string;
    settings?: Partial<DuelSettings>;
  }) => {
    const existingDuelsSnap = await get(ref(db, "duels"));
    const allDuels = existingDuelsSnap.exists()
      ? (existingDuelsSnap.val() as Record<string, Duel>)
      : {};

    // Функция проверки и очистки статуса игрока
    const checkAndCleanPlayer = async (uid: string) => {
      const userSnap = await get(ref(db, `users/${uid}`));
      if (!userSnap.exists()) return false;

      const userData = userSnap.val();
      const activeDuelId = userData?.activeDuel?.duelId;

      if (!activeDuelId) return false; // Игрок свободен

      const duelData = allDuels[activeDuelId];

      // Если дуэли нет в базе ИЛИ она завершена/отменена -> считаем игрока СВОБОДНЫМ
      if (
        !duelData ||
        duelData.status === "finished" ||
        duelData.status === "cancelled"
      ) {
        await update(ref(db, `users/${uid}`), { activeDuel: null });

        console.log(`Cleared stale activeDuel for user ${uid}`);
        return false;
      }

      // Если дуэль активна -> игрок занят
      // Дополнительная проверка: не с этим ли игроком уже идет дуэль?
      if (duelData.player1 === to || duelData.player2 === to) {
        throw new Error("У вас уже есть активная дуэль с этим игроком!");
      }

      return true; // Игрок занят другой дуэлью
    };

    const isFromBusy = await checkAndCleanPlayer(from);
    const isToBusy = await checkAndCleanPlayer(to);

    if (isFromBusy || isToBusy) {
      throw new Error("Один из игроков уже участвует в другой активной дуэли.");
    }

    const inviteRef = push(ref(db, "duelInvites"));
    const invite: DuelInvite = {
      id: inviteRef.key!,
      from,
      to,
      status: "pending",
      createdAt: Date.now(),
    };

    await set(inviteRef, invite);
    return invite;
  },
);

export const submitDuelResult = createAsyncThunk(
  "duels/submitResult",
  async (
    {
      duelId,
      userId,
      bossTime,
      isRetry = false,
      reason,
    }: {
      duelId: string;
      userId: string;
      bossTime: number;
      isRetry?: boolean;
      reason?: string | null;
    },
    { getState },
  ) => {
    const state = getState() as RootState;
    const duel = state.duels.activeDuel;
    const userRole = state.auth.user?.role;

    if (!duel) throw new Error("Duel not found");

    if (duel.status !== "fighting" && duel.status !== "finished") {
      throw new Error("Duel is not in fight phase");
    }

    if (isRetry && userRole !== "admin") {
      const userRetries = duel.retries?.[userId];
      if (!userRetries || userRetries.remaining <= 0) {
        throw new Error("No retries remaining");
      }
    }

    const duelRef = ref(db, `duels/${duelId}`);
    const updates: Record<string, any> = {};

    const historyEntry = {
      bossTime,
      submittedAt: Date.now(),
      retryCount:
        (duel.resultHistory?.[userId]?.length || 0) + (isRetry ? 1 : 0),
      reason: isRetry ? reason || null : null,
    };

    updates[`resultHistory/${userId}`] = [
      ...(duel.resultHistory?.[userId] || []),
      historyEntry,
    ];

    updates[`results/${userId}`] = {
      bossTime,
      submittedAt: historyEntry.submittedAt,
    };

    if (isRetry && userRole !== "admin" && duel.retries?.[userId]) {
      updates[`retries/${userId}/remaining`] =
        duel.retries[userId].remaining - 1;
      updates[`retries/${userId}/used`] = (duel.retries[userId].used || 0) + 1;
    }

    const newResults = {
      ...duel.results,
      [userId]: { bossTime, submittedAt: Date.now() },
    };

    const p1Result = newResults[duel.player1];
    const p2Result = newResults[duel.player2];

    if (p1Result?.bossTime !== undefined && p2Result?.bossTime !== undefined) {
      const p1Time = Number(p1Result.bossTime);
      const p2Time = Number(p2Result.bossTime);

      let winner: string | null = null;
      const epsilon = 0.001;

      if (Math.abs(p1Time - p2Time) < epsilon) {
        winner = null;
      } else if (p1Time < p2Time) {
        winner = duel.player1;
      } else {
        winner = duel.player2;
      }

      updates["results/winner"] = winner;
      updates["results/finishedAt"] = Date.now();

      if (duel.status !== "finished") {
        updates["status"] = "finished";
      }
    }

    await update(duelRef, updates);
    return { duelId, userId, bossTime, isRetry };
  },
);

// Админский ретрай
export const adminRetryResult = createAsyncThunk(
  "duels/adminRetry",
  async ({
    duelId,
    targetUserId,
    bossTime,
    reason,
  }: {
    duelId: string;
    targetUserId: string;
    bossTime: number;
    reason: string;
  }) => {
    await update(ref(db, `duels/${duelId}/results/${targetUserId}`), {
      bossTime,
      submittedAt: Date.now(),
      modifiedBy: "admin",
    });

    const duelSnap = await get(ref(db, `duels/${duelId}`));
    const duel = duelSnap.val() as Duel;

    await update(ref(db, `duels/${duelId}/resultHistory/${targetUserId}`), {
      bossTime,
      submittedAt: Date.now(),
      retryCount: (duel.resultHistory?.[targetUserId]?.length || 0) + 1,
      reason,
      modifiedBy: "admin",
    });

    return { duelId, targetUserId, bossTime };
  },
);

// Загрузить активную дуэль
export const subscribeToActiveDuel = createAsyncThunk(
  "duels/subscribe",
  async (userId: string) => {
    const duelRef = ref(db, `duels`);

    return new Promise<Duel | null>((resolve) => {
      const unsubscribe = onValue(duelRef, (snapshot) => {
        if (!snapshot.exists()) {
          resolve(null);
          return;
        }

        const duels = snapshot.val();
        const duelsObject = duels as Record<string, Duel>;

        const activeDuel = Object.values(duelsObject).find(
          (duel) =>
            (duel.player1 === userId || duel.player2 === userId) &&
            duel.status !== "finished" &&
            duel.status !== "cancelled",
        );

        resolve(activeDuel || null);
      });

      return () => off(duelRef);
    });
  },
);

// Сохранить выбор оружия
export const submitDuelWeapons = createAsyncThunk(
  "duels/submitWeapons",
  async ({
    duelId,
    userId,
    weaponIds,
  }: {
    duelId: string;
    userId: string;
    weaponIds: string[];
  }) => {
    const duelRef = ref(db, `duels/${duelId}`);
    const duelSnap = await get(duelRef);

    if (!duelSnap.exists()) throw new Error("Duel not found");
    const duel = duelSnap.val() as Duel;

    const requiredCount =
      duel.settings.weaponsCount || getDefaultDuelSettings().weaponsCount;

    if (duel.weapons?.[userId]?.length) {
      throw new Error("Вы уже выбрали оружие");
    }

    const userWeaponsRef = ref(db, `duels/${duelId}/weapons/${userId}`);
    await set(userWeaponsRef, weaponIds);

    const p1Count =
      duel.weapons?.[duel.player1]?.length ||
      (duel.player1 === userId ? weaponIds.length : 0);
    const p2Count =
      duel.weapons?.[duel.player2]?.length ||
      (duel.player2 === userId ? weaponIds.length : 0);

    if (p1Count >= requiredCount && p2Count >= requiredCount) {
      await update(duelRef, {
        status: "fighting",
        currentTurn: duel.player1,
        turnStartTime: Date.now(),
      });
    }

    return { userId, weaponIds };
  },
);

// Админ: Отменить последний выбор
export const adminUndoPick = createAsyncThunk(
  "duels/adminUndoPick",
  async ({
    duelId,
    playerId,
    moveType,
  }: {
    duelId: string;
    playerId: string;
    moveType: "ban" | "pick";
  }) => {
    const duelRef = ref(db, `duels/${duelId}`);
    const duelSnap = await get(duelRef);

    if (!duelSnap.exists()) throw new Error("Duel not found");
    const duel = duelSnap.val() as Duel;

    const path = moveType === "ban" ? "bans" : "picks";
    const currentList = duel.draft?.[path]?.[playerId] || [];

    if (currentList.length === 0) {
      throw new Error(
        `У игрока нет ${moveType === "ban" ? "банов" : "пиков"} для отмены`,
      );
    }

    const newList = currentList.slice(0, -1);

    await update(duelRef, {
      [`draft/${path}/${playerId}`]: newList,
      currentTurn: playerId,
      turnStartTime: Date.now(),
    });

    return { duelId, playerId, moveType, newList };
  },
);

const duelsSlice = createSlice({
  name: "duels",
  initialState,
  reducers: {
    clearActiveDuel: (state) => {
      state.activeDuel = null;
    },
    setActiveDuel: (state, action: PayloadAction<Duel | null>) => {
      state.activeDuel = action.payload;
    },
    setLocalTimer: (
      state,
      action: PayloadAction<{
        userId: string;
        baseTime: number;
        extraTime: number;
      }>,
    ) => {
      if (state.activeDuel?.playerTimers) {
        state.activeDuel.playerTimers[action.payload.userId] = {
          ...state.activeDuel.playerTimers[action.payload.userId],
          baseTime: action.payload.baseTime,
          extraTime: action.payload.extraTime,
        };
      }
    },
    setInvites: (
      state,
      action: PayloadAction<{ received: DuelInvite[]; sent: DuelInvite[] }>,
    ) => {
      state.receivedInvites = action.payload.received;
      state.sentInvites = action.payload.sent;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendDuelInvite.pending, (state) => {
        state.status = "loading";
      })
      .addCase(sendDuelInvite.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.sentInvites.push(action.payload);
      })
      .addCase(sendDuelInvite.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Ошибка отправки инвайта";
      })
      .addCase(acceptDuelInvite.fulfilled, (state, action) => {
        state.activeDuel = action.payload;
        state.status = "succeeded";
      })
      .addCase(declineDuelInvite.fulfilled, (state, action) => {
        state.receivedInvites = state.receivedInvites.filter(
          (inv) => inv.id !== action.payload,
        );
      })
      .addCase(fetchAllDuels.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllDuels.fulfilled, (state, action) => {
        state.activeDuels = action.payload.active;
        state.finishedDuels = action.payload.finished;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(fetchAllDuels.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Ошибка загрузки дуэлей";
      })
      .addCase(fetchUserInvites.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserInvites.fulfilled, (state, action) => {
        state.receivedInvites = action.payload.received;
        state.sentInvites = action.payload.sent;
      })
      .addCase(fetchUserInvites.rejected, (state, action) => {
        state.error = action.error.message || "Ошибка загрузки инвайтов";
      })
      .addCase(makeDraftMove.fulfilled, (state, action) => {
        if (
          state.activeDuel?.id === action.payload.duelId &&
          state.activeDuel.draft
        ) {
          const path = action.payload.moveType === "ban" ? "bans" : "picks";
          const userId = action.payload.userId;

          if (!state.activeDuel.draft[path][userId]) {
            state.activeDuel.draft[path][userId] = [];
          }

          const draftArray = state.activeDuel.draft[path][userId] as string[];
          if (!draftArray.includes(action.payload.characterId)) {
            draftArray.push(action.payload.characterId);
          }

          state.activeDuel.currentTurn = action.payload.nextPlayer;
        }
      })
      .addCase(submitDuelResult.fulfilled, (state, action) => {
        if (state.activeDuel?.id === action.payload.duelId) {
          if (!state.activeDuel.results) {
            state.activeDuel.results = {};
          }
          state.activeDuel.results[action.payload.userId] = {
            bossTime: action.payload.bossTime,
            submittedAt: Date.now(),
          };

          if (
            action.payload.isRetry === false &&
            state.activeDuel.results[state.activeDuel.player1]?.bossTime &&
            state.activeDuel.results[state.activeDuel.player2]?.bossTime
          ) {
            state.activeDuel.status = "finished";
          }
        }
      });
  },
});

export const { clearActiveDuel, setLocalTimer, setInvites, setActiveDuel } =
  duelsSlice.actions;
export default duelsSlice.reducer;
