import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CropScan } from "../services/predictService";
import type { FarmProfile, Place, Session } from "../types/farm";
import { clamp } from "../utils/number";
import { readStored, writeStored } from "../utils/storage";

const FARM_STATE_KEY = "kisanplan:farm-state";
type FarmState = {
  session: Session | null;
  profile: FarmProfile | null;
  draftPlace: Place | null;
  scan: CropScan | null;
  demoMode: boolean;
  demoMoisture: number;
};

type FarmContextValue = {
  session: Session | null;
  profile: FarmProfile | null;
  draftPlace: Place | null;
  scan: CropScan | null;
  demoMode: boolean;
  demoMoisture: number;
  signIn: (contact: string) => void;
  signOut: () => void;
  saveProfile: (profile: FarmProfile) => void;
  setDraftPlace: (place: Place | null) => void;
  setScan: (scan: CropScan | null) => void;
  setDemoMode: (enabled: boolean) => void;
  setDemoMoisture: (moisture: number) => void;
};

const FarmContext = createContext<FarmContextValue | null>(null);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [draftPlace, setDraftPlaceState] = useState<Place | null>(null);
  const [scan, setScanState] = useState<CropScan | null>(null);
  const [demoMode, setDemoModeState] = useState(true);
  const [demoMoisture, setDemoMoistureState] = useState(42);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void readStored<FarmState>(FARM_STATE_KEY).then((saved) => {
      if (saved) {
        setSession(saved.session ?? null);
        setProfile(saved.profile ?? null);
        setDraftPlaceState(saved.draftPlace ?? null);
        setScanState(saved.scan ?? null);
        setDemoModeState(saved.demoMode ?? true);
        setDemoMoistureState(clamp(Math.round(saved.demoMoisture ?? 42), 0, 100));
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeStored<FarmState>(FARM_STATE_KEY, {
      session,
      profile,
      draftPlace,
      scan,
      demoMode,
      demoMoisture,
    });
  }, [hydrated, session, profile, draftPlace, scan, demoMode, demoMoisture]);

  const signIn = useCallback((contact: string) => {
    setSession({ contact });
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
  }, []);

  const saveProfile = useCallback((next: FarmProfile) => {
    setProfile(next);
    setDraftPlaceState(null);
  }, []);

  const setDraftPlace = useCallback((place: Place | null) => {
    setDraftPlaceState(place);
  }, []);

  const setScan = useCallback((next: CropScan | null) => {
    setScanState(next);
  }, []);

  const setDemoMode = useCallback((enabled: boolean) => {
    setDemoModeState(enabled);
  }, []);

  const setDemoMoisture = useCallback((moisture: number) => {
    setDemoMoistureState(clamp(Math.round(moisture), 0, 100));
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      draftPlace,
      scan,
      demoMode,
      demoMoisture,
      signIn,
      signOut,
      saveProfile,
      setDraftPlace,
      setScan,
      setDemoMode,
      setDemoMoisture,
    }),
    [
      session,
      profile,
      draftPlace,
      scan,
      demoMode,
      demoMoisture,
      signIn,
      signOut,
      saveProfile,
      setDraftPlace,
      setScan,
      setDemoMode,
      setDemoMoisture,
    ],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm(): FarmContextValue {
  const value = useContext(FarmContext);
  if (!value) {
    throw new Error("useFarm must be used within FarmProvider");
  }
  return value;
}
