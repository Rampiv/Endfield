export const DUEL_CONFIG = {
  // 🎭 Драфт
  draft: {
    picksCount: 4,        // Сколько персонажей выбирает каждый игрок
    bansCount: 1,         // Сколько банов у каждого игрока
    pickTimeLimit: 120,   // Время на ход (сек)
    extraTime: 300,       // Дополнительное время (сек)
  },

  // ⚔️ Оружие
  weapons: {
    count: 4,             // Сколько оружий нужно выбрать
    // Можно добавить лимиты на повторения, если понадобиется
  },

  // 🔄 Ретраи
  retries: {
    maxRetries: 4,        // Максимальное количество ретраев на игрока
  },

  // 👹 Битва
  battle: {
    // Будущие настройки: лимит времени боя, типы боссов и т.д.
  },
};

// Тип для настроек дуэли (используется в DuelSettings)
export type DuelSettingsType = {
  picksCount: number;
  bansCount: number;
  pickTimeLimit: number;
  extraTime: number;
  weaponsCount: number;
  maxRetries: number;
};

// Хелпер для получения полных настроек (с дефолтами)
export const getDefaultDuelSettings = (): DuelSettingsType => ({
  picksCount: DUEL_CONFIG.draft.picksCount,
  bansCount: DUEL_CONFIG.draft.bansCount,
  pickTimeLimit: DUEL_CONFIG.draft.pickTimeLimit,
  extraTime: DUEL_CONFIG.draft.extraTime,
  weaponsCount: DUEL_CONFIG.weapons.count,
  maxRetries: DUEL_CONFIG.retries.maxRetries,
});