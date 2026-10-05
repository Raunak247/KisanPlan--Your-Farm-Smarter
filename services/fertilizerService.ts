import { iotSensorUrl } from "./sensorService";

function apiOrigin(): string {
  if (typeof window !== "undefined" && window?.location?.hostname) {
    return `http://${window.location.hostname}:5001`;
  }
  const configured = process.env.EXPO_PUBLIC_MODEL_URL ?? iotSensorUrl();
  const match = configured?.match(/^(https?:\/\/[^/]+)/);
  return match?.[1] ?? "http://127.0.0.1:5001";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type FertilizerRecommendation = {
  rank: number;
  fertilizer: string;
  confidence: number;
  confidence_pct: string;
};

export type FertilizerResult = {
  recommended_fertilizer: string;
  confidence: number;
  confidence_pct: string;
  confidence_level: "HIGH" | "MODERATE" | "UNCERTAIN";
  top_k: FertilizerRecommendation[];
  error?: string;
};

/** All 19 input features the model expects. Optional fields fall back to 0 / "Unknown". */
export type FertilizerFeatures = {
  // Numerical
  Soil_pH?: number;
  Soil_Moisture?: number;
  Organic_Carbon?: number;
  Electrical_Conductivity?: number;
  Nitrogen_Level?: number;
  Phosphorus_Level?: number;
  Potassium_Level?: number;
  Temperature?: number;
  Humidity?: number;
  Rainfall?: number;
  Fertilizer_Used_Last_Season?: number;
  Yield_Last_Season?: number;
  // Categorical
  Soil_Type?: string;
  Crop_Type?: string;
  Crop_Growth_Stage?: string;
  Season?: string;
  Irrigation_Type?: string;
  Previous_Crop?: string;
  Region?: string;
};

// ─── API call ─────────────────────────────────────────────────────────────────

export async function getFertilizerRecommendation(
  features: FertilizerFeatures,
): Promise<FertilizerResult> {
  const url = `${apiOrigin()}/api/fertilizer`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    });
  } catch {
    throw new Error(
      "Could not reach the server. Make sure sensor_bridge.py is running.",
    );
  }

  let body: FertilizerResult & { error?: string };
  try {
    body = (await response.json()) as FertilizerResult & { error?: string };
  } catch {
    throw new Error("Server returned an unreadable response.");
  }

  if (!response.ok || body.error) {
    throw new Error(body.error ?? "Fertilizer recommendation failed.");
  }

  return body;
}
