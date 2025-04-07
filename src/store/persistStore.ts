import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  theme: 'light' | 'dark';
  replaySpeed: number;
  chartColors: string[];
  autoSave: boolean;
}

interface PersistStore {
  preferences: UserPreferences;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  recentModels: string[];
  addRecentModel: (modelId: string) => void;
  clearRecentModels: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  replaySpeed: 1000,
  chartColors: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'],
  autoSave: true,
};

export const usePersistStore = create<PersistStore>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
      recentModels: [],
      addRecentModel: (modelId) =>
        set((state) => ({
          recentModels: [
            modelId,
            ...state.recentModels.filter((id) => id !== modelId),
          ].slice(0, 10),
        })),
      clearRecentModels: () => set({ recentModels: [] }),
    }),
    {
      name: 'game-theory-storage',
      partialize: (state) => ({
        preferences: state.preferences,
        recentModels: state.recentModels,
      }),
    }
  )
);
