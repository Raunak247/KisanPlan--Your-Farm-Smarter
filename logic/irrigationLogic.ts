import type { CropId, CropStage, MotorState } from "../types/farm";
import { cropThresholds, LIMITS } from "./thresholds";

export type IrrigationInput = {
  soilMoisture: number | null;
  rainProbability: number;
  rainfallMm: number;
  crop: CropId;
  cropStage: CropStage;
};

export type IrrigationDecision = {
  motor: MotorState;
  reason: string;
  /** False when there is no moisture reading, so the motor is not decided. */
  decided: boolean;
  lowThreshold: number;
  highThreshold: number;
};

function rainIsLikely(rainProbability: number, rainfallMm: number): boolean {
  return (
    rainProbability >= LIMITS.RAIN_PROBABILITY_THRESHOLD ||
    rainfallMm >= LIMITS.SIGNIFICANT_RAIN_MM
  );
}

/**
 * Deterministic motor decision. No model call belongs in this function.
 */
export function decideIrrigation(input: IrrigationInput): IrrigationDecision {
  const { low, high } = cropThresholds(input.crop, input.cropStage);
  const base = { lowThreshold: low, highThreshold: high };

  if (input.soilMoisture == null || !Number.isFinite(input.soilMoisture)) {
    return {
      ...base,
      motor: "OFF",
      decided: false,
      reason: "Soil sensor unavailable. Irrigation is not decided.",
    };
  }

  const moisture = input.soilMoisture;
  const rainLikely = rainIsLikely(input.rainProbability, input.rainfallMm);

  if (moisture < low && !rainLikely) {
    return {
      ...base,
      motor: "ON",
      decided: true,
      reason: "Soil moisture is low and significant rain is not expected.",
    };
  }

  if (moisture < low && rainLikely) {
    return {
      ...base,
      motor: "OFF",
      decided: true,
      reason: "Soil is dry, but rain is expected. Wait before turning the motor on.",
    };
  }

  if (rainLikely) {
    return {
      ...base,
      motor: "OFF",
      decided: true,
      reason: "Rain is expected and soil moisture is sufficient.",
    };
  }

  if (moisture >= high) {
    return {
      ...base,
      motor: "OFF",
      decided: true,
      reason: "Soil moisture is high. Keep the motor off.",
    };
  }

  return {
    ...base,
    motor: "OFF",
    decided: true,
    reason: "Soil moisture is currently sufficient.",
  };
}
