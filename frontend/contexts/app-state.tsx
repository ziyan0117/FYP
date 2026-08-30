import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'finpulse:v1:state';

export type Toggles = {
  digest: boolean; // "Morning digest" push reminder -- no push infra yet, stored as a preference
  quiet: boolean; // "Only tell me about big swings"
  beginner: boolean; // "Explain the jargon" -- gates JargonText's underlines
};

type PersistedState = {
  hasOnboarded: boolean;
  interests: string[];
  tickers: string[] | null; // null = "not chosen yet, default to the whole watchlist"
  toggles: Toggles;
  storiesRead: number;
  defaultDays: number;
};

const DEFAULT_STATE: PersistedState = {
  hasOnboarded: false,
  interests: [],
  tickers: null,
  toggles: { digest: true, quiet: false, beginner: true },
  storiesRead: 0,
  defaultDays: 7,
};

type AppStateValue = PersistedState & {
  loaded: boolean;
  completeOnboarding: (interests: string[], tickers: string[]) => void;
  setInterests: (interests: string[]) => void;
  setTickers: (tickers: string[]) => void;
  toggleSetting: (key: keyof Toggles) => void;
  incrementStoriesRead: () => void;
  setDefaultDays: (days: number) => void;
  redoOnboarding: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setState({ ...DEFAULT_STATE, ...parsed, toggles: { ...DEFAULT_STATE.toggles, ...parsed.toggles } });
          } catch {
            // Corrupt/old-shape stored value -- fall back to defaults rather
            // than crash the app on launch.
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: PersistedState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Best-effort -- a failed write just means this change doesn't
      // survive a restart; not worth surfacing to the user mid-flow.
    });
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      ...state,
      loaded,
      completeOnboarding: (interests, tickers) =>
        persist({ ...state, hasOnboarded: true, interests, tickers }),
      setInterests: (interests) => persist({ ...state, interests }),
      setTickers: (tickers) => persist({ ...state, tickers }),
      toggleSetting: (key) =>
        persist({ ...state, toggles: { ...state.toggles, [key]: !state.toggles[key] } }),
      incrementStoriesRead: () => persist({ ...state, storiesRead: state.storiesRead + 1 }),
      setDefaultDays: (days) => persist({ ...state, defaultDays: days }),
      redoOnboarding: () => persist({ ...state, hasOnboarded: false }),
    }),
    [state, loaded, persist]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
