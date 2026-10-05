import { iotSensorUrl } from "./sensorService";

export type TopPrediction = {
  rank: number;
  class: string;
  crop: string;
  disease: string;
  confidence: number;
};

export type CropScan = {
  crop: string;
  detected: string;
  disease: string;
  confidence: number;
  confidencePct: string;
  confidenceLevel: "HIGH" | "MODERATE" | "UNCERTAIN";
  status: string;
  treatment: string[];
  prevention: string[];
  sprayingSuitability: string;
  sprayingReason: string;
  diseaseConfidence: number;
  note: string | null;
  topPredictions?: TopPrediction[];
};

type PredictBody = {
  crop?: unknown;
  detected?: unknown;
  disease?: unknown;
  confidence?: unknown;
  confidence_pct?: unknown;
  confidence_level?: unknown;
  status?: unknown;
  treatment?: unknown;
  prevention?: unknown;
  spraying_suitability?: unknown;
  spraying_reason?: unknown;
  disease_confidence?: unknown;
  disease_note?: unknown;
  top_predictions?: unknown;
  error?: unknown;
};

function apiOrigin(): string {
  // On web: use the same hostname the browser is on (same PC as the server)
  if (typeof window !== "undefined" && window?.location?.hostname) {
    const host = window.location.hostname;
    // If served from localhost or a LAN IP, connect to port 5001 on same host
    return `http://${host}:5001`;
  }
  // On native (Android/iOS): use env var or stored URL
  const configured = process.env.EXPO_PUBLIC_MODEL_URL ?? iotSensorUrl();
  const match = configured?.match(/^(https?:\/\/[^/]+)/);
  return match?.[1] ?? "http://127.0.0.1:5001";
}

function readRatio(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value > 1 ? value / 100 : value;
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

/** Sends the photo to the predict_crop model. Returns rich crop health diagnosis. */
export async function predictCropImage(imageBase64: string): Promise<CropScan> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${apiOrigin()}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
      signal: controller.signal,
    });
    const body = (await response.json()) as PredictBody;
    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : "The crop check failed.";
      throw new Error(message);
    }
    const confidence = readRatio(body.confidence);
    if (typeof body.crop !== "string" || !body.crop.trim() || confidence == null) {
      throw new Error("The model did not return a crop prediction.");
    }
    const diseaseConfidence = readRatio(body.disease_confidence) ?? confidence;

    const crop = body.crop.trim();
    const disease = typeof body.disease === "string" && body.disease.trim() ? body.disease.trim() : "Unknown";
    const detected = typeof body.detected === "string" && body.detected.trim() ? body.detected.trim() : `${crop} ${disease}`;

    let confidenceLevel: "HIGH" | "MODERATE" | "UNCERTAIN" = "UNCERTAIN";
    if (body.confidence_level === "HIGH" || body.confidence_level === "MODERATE" || body.confidence_level === "UNCERTAIN") {
      confidenceLevel = body.confidence_level;
    } else if (confidence >= 0.90) {
      confidenceLevel = "HIGH";
    } else if (confidence >= 0.75) {
      confidenceLevel = "MODERATE";
    }

    const status = typeof body.status === "string" && body.status.trim()
      ? body.status.trim()
      : (disease.toLowerCase().includes("healthy") ? "HEALTHY" : "DISEASE DETECTED");

    const confidencePct = typeof body.confidence_pct === "string"
      ? body.confidence_pct
      : `${(confidence * 100).toFixed(1)}%`;

    const treatment = readStringList(body.treatment);
    const prevention = readStringList(body.prevention);

    const sprayingSuitability = typeof body.spraying_suitability === "string" && body.spraying_suitability.trim()
      ? body.spraying_suitability.trim()
      : "CHECK";

    const sprayingReason = typeof body.spraying_reason === "string" && body.spraying_reason.trim()
      ? body.spraying_reason.trim()
      : "Weather conditions required before spraying";

    return {
      crop,
      detected,
      disease,
      confidence,
      confidencePct,
      confidenceLevel,
      status,
      treatment: treatment.length > 0 ? treatment : ["No specific treatment indicated."],
      prevention: prevention.length > 0 ? prevention : ["Maintain regular scouting and sanitation."],
      sprayingSuitability,
      sprayingReason,
      diseaseConfidence,
      note: typeof body.disease_note === "string" ? body.disease_note : null,
      topPredictions: Array.isArray(body.top_predictions) ? (body.top_predictions as TopPrediction[]) : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The crop check took too long. Try the photo again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
