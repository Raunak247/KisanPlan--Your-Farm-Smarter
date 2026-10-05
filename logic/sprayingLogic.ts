import type { SprayAdvice } from "../types/farm";
import { LIMITS } from "./thresholds";

export type SprayInput = {
  rainProbability: number;
  rainfallMm: number;
  windSpeed: number;
};

export type SprayDecision = {
  advice: SprayAdvice;
  label: string;
  reason: string;
};

/**
 * Deterministic spray advice. Thresholds live in LIMITS and are MVP rules only.
 */
export function decideSpraying(input: SprayInput): SprayDecision {
  const rainTooLikely =
    input.rainProbability >= LIMITS.SPRAY_RAIN_PROBABILITY ||
    input.rainfallMm >= LIMITS.SPRAY_RAIN_MM;
  const windTooHigh = input.windSpeed >= LIMITS.WIND_THRESHOLD_KMH;

  if (rainTooLikely && windTooHigh) {
    return {
      advice: "DO_NOT_SPRAY",
      label: "Do not spray",
      reason: "Rain is likely and the wind is strong.",
    };
  }

  if (rainTooLikely) {
    return {
      advice: "DO_NOT_SPRAY",
      label: "Do not spray",
      reason: "Rain is likely. Spray would wash off.",
    };
  }

  if (windTooHigh) {
    return {
      advice: "DO_NOT_SPRAY",
      label: "Do not spray",
      reason: "Wind is too strong for spraying.",
    };
  }

  return {
    advice: "SUITABLE",
    label: "Spraying conditions are suitable",
    reason: "Rain chance and wind are inside today's limits.",
  };
}
