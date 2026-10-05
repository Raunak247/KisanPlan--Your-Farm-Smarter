import type { Drainage } from "../types/farm";
import { clamp, roundTo } from "../utils/number";

export type SoilSource = "soilgrids" | "estimated";

export type SoilData = {
  available: boolean;
  soilType: string;
  moistureBaseline: number;
  fieldCapacity: number;
  soilTemperature: number | null;
  drainage: Drainage;
  source: SoilSource;
  /** True when SoilGrids did not return a usable texture. */
  mapUnavailable: boolean;
  note: string;
};

type SoilLayer = {
  name?: string;
  unit_measure?: { d_factor?: number };
  depths?: { values?: { mean?: number | null } }[];
};

type SoilGridsResponse = {
  properties?: {
    layers?: SoilLayer[];
  };
};

function textureName(clay: number, sand: number, silt: number): string {
  if (clay >= 40) {
    return "Clay";
  }
  if (sand >= 70 && clay < 15) {
    return "Sand";
  }
  if (sand >= 50 && clay < 20) {
    return "Sandy loam";
  }
  if (silt >= 50 && clay < 27) {
    return "Silt loam";
  }
  if (clay >= 27) {
    return "Clay loam";
  }
  return "Loam";
}

function drainageFor(clay: number, sand: number): Drainage {
  if (clay >= 40) {
    return "poor";
  }
  if (sand >= 60) {
    return "free";
  }
  return "moderate";
}

function fieldCapacityFor(clay: number, silt: number): number {
  return clamp(Math.round(10 + clay * 0.55 + silt * 0.2), 15, 70);
}

function fromTexture(
  clay: number,
  sand: number,
  silt: number,
  source: SoilSource,
  mapUnavailable: boolean,
  note: string,
): SoilData {
  const sum = clay + sand + silt || 1;
  const clayPct = (clay / sum) * 100;
  const sandPct = (sand / sum) * 100;
  const siltPct = (silt / sum) * 100;
  const fieldCapacity = fieldCapacityFor(clayPct, siltPct);
  return {
    available: true,
    soilType: textureName(clayPct, sandPct, siltPct),
    moistureBaseline: clamp(Math.round(fieldCapacity * 0.6), 10, 80),
    fieldCapacity,
    soilTemperature: null,
    drainage: drainageFor(clayPct, sandPct),
    source,
    mapUnavailable,
    note,
  };
}

function layerRaw(layers: SoilLayer[], name: string): { value: number; factor: number } | null {
  const layer = layers.find((item) => item.name === name);
  if (!layer) {
    return null;
  }
  const factor = layer.unit_measure?.d_factor && layer.unit_measure.d_factor > 0
    ? layer.unit_measure.d_factor
    : 1;
  for (const depth of layer.depths ?? []) {
    const mean = depth.values?.mean;
    if (typeof mean === "number" && Number.isFinite(mean)) {
      return { value: mean, factor };
    }
  }
  return null;
}

function normalizeTrio(
  raw: [number, number, number],
  factor: number,
): [number, number, number] | null {
  const candidates = [raw.map((value) => value / factor), raw];
  for (const trio of candidates) {
    const sum = trio[0] + trio[1] + trio[2];
    if (sum > 70 && sum < 140) {
      return [trio[0], trio[1], trio[2]];
    }
  }
  return null;
}

function parseSoilGrids(body: SoilGridsResponse): SoilData | null {
  const layers = body.properties?.layers ?? [];
  const clay = layerRaw(layers, "clay");
  const sand = layerRaw(layers, "sand");
  const silt = layerRaw(layers, "silt");
  if (!clay || !sand || !silt) {
    return null;
  }
  const factor = clay.factor || sand.factor || silt.factor || 1;
  const trio = normalizeTrio([clay.value, sand.value, silt.value], factor);
  if (!trio) {
    return null;
  }
  return fromTexture(
    trio[0],
    trio[1],
    trio[2],
    "soilgrids",
    false,
    "Topsoil texture from SoilGrids for this location.",
  );
}

/**
 * Location estimate used only when the soil map has no reading.
 * The mix is stable for a coordinate. It is not a lab test.
 */
function estimateSoil(latitude: number, longitude: number): SoilData {
  const deccan = latitude >= 16 && latitude <= 23 && longitude >= 74 && longitude <= 81;
  const gangetic = latitude >= 24 && latitude <= 31 && longitude >= 77 && longitude <= 89;
  const delta = latitude >= 8 && latitude <= 16 && longitude >= 76 && longitude <= 82;

  let clay: number;
  let sand: number;
  let silt: number;
  if (deccan) {
    clay = 48;
    sand = 22;
    silt = 30;
  } else if (gangetic) {
    clay = 26;
    sand = 30;
    silt = 44;
  } else if (delta) {
    clay = 40;
    sand = 22;
    silt = 38;
  } else {
    const swing = Math.abs(Math.sin(latitude * 0.31 + longitude * 0.17));
    clay = 15 + swing * 38;
    sand = 18 + Math.abs(Math.cos(longitude * 0.21)) * 40;
    silt = Math.max(8, 100 - clay - sand);
  }

  return fromTexture(
    clay,
    sand,
    silt,
    "estimated",
    true,
    "Soil map unavailable for this point. Showing a location estimate, not a lab test.",
  );
}

async function fetchSoilGrids(latitude: number, longitude: number): Promise<SoilData | null> {
  const url =
    "https://rest.isric.org/soilgrids/v2.0/properties/query" +
    `?lon=${longitude}&lat=${latitude}` +
    "&property=clay&property=sand&property=silt&depth=0-5cm&depth=5-15cm&value=mean";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as SoilGridsResponse;
    return parseSoilGrids(body);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Soil for the selected coordinates.
 * Swap the SoilGrids call for another soil API later. Callers stay the same.
 */
export async function getSoilData(latitude: number, longitude: number): Promise<SoilData> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      available: false,
      soilType: "Unknown",
      moistureBaseline: 0,
      fieldCapacity: 0,
      soilTemperature: null,
      drainage: "moderate",
      source: "estimated",
      mapUnavailable: true,
      note: "Soil data unavailable. The location has no coordinates.",
    };
  }

  const mapped = await fetchSoilGrids(latitude, longitude);
  if (mapped) {
    return mapped;
  }
  const estimate = estimateSoil(latitude, longitude);
  return {
    ...estimate,
    fieldCapacity: roundTo(estimate.fieldCapacity),
  };
}
