import * as Location from "expo-location";
import type { Place } from "../types/farm";
import { formatCoords } from "../utils/format";

type GeoResult = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
};

type ReverseBody = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
};

function placeLabel(parts: (string | undefined)[]): string {
  const cleaned = parts.filter((part): part is string => Boolean(part && part.trim()));
  return cleaned.filter((part, index) => part !== cleaned[index - 1]).join(", ");
}

function toPlace(result: GeoResult): Place | null {
  if (!result.name || result.latitude == null || result.longitude == null) {
    return null;
  }
  if (!Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) {
    return null;
  }
  const label = placeLabel([result.name, result.admin1, result.country]);
  return {
    id: String(result.id ?? `${result.latitude},${result.longitude}`),
    name: result.name,
    label,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const name = query.trim();
  if (name.length < 2) {
    return [];
  }
  const params = new URLSearchParams({
    name,
    count: "6",
    language: "en",
    format: "json",
  });

  let response: Response;
  try {
    response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  } catch {
    throw new Error("Could not search locations. Check your connection.");
  }
  if (!response.ok) {
    throw new Error("Location search failed. Try again.");
  }

  const body = (await response.json()) as { results?: GeoResult[] };
  return (body.results ?? []).map(toPlace).filter((place): place is Place => place != null);
}

async function reversePlaceName(latitude: number, longitude: number): Promise<string> {
  try {
    const url =
      "https://api.bigdatacloud.net/data/reverse-geocode-client" +
      `?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const response = await fetch(url);
    if (!response.ok) {
      return formatCoords(latitude, longitude);
    }
    const body = (await response.json()) as ReverseBody;
    const label = placeLabel([
      body.city || body.locality || "Your field",
      body.principalSubdivision,
      body.countryName,
    ]);
    return label || formatCoords(latitude, longitude);
  } catch {
    return formatCoords(latitude, longitude);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Device GPS, then a place name. Throws a short message the screen can show. */
export async function locateDevice(): Promise<Place> {
  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) {
    throw new Error("Location is turned off. Search for your village instead.");
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission was denied. Search for your village instead.");
  }

  let position: Location.LocationObject | null = null;
  try {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      12000,
      "Location timed out. Search for your village instead.",
    );
  } catch {
    position = await Location.getLastKnownPositionAsync();
  }

  if (!position) {
    throw new Error("Could not read this device location. Search for your village instead.");
  }

  const { latitude, longitude } = position.coords;
  return placeFromCoordinates(latitude, longitude, "device");
}

/** A map tap or any coordinates, named with the same reverse geocoder as GPS. */
export async function placeFromCoordinates(
  latitude: number,
  longitude: number,
  source = "map",
): Promise<Place> {
  const label = await reversePlaceName(latitude, longitude);
  const name = label.split(",")[0] || "Field";
  return {
    id: `${source}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
    name,
    label,
    latitude,
    longitude,
  };
}
