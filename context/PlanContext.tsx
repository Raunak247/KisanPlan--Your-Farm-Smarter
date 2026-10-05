import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFarm } from "./FarmContext";
import { buildFarmPlan, type FarmPlan } from "../logic/plannerLogic";
import {
  explainPlan,
  isGrokConfigured,
  type GrokPlanInput,
} from "../services/grokService";
import {
  getSoilMoisture,
  iotSensorUrl,
  type MoistureReading,
  type MotorReport,
} from "../services/sensorService";
import { getSoilData, type SoilData } from "../services/soilService";
import { getWeather, type WeatherReport } from "../services/weatherService";
import { cropById, stageLabel, type FarmProfile } from "../types/farm";
import {
  cacheFreshness,
  coordinateCacheKey,
  readCache,
  writeCache,
  type CachedValue,
} from "../utils/dataCache";

export type AdvisorState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "ready"; summary: string; daily: string[] }
  | { status: "error" };

type LoadStatus = "idle" | "loading" | "ready" | "error";

type PlanContextValue = {
  status: LoadStatus;
  error: string | null;
  weather: WeatherReport | null;
  soil: SoilData | null;
  moisture: MoistureReading;
  motor: MotorReport | null;
  plan: FarmPlan | null;
  advisor: AdvisorState;
  weatherFreshness: "fresh" | "stale" | "none";
  soilFreshness: "fresh" | "stale" | "none";
  weatherFetchedAt: string | null;
  soilFetchedAt: string | null;
  weatherSource: "network" | "cache" | null;
  soilSource: "network" | "cache" | null;
  refresh: () => void;
};

const UNAVAILABLE: MoistureReading = {
  moisture: null,
  source: "unavailable",
  label: "Sensor unavailable",
};

const OFFLINE: MoistureReading = {
  moisture: null,
  source: "unavailable",
  label: "Offline",
  status: "offline",
};

const PlanContext = createContext<PlanContextValue | null>(null);

function toGrokInput(
  profile: FarmProfile,
  soil: SoilData,
  moisture: MoistureReading,
  plan: FarmPlan,
): GrokPlanInput {
  return {
    place: profile.place.label || profile.place.name,
    crop: cropById(profile.crop).name,
    cropStage: stageLabel(profile.stage),
    soilType: soil.soilType,
    drainage: soil.drainage,
    moistureNow: moisture.moisture,
    moistureSource: moisture.source,
    days: plan.days.map((day) => ({
      day: day.weekday,
      temperatureMax: day.temperatureMax,
      temperatureMin: day.temperatureMin,
      humidity: day.humidityMean,
      rainProbability: day.rainProbability,
      rainfallMm: day.rainfallMm,
      windSpeed: day.windSpeed,
      condition: day.condition,
      moistureUsed: day.moistureUsed,
      moistureIsEstimate: day.moistureIsEstimate,
      motor: day.irrigation.motor,
      motorDecided: day.irrigation.decided,
      spray: day.spray.advice,
    })),
  };
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const { session, profile, demoMode, demoMoisture } = useFarm();
  const latitude = profile?.place.latitude;
  const longitude = profile?.place.longitude;
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [soil, setSoil] = useState<SoilData | null>(null);
  const [sensor, setSensor] = useState<MoistureReading | null>(null);
  const [advisor, setAdvisor] = useState<AdvisorState>({ status: "off" });
  const [weatherMeta, setWeatherMeta] = useState<CachedValue<WeatherReport> | null>(null);
  const [soilMeta, setSoilMeta] = useState<CachedValue<SoilData> | null>(null);
  const request = useRef(0);
  const weatherRef = useRef<WeatherReport | null>(null);
  const demoRef = useRef({ demoMode, demoMoisture });
  demoRef.current = { demoMode, demoMoisture };

  const refresh = useCallback(async () => {
    if (latitude == null || longitude == null) {
      return;
    }
    const id = request.current + 1;
    request.current = id;
    setStatus("loading");
    setError(null);
    try {
      const weatherKey = coordinateCacheKey("weather", latitude, longitude);
      const soilKey = coordinateCacheKey("soil", latitude, longitude);
      const [weatherResult, soilResult] = await Promise.allSettled([
        getWeather(latitude, longitude),
        getSoilData(latitude, longitude),
      ]);
      const cached = await Promise.all([readCache<WeatherReport>(weatherKey), readCache<SoilData>(soilKey)]);
      const nextWeatherMeta =
        weatherResult.status === "fulfilled"
          ? await writeCache(weatherKey, weatherResult.value)
          : cached[0]
            ? { ...cached[0], source: "cache" as const }
            : null;
      const nextSoilMeta =
        soilResult.status === "fulfilled"
          ? await writeCache(soilKey, soilResult.value)
          : cached[1]
            ? { ...cached[1], source: "cache" as const }
            : null;
      if (request.current !== id) {
        return;
      }
      if (!nextWeatherMeta || !nextSoilMeta) {
        const failure = weatherResult.status === "rejected" ? weatherResult.reason : soilResult.status === "rejected" ? soilResult.reason : null;
        setError(failure instanceof Error ? failure.message : "Could not load weather and soil data.");
        setStatus("error");
        return;
      }
      const mergedSoil: SoilData = { ...nextSoilMeta.value, soilTemperature: nextWeatherMeta.value.current.soilTemperature };
      weatherRef.current = nextWeatherMeta.value;
      setWeatherMeta(nextWeatherMeta);
      setSoilMeta(nextSoilMeta);
      setWeather(nextWeatherMeta.value);
      setSoil(mergedSoil);
      setStatus("ready");
    } catch (err) {
      if (request.current !== id) return;
      setError(err instanceof Error ? err.message : "Could not load weather and soil data.");
      setStatus("error");
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!session || latitude == null || longitude == null) {
      return;
    }
    weatherRef.current = null;
    setWeather(null);
    setSoil(null);
    setWeatherMeta(null);
    setSoilMeta(null);
    setError(null);
    setStatus("loading");
    void refresh();
  }, [session, latitude, longitude, refresh]);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    const loadSensor = () => {
      const demo = demoRef.current;
      void getSoilMoisture({
        demoMode: demo.demoMode,
        demoMoisture: demo.demoMoisture,
      }).then((reading) => {
        if (!cancelled) {
          setSensor(reading);
        }
      });
    };
    loadSensor();
    const timer = setInterval(loadSensor, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session]);

  const weatherForPlace =
    weather &&
    latitude != null &&
    longitude != null &&
    weather.requestedLatitude === latitude &&
    weather.requestedLongitude === longitude
      ? weather
      : null;

  const soilForPlace = weatherForPlace ? soil : null;

  const moisture = useMemo<MoistureReading>(() => {
    if (sensor?.source === "iot") {
      return sensor;
    }
    if (iotSensorUrl()) {
      return sensor ?? OFFLINE;
    }
    if (demoMode) {
      return {
        moisture: Math.max(0, Math.min(100, Math.round(demoMoisture))),
        source: "demo",
        label: "DEMO sensor",
      };
    }
    if (sensor && sensor.source !== "demo") {
      return sensor;
    }
    return UNAVAILABLE;
  }, [sensor, demoMode, demoMoisture]); // iotSensorUrl() is env and does not change during a session

  const plan = useMemo(() => {
    if (!weatherForPlace || !soilForPlace || !profile) {
      return null;
    }
    return buildFarmPlan({
      weather: weatherForPlace,
      soil: soilForPlace,
      moisture,
      crop: profile.crop,
      stage: profile.stage,
    });
  }, [weatherForPlace, soilForPlace, moisture, profile]);

  useEffect(() => {
    if (!weatherForPlace || !soilForPlace || !profile || !plan) {
      setAdvisor({ status: "off" });
      return;
    }
    if (!isGrokConfigured()) {
      setAdvisor({ status: "off" });
      return;
    }
    let cancelled = false;
    setAdvisor({ status: "loading" });
    void explainPlan(toGrokInput(profile, soilForPlace, moisture, plan)).then((result) => {
      if (cancelled) {
        return;
      }
      setAdvisor(
        result
          ? { status: "ready", summary: result.summary, daily: result.daily }
          : { status: "error" },
      );
    });
    return () => {
      cancelled = true;
    };
    // Moisture slider must not call Grok again. Decisions already update on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherForPlace, soilForPlace, profile]);

  const motor = moisture.motor ?? null;

  const value = useMemo(
    () => ({
      status,
      error,
      weather: weatherForPlace,
      soil: soilForPlace,
      moisture,
      motor,
      plan,
      advisor,
      weatherFreshness: cacheFreshness(weatherMeta?.fetchedAt ?? null),
      soilFreshness: cacheFreshness(soilMeta?.fetchedAt ?? null),
      weatherFetchedAt: weatherMeta?.fetchedAt ?? null,
      soilFetchedAt: soilMeta?.fetchedAt ?? null,
      weatherSource: weatherMeta?.source ?? null,
      soilSource: soilMeta?.source ?? null,
      refresh,
    }),
    [status, error, weatherForPlace, soilForPlace, moisture, motor, plan, advisor, weatherMeta, soilMeta, refresh],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const value = useContext(PlanContext);
  if (!value) {
    throw new Error("usePlan must be used within PlanProvider");
  }
  return value;
}
