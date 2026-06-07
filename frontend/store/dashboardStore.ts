import { create } from 'zustand';

export type DashboardTab = 'recommendations' | 'admin' | 'member';

interface DashboardState {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeTab: 'recommendations', // Default to recommendations as per sidebar order
  setActiveTab: (tab: DashboardTab) => set({ activeTab: tab }),
}));
