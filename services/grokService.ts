export type GrokDayInput = {
  day: string;
  temperatureMax: number;
  temperatureMin: number;
  humidity: number;
  rainProbability: number;
  rainfallMm: number;
  windSpeed: number;
  condition: string;
  moistureUsed: number | null;
  moistureIsEstimate: boolean;
  motor: "ON" | "OFF";
  motorDecided: boolean;
  spray: "DO_NOT_SPRAY" | "SUITABLE";
};

export type GrokPlanInput = {
  place: string;
  crop: string;
  cropStage: string;
  soilType: string;
  drainage: string;
  moistureNow: number | null;
  moistureSource: string;
  days: GrokDayInput[];
};

export type GrokExplanation = {
  summary: string;
  daily: string[];
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3.8-27b";

function readEnv(name: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const value = env[name];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * The key is read from the environment. It is never written into source.
 * A gsk_ key is a Groq key. Expo only exposes EXPO_PUBLIC_* to the app.
 */
export function grokApiKey(): string | undefined {
  return readEnv("EXPO_PUBLIC_GROK_API_KEY") ?? readEnv("GROK_API_KEY");
}

export function isGrokConfigured(): boolean {
  return Boolean(grokApiKey());
}

function parseExplanation(content: string, dayCount: number): GrokExplanation | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as {
      summary?: unknown;
      daily?: unknown;
    };
    if (typeof parsed.summary !== "string" || !parsed.summary.trim()) {
      return null;
    }
    if (!Array.isArray(parsed.daily) || parsed.daily.length !== dayCount) {
      return null;
    }
    const daily = parsed.daily.map((line) => (typeof line === "string" ? line.trim() : ""));
    if (daily.some((line) => line.length === 0)) {
      return null;
    }
    return { summary: parsed.summary.trim(), daily };
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You write the farmer-facing week note. Motor and spray are already locked. Repeat those locked results in fresh wording. Never flip a motor or a spray value.

Reply with JSON only, no markdown:
{"summary":"two sentences","daily":["two sentences"]}

summary: exactly 2 sentences. Name the place, the crop, and the stage. Count pump-on days and spray-wait days from the input and use those exact counts. Do not dump every number.

daily: one string per input day, same order. Each string is exactly 2 sentences.
temperatureMax is °C, rainProbability is a percent, windSpeed is km/h, and rainfallMm is millimetres. Write the units.
Do not use the word "locked". Say the pump runs, the pump stays off, spraying can go ahead, or spraying should wait.
Sentence 1 uses that day's high temperature and rain chance, then says what the motor value means for this crop stage.
Sentence 2 uses the spray value and one practical detail that is different because of that day's wind, humidity, drainage, or moisture. Do not reuse a sentence from another day.

If motorDecided is false, say the pump is not decided because there is no sensor reading. Do not invent a moisture number.

Never write these phrases: "Irrigate in the morning", "Skip irrigation", "No irrigation needed", "Do not spray", "Soil moisture is low", "Rain is expected", "Soil moisture is enough", "Work early in the morning", "Check the soil by hand".`;

/**
 * Writes a week note from decisions the app already made.
 * Returns null when the key is missing or the call fails. Decisions stay in the app.
 */
export async function explainPlan(input: GrokPlanInput): Promise<GrokExplanation | null> {
  const key = grokApiKey();
  if (!key) {
    return null;
  }

  const model = readEnv("EXPO_PUBLIC_GROK_MODEL") ?? DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }
    return parseExplanation(content, input.days.length);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
