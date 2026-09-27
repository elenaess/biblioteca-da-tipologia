import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { makeClient, Repository } from "../../../packages/data/src";
import { projectConfig } from "../../../packages/domain/src/project-config";
const storage = {
  async getItem(key: string) {
    const n = Number((await SecureStore.getItemAsync(key + ".count")) || 0);
    if (!n) return null;
    const chunks = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        SecureStore.getItemAsync(key + "." + i),
      ),
    );
    return chunks.every((x) => x !== null) ? chunks.join("") : null;
  },
  async setItem(key: string, value: string) {
    const old = Number((await SecureStore.getItemAsync(key + ".count")) || 0);
    const chunks = value.match(/[\s\S]{1,1800}/g) || [""];
    for (let i = 0; i < chunks.length; i++)
      await SecureStore.setItemAsync(key + "." + i, chunks[i]);
    await SecureStore.setItemAsync(key + ".count", String(chunks.length));
    for (let i = chunks.length; i < old; i++)
      await SecureStore.deleteItemAsync(key + "." + i);
  },
  async removeItem(key: string) {
    const n = Number((await SecureStore.getItemAsync(key + ".count")) || 0);
    await SecureStore.deleteItemAsync(key + ".count");
    for (let i = 0; i < n; i++)
      await SecureStore.deleteItemAsync(key + "." + i);
  },
};
export const client = makeClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || projectConfig.supabaseUrl,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || projectConfig.supabasePublishableKey,
  {
    auth: {
      storage,
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
export const repository = client ? new Repository(client) : null;
if (client)
  AppState.addEventListener("change", (state) => {
    if (state === "active") client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
