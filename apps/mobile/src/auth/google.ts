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

function configureNativeGoogle() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId)
    throw new Error(
      "Defina EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID com um OAuth Client ID do tipo Web.",
    );
  if (configuredClientId !== webClientId) {
    GoogleSignin.configure({ webClientId, offlineAccess: false });
    configuredClientId = webClientId;
  }
}

export async function signInWithGoogleNative(): Promise<"success" | "cancelled"> {
  if (!client) throw new Error("Supabase não está configurado neste build.");
  if (Platform.OS !== "android")
    throw new Error("O login Google nativo deste pacote está configurado para Android.");
  configureNativeGoogle();
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
