import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { client } from "../client";
import { projectConfig } from "../../../../packages/domain/src/project-config";
import { completeGoogleNativeResponse } from "./google-core";

let configuredClientId = "";

function readGoogleWebClientId(): string {
  const env = [
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
  ]
    .map((x) => x?.trim())
    .find(Boolean);
  return env || "";
}

function configureNativeGoogle(): boolean {
  const webClientId = readGoogleWebClientId();
  if (!webClientId) return false;
  if (configuredClientId !== webClientId) {
    GoogleSignin.configure({ webClientId, offlineAccess: false });
    configuredClientId = webClientId;
  }
  return true;
}

export async function signInWithGoogleNative(): Promise<"success" | "cancelled"> {
  if (!client) throw new Error("Supabase não está configurado neste build.");
  if (Platform.OS !== "android")
    return await signInWithGoogleBrowserFallback();
  if (!configureNativeGoogle())
    return await signInWithGoogleBrowserFallback();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    return await completeGoogleNativeResponse(client.auth, response);
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) return "cancelled";
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
        throw new Error("O Google Play Services precisa ser atualizado para entrar.");
    }
    throw error;
  }
}

export async function signInWithGoogleBrowserFallback(): Promise<
  "success" | "cancelled"
> {
  if (!client) throw new Error("Supabase não está configurado neste build.");
  const redirectTo = projectConfig.mobileRedirectUrl;
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Não foi possível abrir o login.");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return "cancelled";
  const url = new URL(result.url);
  if (url.protocol + "//" + url.hostname + url.pathname !== redirectTo)
    throw new Error("Retorno de login inválido.");
  const code = url.searchParams.get("code");
  if (!code)
    throw new Error(
      url.searchParams.get("error_description") || "Login cancelado.",
    );
  const exchanged = await client.auth.exchangeCodeForSession(code);
  if (exchanged.error) throw exchanged.error;
  return "success";
}
