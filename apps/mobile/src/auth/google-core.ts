export type IdTokenAuth = {
  signInWithIdToken(input: {
    provider: "google";
    token: string;
  }): Promise<{ error: Error | null | { message?: string } }>;
};

export async function exchangeGoogleIdToken(
  auth: IdTokenAuth,
  idToken: string | null | undefined,
): Promise<void> {
  const token = idToken?.trim();
  if (!token) throw new Error("O Google não retornou um idToken válido.");
  const { error } = await auth.signInWithIdToken({ provider: "google", token });
  if (error) {
    if (error instanceof Error) throw error;
    throw new Error(error.message || "O Supabase recusou o token do Google.");
  }
}

export type NativeGoogleResponse =
  | { type: "cancelled"; data: null }
  | { type: "success"; data: { idToken: string | null } };

export async function completeGoogleNativeResponse(
  auth: IdTokenAuth,
  response: NativeGoogleResponse,
): Promise<"success" | "cancelled"> {
  if (response.type === "cancelled") return "cancelled";
  await exchangeGoogleIdToken(auth, response.data.idToken);
  return "success";
}
