import * as SecureStore from "expo-secure-store";
import { normalizeLocale, type Locale } from "../../../../packages/domain/src";
const KEY = "bdt.locale.v1";
export async function readStoredLocale(): Promise<Locale | null> {
  try { return normalizeLocale(await SecureStore.getItemAsync(KEY)); } catch { return null; }
}
export async function writeStoredLocale(locale: Locale): Promise<void> {
  try { await SecureStore.setItemAsync(KEY, locale); } catch {}
}
