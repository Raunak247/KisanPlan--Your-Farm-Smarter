import { clamp, readNumber } from "../utils/number";

export type MoistureSource = "iot" | "demo" | "unavailable";

export type MotorState = "ON" | "OFF";

export type MotorSample = {
  at: string;
  moisture: number;
  motor: MotorState;
};

export type MotorStatistics = {
  status: MotorState | null;
  totalOnSeconds: number;
  onCount: number;
  lastOnAt: string | null;
  lastOffAt: string | null;
};

/** Pump state, history, and totals as reported by the sensor API. */
export type MotorReport = {
  motor: MotorState | null;
  reason: string;
  moisture: number | null;
  status: "live" | "offline";
  statistics: MotorStatistics;
  history: MotorSample[];
};

export type MoistureReading = {
  moisture: number | null;
  source: MoistureSource;
  label: string;
  /** Present for the ESP32 API. Live means a reading arrived within the bridge window. */
  status?: "live" | "offline";
  updatedAt?: string | null;
  motor?: MotorReport | null;
};

type SensorBody = {
  moisture?: unknown;
  soilMoisture?: unknown;
  status?: unknown;
  updatedAt?: unknown;
  motorMonitor?: unknown;
};

function readEnv(name: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const value = env[name];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** ESP32 bridge. Expected JSON: { "soilMoisture": 42, "status": "live" }. */
export function iotSensorUrl(): string | undefined {
  return readEnv("EXPO_PUBLIC_IOT_SENSOR_URL");
}

function readClock(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readMotorState(value: unknown): MotorState | null {
  return value === "ON" || value === "OFF" ? value : null;
}

/** Keep only samples the API actually sent. Missing rows are dropped, never filled in. */
function readHistory(value: unknown): MotorSample[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const samples: MotorSample[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { at?: unknown; moisture?: unknown; motor?: unknown };
    const motor = readMotorState(row.motor);
    const moisture = readNumber(row.moisture, Number.NaN);
    if (!motor || !Number.isFinite(moisture) || typeof row.at !== "string" || row.at.trim().length === 0) {
      continue;
    }
    samples.push({
      at: row.at,
      moisture: clamp(Math.round(moisture), 0, 100),
      motor,
    });
  }
  return samples;
}

function readMotorReport(value: unknown, fallbackStatus: "live" | "offline"): MotorReport | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const body = value as {
    motor?: unknown;
    reason?: unknown;
    moisture?: unknown;
    status?: unknown;
    statistics?: unknown;
    history?: unknown;
  };
  const stats = body.statistics;
  const statsBody =
    stats && typeof stats === "object"
      ? (stats as {
          status?: unknown;
          totalOnSeconds?: unknown;
          onCount?: unknown;
          lastOnAt?: unknown;
          lastOffAt?: unknown;
        })
      : null;
  const moisture = readNumber(body.moisture, Number.NaN);
  const totalOnSeconds = readNumber(statsBody?.totalOnSeconds, Number.NaN);
  const onCount = readNumber(statsBody?.onCount, Number.NaN);
  return {
    motor: readMotorState(body.motor),
    reason:
      typeof body.reason === "string" && body.reason.trim().length > 0
        ? body.reason.trim()
        : "The ESP32 has not reported a pump state yet.",
    moisture: Number.isFinite(moisture) ? clamp(Math.round(moisture), 0, 100) : null,
    status: body.status === "live" ? "live" : fallbackStatus,
    statistics: {
      status: readMotorState(statsBody?.status),
      totalOnSeconds: Number.isFinite(totalOnSeconds) ? Math.max(0, totalOnSeconds) : 0,
      onCount: Number.isFinite(onCount) ? Math.max(0, Math.round(onCount)) : 0,
      lastOnAt: readClock(statsBody?.lastOnAt),
      lastOffAt: readClock(statsBody?.lastOffAt),
    },
    history: readHistory(body.history),
  };
}

function offlineReading(
  moisture: number | null,
  updatedAt: string | null,
  motor: MotorReport | null,
): MoistureReading {
  return {
    moisture,
    source: "unavailable",
    label: "Offline",
    status: "offline",
    updatedAt,
    motor,
  };
}

/**
 * Live ESP32 reading from the sensor API.
 * When that URL is set, a failed or stale response stays offline and is never replaced by demo moisture.
 */
export async function getSoilMoisture(options: {
  demoMode: boolean;
  demoMoisture: number;
}): Promise<MoistureReading> {
  const url = iotSensorUrl();
  if (url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        return offlineReading(null, null, null);
      }
      const body = (await response.json()) as SensorBody;
      const parsed = readNumber(body.moisture ?? body.soilMoisture, Number.NaN);
      const moisture = Number.isFinite(parsed) ? clamp(Math.round(parsed), 0, 100) : null;
      const updatedAt = typeof body.updatedAt === "string" ? body.updatedAt : null;
      const live = body.status !== "offline" && moisture != null;
      const motor = readMotorReport(body.motorMonitor, live ? "live" : "offline");
      if (!live) {
        return offlineReading(moisture, updatedAt, motor);
      }
      return {
        moisture,
        source: "iot",
        label: "Live",
        status: "live",
        updatedAt,
        motor,
      };
    } catch {
      return offlineReading(null, null, null);
    } finally {
      clearTimeout(timer);
    }
  }

  if (options.demoMode) {
    return {
      moisture: clamp(Math.round(options.demoMoisture), 0, 100),
      source: "demo",
      label: "DEMO sensor",
    };
  }

  return {
    moisture: null,
    source: "unavailable",
    label: "Sensor unavailable",
  };
}
