const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_TIMEOUT_MS = 12000;

type ApiRequestInit = RequestInit & {
  timeoutMs?: number;
};

function configuredApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

function isApiPath(input: RequestInfo | URL): input is string {
  return typeof input === "string" && input.startsWith("/api/");
}

function withApiBase(path: string) {
  return `${configuredApiBaseUrl()}${path}`;
}

function shouldUseConfiguredApiBase() {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "file:" || Boolean(import.meta.env.VITE_API_BASE_URL && !import.meta.env.DEV);
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: ApiRequestInit) {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal || controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("The backend did not respond. Please check that Spring Boot/MySQL are running, then try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchApiPath(path: string, init?: ApiRequestInit) {
  const backendUrl = withApiBase(path);

  if (shouldUseConfiguredApiBase()) {
    return fetchWithTimeout(backendUrl, init);
  }

  try {
    return await fetchWithTimeout(path, init);
  } catch (error) {
    return fetchWithTimeout(backendUrl, init);
  }
}

export function apiFetch(input: RequestInfo | URL, init?: ApiRequestInit) {
  if (isApiPath(input)) {
    return fetchApiPath(input, init);
  }

  return fetchWithTimeout(input, init);
}
