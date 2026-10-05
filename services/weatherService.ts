import { readNumber, roundTo } from "../utils/number";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export type DayForecast = {
  date: string;
  weekday: string;
  temperatureMax: number;
  temperatureMin: number;
  humidityMean: number;
  rainProbability: number;
  rainfallMm: number;
  windSpeed: number;
};

export type CurrentWeather = {
  time: string;
  temperature: number;
  humidity: number;
  rainProbability: number;
  windSpeed: number;
  soilTemperature: number | null;
};

export type WeatherReport = {
  latitude: number;
  longitude: number;
  /** Coordinates the app asked for. The API may snap the point slightly. */
  requestedLatitude: number;
  requestedLongitude: number;
  timezone: string;
  current: CurrentWeather;
  days: DayForecast[];
  fetchedAt: string;
};

type ForecastBody = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    soil_temperature_0cm?: (number | null)[];
  };
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
  };
  reason?: string;
};

function weekdayName(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }
  const noon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(noon);
}

function currentHourPrefix(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = read("hour") === "24" ? "00" : read("hour").padStart(2, "0");
  return `${read("year")}-${read("month")}-${read("day")}T${hour}`;
}

function currentIndex(times: string[], timeZone: string): number {
  try {
    const prefix = currentHourPrefix(timeZone);
    const exact = times.findIndex((time) => time.startsWith(prefix));
    if (exact >= 0) {
      return exact;
    }
    let nearest = 0;
    const stamp = `${prefix}:00`;
    for (let index = 0; index < times.length; index += 1) {
      if (times[index] <= stamp) {
        nearest = index;
      }
    }
    return nearest;
  } catch {
    return 0;
  }
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function requestForecast(
  latitude: number,
  longitude: number,
  includeSoilTemperature: boolean,
): Promise<Response> {
  const hourly = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation_probability",
    "wind_speed_10m",
  ];
  if (includeSoilTemperature) {
    hourly.push("soil_temperature_0cm");
  }
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: hourly.join(","),
    daily: "precipitation_sum",
    timezone: "auto",
    forecast_days: "7",
  });
  return fetch(`${FORECAST_URL}?${params.toString()}`);
}

function parseForecast(
  body: ForecastBody,
  latitude: number,
  longitude: number,
): WeatherReport {
  const times = body.hourly?.time ?? [];
  const dailyDates = body.daily?.time ?? [];
  if (times.length === 0 || dailyDates.length === 0) {
    throw new Error("Weather data was incomplete. Try again.");
  }

  const temperature = body.hourly?.temperature_2m ?? [];
  const humidity = body.hourly?.relative_humidity_2m ?? [];
  const rainChance = body.hourly?.precipitation_probability ?? [];
  const wind = body.hourly?.wind_speed_10m ?? [];
  const soilTemperature = body.hourly?.soil_temperature_0cm;
  const rainfall = body.daily?.precipitation_sum ?? [];
  const timeZone = body.timezone || "UTC";

  const days: DayForecast[] = dailyDates.slice(0, 7).map((date, dayIndex) => {
    const indexes: number[] = [];
    times.forEach((time, index) => {
      if (time.startsWith(date)) {
        indexes.push(index);
      }
    });
    const temps = indexes.map((index) => readNumber(temperature[index]));
    const humidities = indexes.map((index) => readNumber(humidity[index]));
    const chances = indexes.map((index) => readNumber(rainChance[index]));
    const winds = indexes.map((index) => readNumber(wind[index]));
    return {
      date,
      weekday: weekdayName(date),
      temperatureMax: roundTo(temps.length ? Math.max(...temps) : 0, 1),
      temperatureMin: roundTo(temps.length ? Math.min(...temps) : 0, 1),
      humidityMean: roundTo(mean(humidities)),
      rainProbability: roundTo(chances.length ? Math.max(...chances) : 0),
      rainfallMm: roundTo(readNumber(rainfall[dayIndex]), 1),
      windSpeed: roundTo(winds.length ? Math.max(...winds) : 0, 1),
    };
  });

  if (days.length === 0) {
    throw new Error("Weather data was incomplete. Try again.");
  }

  const nowIndex = currentIndex(times, timeZone);
  const soilNow = soilTemperature ? soilTemperature[nowIndex] : null;

  return {
    latitude: readNumber(body.latitude),
    longitude: readNumber(body.longitude),
    requestedLatitude: latitude,
    requestedLongitude: longitude,
    timezone: timeZone,
    fetchedAt: new Date().toISOString(),
    current: {
      time: times[nowIndex] ?? times[0],
      temperature: roundTo(readNumber(temperature[nowIndex]), 1),
      humidity: roundTo(readNumber(humidity[nowIndex])),
      rainProbability: roundTo(readNumber(rainChance[nowIndex])),
      windSpeed: roundTo(readNumber(wind[nowIndex]), 1),
      soilTemperature:
        typeof soilNow === "number" && Number.isFinite(soilNow) ? roundTo(soilNow, 1) : null,
    },
    days,
  };
}

export async function getWeather(latitude: number, longitude: number): Promise<WeatherReport> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("This location has no coordinates.");
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("This location is outside the weather map.");
  }

  let response: Response;
  try {
    response = await requestForecast(latitude, longitude, true);
    if (!response.ok) {
      response = await requestForecast(latitude, longitude, false);
    }
  } catch {
    throw new Error("Could not reach the weather service. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error("The weather service did not return a forecast. Try again.");
  }

  let body: ForecastBody;
  try {
    body = (await response.json()) as ForecastBody;
  } catch {
    throw new Error("The weather service sent a response we could not read.");
  }

  if (body.reason && !body.hourly) {
    throw new Error("The weather service rejected this location.");
  }

  return parseForecast(body, latitude, longitude);
}
