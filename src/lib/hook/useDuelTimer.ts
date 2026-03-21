// src/lib/hooks/useDuelTimer.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { syncDuelTimer, setLocalTimer } from '@/lib/slices/duelsSlice';

export function useDuelTimer(duelId: string, userId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const [timeLeft, setTimeLeft] = useState({ base: 0, extra: 0, total: 0 });
  const [isNegative, setIsNegative] = useState(false);

  const syncTimer = useCallback(async () => {
    const result = await dispatch(syncDuelTimer({ duelId, userId })).unwrap();
    if (result) {
      // ✅ Рассчитываем общее время (может быть отрицательным)
      let total = result.remainingBase + result.remainingExtra;
      
      // ✅ Если базовое время вышло, начинаем отсчёт в минус
      if (result.remainingBase === 0 && result.remainingExtra === 0) {
        // Считаем, сколько времени прошло сверх лимита
        const elapsed = Math.floor((Date.now() - (result.startTime || 0)) / 1000);
        const timeLimit = (result.baseTimeLimit || 120) + (result.extraTimeLimit || 300);
        total = timeLimit - elapsed; // Может быть отрицательным
        
        // ✅ Останавливаем на -300
        if (total < -300) {
          total = -300;
        }
      }
      
      setTimeLeft({ 
        base: result.remainingBase, 
        extra: result.remainingExtra, 
        total 
      });
      setIsNegative(total < 0);
      
      dispatch(setLocalTimer({ 
        userId, 
        baseTime: result.remainingBase, 
        extraTime: Math.max(0, result.remainingExtra) 
      }));
    }
  }, [dispatch, duelId, userId]);

  useEffect(() => {
    if (!duelId || !userId) return;
    
    syncTimer();
    
    // ✅ Обновляем каждую секунду, даже если время отрицательное
    const interval = setInterval(syncTimer, 1000);
    
    return () => clearInterval(interval);
  }, [duelId, userId, syncTimer]);

  const formatTime = (seconds: number) => {
    const abs = Math.abs(seconds);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    baseTimeLeft: timeLeft.base,
    extraTimeLeft: timeLeft.extra,
    totalTime: timeLeft.total,
    isNegative,
    isStopped: timeLeft.total <= -300, // ✅ Остановлено на -300
    formatted: formatTime(timeLeft.total),
    refresh: syncTimer,
  };
}