const GOOGLE_IDENTITY_SRC = "https://accounts.google.com/gsi/client";

type CredentialResponse = {
  credential?: string;
};

type PromptMomentNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
};

type GoogleIdentityApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    nonce: string;
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
    context: "signin";
    use_fedcm_for_prompt: boolean;
  }) => void;
  prompt: (callback?: (notification: PromptMomentNotification) => void) => void;
  cancel?: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentityApi;
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

export function resolveGoogleWebClientId(value: string | undefined): string {
  return value?.trim() || "";
}

export function createGoogleNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function hashGoogleNonce(nonce: string): Promise<string> {
  const encoded = new TextEncoder().encode(nonce);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

function googleIdentity(): GoogleIdentityApi | null {
  return window.google?.accounts?.id || null;
}

export function loadGoogleIdentity(): Promise<void> {
  if (googleIdentity()) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SRC}"]`,
    );

    const finish = () => {
      if (googleIdentity()) resolve();
      else reject(new Error("google_identity_unavailable"));
    };

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("google_identity_script_failed")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("google_identity_script_failed"));
    document.head.appendChild(script);
  }).catch((error) => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
}

export async function getGoogleIdToken(
  clientId: string,
): Promise<{ token: string; nonce: string }> {
  const normalizedClientId = resolveGoogleWebClientId(clientId);
  if (!normalizedClientId) throw new Error("google_client_id_missing");

  await loadGoogleIdentity();
  const identity = googleIdentity();
  if (!identity) throw new Error("google_identity_unavailable");

  const nonce = createGoogleNonce();
  const hashedNonce = await hashGoogleNonce(nonce);

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (
      result:
        | { ok: true; token: string }
        | { ok: false; error: Error },
    ) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (result.ok) resolve({ token: result.token, nonce });
      else reject(result.error);
    };

    const timeout = window.setTimeout(
      () => finish({ ok: false, error: new Error("google_identity_timeout") }),
      90000,
    );

    identity.cancel?.();
    identity.initialize({
      client_id: normalizedClientId,
      nonce: hashedNonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "signin",
      use_fedcm_for_prompt: true,
      callback: (response) => {
        if (response.credential) {
          finish({ ok: true, token: response.credential });
        } else {
          finish({
            ok: false,
            error: new Error("google_identity_missing_credential"),
          });
        }
      },
    });

    identity.prompt((notification) => {
      if (notification.isNotDisplayed?.()) {
        finish({ ok: false, error: new Error("google_identity_not_displayed") });
      } else if (notification.isSkippedMoment?.()) {
        finish({ ok: false, error: new Error("google_identity_skipped") });
      } else if (notification.isDismissedMoment?.()) {
        finish({ ok: false, error: new Error("google_identity_dismissed") });
      }
    });
  });
}
