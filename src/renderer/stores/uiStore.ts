import { create } from 'zustand';

const EXPANDED_KEY = 'navPanel-expanded';
const EXPANDED_TOPICS_KEY = 'navPanel-expandedTopics';

interface UIStore {
  navExpanded: boolean;
  expandedTopics: Record<string, boolean>;
  showSearch: boolean;
  showNotifications: boolean;

  setNavExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  toggleTopic: (topic: string) => void;
  setShowSearch: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  navExpanded: (() => {
    try {
      const stored = localStorage.getItem(EXPANDED_KEY);
      return stored !== 'false';
    } catch {
      return true;
    }
  })(),
  expandedTopics: (() => {
    try {
      const stored = localStorage.getItem(EXPANDED_TOPICS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })(),
  showSearch: false,
  showNotifications: false,

  setNavExpanded: (expandedOrFn) =>
    set((state) => {
      const next =
        typeof expandedOrFn === 'function'
          ? expandedOrFn(state.navExpanded)
          : expandedOrFn;
      try {
        localStorage.setItem(EXPANDED_KEY, String(next));
      } catch { /* noop */ }
      return { navExpanded: next };
    }),
  toggleTopic: (topic) =>
    set((state) => {
      const next = { ...state.expandedTopics, [topic]: !state.expandedTopics[topic] };
      try {
        localStorage.setItem(EXPANDED_TOPICS_KEY, JSON.stringify(next));
      } catch { /* noop */ }
      return { expandedTopics: next };
    }),
  setShowSearch: (show) => set({ showSearch: show }),
  setShowNotifications: (show) => set({ showNotifications: show }),
}));
