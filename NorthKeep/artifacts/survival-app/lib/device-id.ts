import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const STORAGE_KEY = "northkeep_device_id";

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cachedId = stored;
    return stored;
  }

  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, id);
  cachedId = id;
  return id;
}
