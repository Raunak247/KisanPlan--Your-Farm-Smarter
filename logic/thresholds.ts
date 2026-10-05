import type { CropId, CropStage } from "../types/farm";

/**
 * MVP decision limits. Edit them here.
 * These are not universal agronomy rules. Calibrate them with local advice later.
 */
export const LIMITS = {
  MOISTURE_LOW: 30,
  MOISTURE_HIGH: 60,
  RAIN_PROBABILITY_THRESHOLD: 60,
  SIGNIFICANT_RAIN_MM: 5,
  SPRAY_RAIN_PROBABILITY: 55,
  SPRAY_RAIN_MM: 1,
  WIND_THRESHOLD_KMH: 18,
} as const;

/**
 * Soil moisture below this percent is "low" for that crop and stage.
 * Flowering and fruiting sit higher. Maturity sits lower.
 */
const MOISTURE_LOW_BY_CROP: Record<CropId, Record<CropStage, number>> = {
  wheat: { germination: 34, vegetative: 30, flowering: 40, fruiting: 36, maturity: 22 },
  rice: { germination: 48, vegetative: 55, flowering: 60, fruiting: 55, maturity: 40 },
  cotton: { germination: 34, vegetative: 32, flowering: 45, fruiting: 40, maturity: 24 },
  tomato: { germination: 40, vegetative: 38, flowering: 46, fruiting: 50, maturity: 32 },
  soybean: { germination: 36, vegetative: 34, flowering: 44, fruiting: 40, maturity: 26 },
  maize: { germination: 36, vegetative: 34, flowering: 44, fruiting: 40, maturity: 24 },
};

const MOISTURE_HIGH_BY_CROP: Record<CropId, number> = {
  wheat: 62,
  rice: 82,
  cotton: 64,
  tomato: 70,
  soybean: 64,
  maize: 64,
};

export function cropThresholds(crop: CropId, stage: CropStage): { low: number; high: number } {
  const low = MOISTURE_LOW_BY_CROP[crop][stage] ?? LIMITS.MOISTURE_LOW;
  const high = Math.max(MOISTURE_HIGH_BY_CROP[crop] ?? LIMITS.MOISTURE_HIGH, low + 8);
  return { low, high };
}
