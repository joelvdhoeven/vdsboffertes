import { useState, useEffect, useCallback } from 'react';
import {
  getAIConfig,
  clearAICache,
  getCorrectionsStats,
  exportCorrections,
} from '../services/api';
import type { RoomSettings, PriceSettings, DisplaySettings, AIConfigResponse, CorrectionsStats } from '../types/settings';

const defaultRooms: RoomSettings = {
  algemeen_woning: { name: 'Algemeen Woning', enabled: true },
  hal_overloop: { name: 'Hal/Overloop', enabled: true },
  woonkamer: { name: 'Woonkamer', enabled: true },
  keuken: { name: 'Keuken', enabled: true },
  toilet: { name: 'Toilet', enabled: true },
  badkamer: { name: 'Badkamer', enabled: true },
  slaapk_voor_kl: { name: 'Slaapkamer Voor (klein)', enabled: true },
  slaapk_voor_gr: { name: 'Slaapkamer Voor (groot)', enabled: true },
  slaapk_achter_kl: { name: 'Slaapkamer Achter (klein)', enabled: true },
  slaapk_achter_gr: { name: 'Slaapkamer Achter (groot)', enabled: true },
  zolder: { name: 'Zolder', enabled: true },
  berging: { name: 'Berging', enabled: true },
  meerwerk: { name: 'Meerwerk', enabled: true },
};

interface UseSettingsReturn {
  rooms: RoomSettings;
  prices: PriceSettings;
  display: DisplaySettings;
  aiConfig: AIConfigResponse | null;
  correctionsStats: CorrectionsStats | null;
  isLoading: boolean;
  updateRoom: (key: string, config: RoomSettings[string]) => void;
  updatePrices: (prices: PriceSettings) => void;
  updateDisplay: (display: DisplaySettings) => void;
  saveRooms: () => void;
  savePrices: () => void;
  saveDisplay: () => void;
  saveAll: () => void;
  resetRooms: () => void;
  refreshAIStatus: () => Promise<void>;
  clearCache: () => Promise<void>;
  exportCorrectionsData: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [rooms, setRooms] = useState<RoomSettings>(() => {
    const saved = localStorage.getItem('roomSettings');
    return saved ? JSON.parse(saved) : defaultRooms;
  });

  const [prices, setPrices] = useState<PriceSettings>(() => {
    const saved = localStorage.getItem('priceSettings');
    return saved ? JSON.parse(saved) : { btwHoog: 21, btwLaag: 9, uurtarief: 45 };
  });

  const [display, setDisplay] = useState<DisplaySettings>(() => {
    const saved = localStorage.getItem('displaySettings');
    return saved ? JSON.parse(saved) : { companyName: 'Van der Speld Bouw', offertePrefix: 'OFF-' };
  });

  const [aiConfig, setAiConfig] = useState<AIConfigResponse | null>(null);
  const [correctionsStats, setCorrectionsStats] = useState<CorrectionsStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateRoom = useCallback((key: string, config: RoomSettings[string]) => {
    setRooms((prev) => ({ ...prev, [key]: config }));
  }, []);

  const updatePrices = useCallback((newPrices: PriceSettings) => {
    setPrices(newPrices);
  }, []);

  const updateDisplay = useCallback((newDisplay: DisplaySettings) => {
    setDisplay(newDisplay);
  }, []);

  const saveRooms = useCallback(() => {
    localStorage.setItem('roomSettings', JSON.stringify(rooms));
  }, [rooms]);

  const savePrices = useCallback(() => {
    localStorage.setItem('priceSettings', JSON.stringify(prices));
  }, [prices]);

  const saveDisplay = useCallback(() => {
    localStorage.setItem('displaySettings', JSON.stringify(display));
  }, [display]);

  const saveAll = useCallback(() => {
    saveRooms();
    savePrices();
    saveDisplay();
  }, [saveRooms, savePrices, saveDisplay]);

  const resetRooms = useCallback(() => {
    setRooms(defaultRooms);
    localStorage.removeItem('roomSettings');
  }, []);

  const refreshAIStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const [config, stats] = await Promise.all([
        getAIConfig(),
        getCorrectionsStats(),
      ]);
      setAiConfig(config);
      setCorrectionsStats(stats);
    } catch (error) {
      console.error('Failed to refresh AI status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      setIsLoading(true);
      await clearAICache();
      await refreshAIStatus();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAIStatus]);

  const exportCorrectionsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await exportCorrections();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `corrections_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export corrections:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAIStatus();
  }, [refreshAIStatus]);

  return {
    rooms,
    prices,
    display,
    aiConfig,
    correctionsStats,
    isLoading,
    updateRoom,
    updatePrices,
    updateDisplay,
    saveRooms,
    savePrices,
    saveDisplay,
    saveAll,
    resetRooms,
    refreshAIStatus,
    clearCache,
    exportCorrectionsData,
  };
}

