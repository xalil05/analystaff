import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, Player, Match, MatchDetail, TrainingSession, WorkPlan, Evaluation, Suggestion } from "@/types";

// ─── Store auth ──────────────────────────────────────────────────────────────────

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) =>
        set({ token, user, isAuthenticated: true }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
      setUser: (user) =>
        set({ user, isAuthenticated: true }),
    }),
    {
      name: "analystaff-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ─── Store joueurs ──────────────────────────────────────────────────────────────

interface PlayerStore {
  joueurs: Player[];
  selectedJoueurId: string | null;
  isLoading: boolean;
  error: string | null;
  setJoueurs: (joueurs: Player[]) => void;
  setSelectedJoueur: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlayerStore = create<PlayerStore>()((set) => ({
  joueurs: [],
  selectedJoueurId: null,
  isLoading: false,
  error: null,
  setJoueurs: (joueurs) => set({ joueurs }),
  setSelectedJoueur: (id) => set({ selectedJoueurId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

// ─── Store matchs ───────────────────────────────────────────────────────────────

interface MatchStore {
  matchs: Match[];
  selectedMatchId: string | null;
  selectedMatch: MatchDetail | null;
  isLoading: boolean;
  error: string | null;
  setMatchs: (matchs: Match[]) => void;
  setSelectedMatch: (id: string | null) => void;
  setMatchDetail: (match: MatchDetail | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMatchStore = create<MatchStore>()((set) => ({
  matchs: [],
  selectedMatchId: null,
  selectedMatch: null,
  isLoading: false,
  error: null,
  setMatchs: (matchs) => set({ matchs }),
  setSelectedMatch: (id) => set({ selectedMatchId: id }),
  setMatchDetail: (match) => set({ selectedMatch: match }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

// ─── Store entraînements ─────────────────────────────────────────────────────────

interface TrainingStore {
  sessions: TrainingSession[];
  selectedSessionId: string | null;
  selectedSession: TrainingSession | null;
  isLoading: boolean;
  error: string | null;
  setSessions: (sessions: TrainingSession[]) => void;
  setSelectedSession: (id: string | null) => void;
  setSessionDetail: (session: TrainingSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTrainingStore = create<TrainingStore>()((set) => ({
  sessions: [],
  selectedSessionId: null,
  selectedSession: null,
  isLoading: false,
  error: null,
  setSessions: (sessions) => set({ sessions }),
  setSelectedSession: (id) => set({ selectedSessionId: id }),
  setSessionDetail: (session) => set({ selectedSession: session }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

// ─── Store planification ─────────────────────────────────────────────────────────

interface PlanningStore {
  plans: WorkPlan[];
  isLoading: boolean;
  error: string | null;
  setPlans: (plans: WorkPlan[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlanningStore = create<PlanningStore>()((set) => ({
  plans: [],
  isLoading: false,
  error: null,
  setPlans: (plans) => set({ plans }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

// ─── Store évaluations ───────────────────────────────────────────────────────────

interface EvaluationStore {
  evaluations: Evaluation[];
  isLoading: boolean;
  error: string | null;
  setEvaluations: (evals: Evaluation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEvaluationStore = create<EvaluationStore>()((set) => ({
  evaluations: [],
  isLoading: false,
  error: null,
  setEvaluations: (evals) => set({ evaluations: evals }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

// ─── Store suggestions IA ────────────────────────────────────────────────────────

interface SuggestionsStore {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  setSuggestions: (sug: Suggestion[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addSuggestion: (sug: Suggestion) => void;
}

export const useSuggestionsStore = create<SuggestionsStore>()((set) => ({
  suggestions: [],
  isLoading: false,
  error: null,
  setSuggestions: (sug) => set({ suggestions: sug }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addSuggestion: (sug) =>
    set((state) => ({
      suggestions: [sug, ...state.suggestions],
    })),
}));
