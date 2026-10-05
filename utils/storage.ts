import AsyncStorage from "@react-native-async-storage/async-storage";

export type StorageEnvelope<T> = {
  value: T;
  savedAt: string;
};

export async function readStored<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeStored<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best effort; the in-memory workflow remains usable.
  }
}

export async function removeStored(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}
