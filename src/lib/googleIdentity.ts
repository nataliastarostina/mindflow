'use client';

const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_DOCS_SCOPE = 'https://www.googleapis.com/auth/drive.file';

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClientConfig = {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
};

export class GoogleAuthorizationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'GoogleAuthorizationError';
  }
}

export function isGoogleAccessDeniedError(error: unknown): boolean {
  return error instanceof GoogleAuthorizationError && error.code === 'access_denied';
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
        };
      };
    };
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google authorization is only available in the browser.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google authorization script failed to load.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Google authorization script failed to load.'));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

export async function requestGoogleDocsAccessToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google authorization is not available.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DOCS_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new GoogleAuthorizationError(response.error_description || response.error, response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error('Google did not return an access token.'));
          return;
        }

        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account consent' });
  });
}
