import type { CropStage, Drainage } from "../types/farm";
import type { MoistureReading } from "../services/sensorService";
import type { SoilData } from "../services/soilService";
import type { DayForecast, WeatherReport } from "../services/weatherService";
import { decideIrrigation, type IrrigationDecision } from "./irrigationLogic";
import { decideSpraying, type SprayDecision } from "./sprayingLogic";
import { LIMITS } from "./thresholds";
import type { CropId } from "../types/farm";
import { clamp, roundTo } from "../utils/number";

export type FieldCondition = "sunny" | "cloudy" | "rainy";

export type AlertTone = "danger" | "warning" | "info" | "ok";

export type FarmAlert = {
  id: string;
  tone: AlertTone;
  title: string;
  message: string;
};


export type DayPlan = DayForecast & {
  condition: FieldCondition;
  /** Moisture used for this day's decision. Later days are a simple estimate. */
  moistureUsed: number | null;
  moistureIsEstimate: boolean;
  irrigation: IrrigationDecision;
  spray: SprayDecision;
  action: string;
};

export type FarmPlan = {
  days: DayPlan[];
  alerts: FarmAlert[];
};

export function fieldCondition(rainProbability: number, rainfallMm: number): FieldCondition {
  if (rainProbability >= LIMITS.RAIN_PROBABILITY_THRESHOLD || rainfallMm >= LIMITS.SIGNIFICANT_RAIN_MM) {
    return "rainy";
  }
  if (rainProbability >= 30 || rainfallMm >= 1) {
    return "cloudy";
  }
  return "sunny";
}

/**
 * Carry today's reading forward. Rain adds water, heat dries the soil,
 * and an ON day refills toward a safer level. This is a planning estimate.
 */
export function projectMoisture(
  current: number,
  day: DayForecast,
  motorOn: boolean,
  drainage: Drainage,
): number {
  const drain = drainage === "free" ? 1.2 : drainage === "poor" ? 0.7 : 1;
  let next = current;
  if (day.rainfallMm > 0) {
    next += day.rainfallMm * (drainage === "poor" ? 1.5 : 1.1);
  }
  if (day.rainfallMm < LIMITS.SPRAY_RAIN_MM + 1) {
    const heat = Math.max(0, day.temperatureMax - 28);
    next -= (2 + heat * 0.35) * drain;
  }
  if (motorOn) {
    next = Math.max(next, Math.min(80, current + 20));
  }
  return clamp(Math.round(next), 5, 95);
}

function buildAction(
  day: DayForecast,
  irrigation: IrrigationDecision,
  spray: SprayDecision,
  stage: CropStage,
): string {
  const lines: string[] = [];
  const rainLikely =
    day.rainProbability >= LIMITS.RAIN_PROBABILITY_THRESHOLD ||
    day.rainfallMm >= LIMITS.SIGNIFICANT_RAIN_MM;

  if (!irrigation.decided) {
    lines.push("Check the soil by hand. The sensor has no reading.");
  } else if (irrigation.motor === "ON") {
    lines.push("Irrigate in the morning. Soil moisture is low.");
  } else if (rainLikely) {
    lines.push("Skip irrigation. Rain is expected.");
  } else {
    lines.push("No irrigation needed. Soil moisture is enough.");
  }

  if (spray.advice === "DO_NOT_SPRAY") {
    if (day.windSpeed >= LIMITS.WIND_THRESHOLD_KMH && day.rainProbability < LIMITS.SPRAY_RAIN_PROBABILITY) {
      lines.push("Do not spray. Wind is strong.");
    } else {
      lines.push("Do not spray. Rain is expected.");
    }
  } else if (stage === "flowering" || stage === "fruiting") {
    lines.push("If you need to spray, today is suitable.");
  }

  if (stage === "maturity") {
    if (day.rainProbability >= 50 || day.rainfallMm >= 2) {
      lines.push("Delay harvest. Rain is expected.");
    } else {
      lines.push("A dry day. You can harvest.");
    }
  } else if (stage === "germination" && irrigation.motor === "ON") {
    lines.push("Keep the water light so the seed is not flooded.");
  }

  if (day.temperatureMax >= 38) {
    lines.push("It will be very hot. Work early in the morning.");
  }

  return lines.join(" ");
}

export function buildAlerts(
  days: DayPlan[],
  moisture: MoistureReading,
  stage: CropStage,
): FarmAlert[] {
  const alerts: FarmAlert[] = [];
  const today = days[0];
  const tomorrow = days[1];
  if (!today) {
    return alerts;
  }

  // 1. SENSOR STATUS
  if (moisture.source === "unavailable" || !today.irrigation.decided) {
    alerts.push({
      id: "sensor",
      tone: "warning",
      title: "Sensor unavailable",
      message: "No soil moisture reading. Turn on the demo sensor, or connect the IoT device.",
    });
  }

  // 2. SPRAY SAFETY ALERTS
  if (
    tomorrow &&
    (tomorrow.rainProbability >= LIMITS.SPRAY_RAIN_PROBABILITY ||
      tomorrow.rainfallMm >= LIMITS.SPRAY_RAIN_MM)
  ) {
    alerts.push({
      id: "spray-tomorrow",
      tone: "danger",
      title: "Do not spray tomorrow",
      message:
        tomorrow.rainfallMm >= 8
          ? "Heavy rain is expected. Chemical spray will wash off."
          : `Rain chance is ${Math.round(tomorrow.rainProbability)}%. Spray would wash off.`,
    });
  }

  if (today.windSpeed >= LIMITS.WIND_THRESHOLD_KMH) {
    alerts.push({
      id: "wind",
      tone: "danger",
      title: "High wind",
      message: `Wind speed is ${Math.round(today.windSpeed)} km/h. Avoid pesticide spraying due to drift hazard.`,
    });
  } else if (
    today.spray.advice === "DO_NOT_SPRAY" &&
    (today.rainProbability >= LIMITS.SPRAY_RAIN_PROBABILITY ||
      today.rainfallMm >= LIMITS.SPRAY_RAIN_MM)
  ) {
    alerts.push({
      id: "spray-today",
      tone: "danger",
      title: "Do not spray today",
      message: "Rain is expected today. It will wash the chemical spray away.",
    });
  }

  // 3. EXTREME HEAT
  if (today.temperatureMax >= 40) {
    alerts.push({
      id: "heat",
      tone: "warning",
      title: "Very hot today",
      message: `Peak temperature around ${Math.round(today.temperatureMax)}°C. Irrigate during cool morning hours.`,
    });
  }

  // 4. HARVEST WINDOW
  if (stage === "maturity" && today.rainProbability < 40 && today.rainfallMm < 2) {
    alerts.push({
      id: "harvest",
      tone: "ok",
      title: "Good harvest day",
      message: "The crop is mature and dry weather is forecast. A good day to harvest.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "steady",
      tone: "ok",
      title: "All clear",
      message: "Weather and soil moisture are within safe ranges today.",
    });
  }

  return alerts;
}

export function buildFarmPlan(input: {
  weather: WeatherReport;
  soil: SoilData;
  moisture: MoistureReading;
  crop: CropId;
  stage: CropStage;
}): FarmPlan {
  let moistureNow = input.moisture.moisture;
  const days: DayPlan[] = input.weather.days.map((day, index) => {
    const irrigation = decideIrrigation({
      soilMoisture: moistureNow,
      rainProbability: day.rainProbability,
      rainfallMm: day.rainfallMm,
      crop: input.crop,
      cropStage: input.stage,
    });
    const spray = decideSpraying({
      rainProbability: day.rainProbability,
      rainfallMm: day.rainfallMm,
      windSpeed: day.windSpeed,
    });
    const planDay: DayPlan = {
      ...day,
      condition: fieldCondition(day.rainProbability, day.rainfallMm),
      moistureUsed: moistureNow == null ? null : roundTo(moistureNow),
      moistureIsEstimate: index > 0 && moistureNow != null,
      irrigation,
      spray,
      action: buildAction(day, irrigation, spray, input.stage),
    };
    if (moistureNow != null) {
      moistureNow = projectMoisture(
        moistureNow,
        day,
        irrigation.motor === "ON",
        input.soil.available ? input.soil.drainage : "moderate",
      );
    }
    return planDay;
  });

  return {
    days,
    alerts: buildAlerts(days, input.moisture, input.stage),
  };
}
