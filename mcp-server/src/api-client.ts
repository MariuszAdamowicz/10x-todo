// Prosty mechanizm do przechowywania konfiguracji w zasięgu zapytania.
// W środowisku serwerowym bez stanów (stateless), konfiguracja musi być
// przekazywana przy każdym zapytaniu.
interface ApiClientConfig {
  apiKey: string;
  apiUrl: string;
}

let currentConfig: ApiClientConfig | null = null;

export function setApiClientConfig(config: ApiClientConfig): void {
  currentConfig = config;
}

export function getApiClientConfig(): ApiClientConfig {
  if (!currentConfig) {
    throw new Error("API client config not set for this request. Call setApiClientConfig first.");
  }
  return currentConfig;
}

// Funkcja pomocnicza do wykonywania zapytań
export async function safeFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const config = getApiClientConfig();
  const url = `${config.apiUrl}${path}`;

  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    "X-API-Key": config.apiKey,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  // Zwracamy pusty obiekt jeśli status to 204 No Content
  if (response.status === 204) {
    return {};
  }

  // Sprawdzenie Content-Type przed parsowaniem JSON
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const textBody = await response.text();
    throw new Error(
      `API returned non-JSON response. Content-Type: ${contentType || "missing"}. Body preview: ${textBody.substring(0, 200)}`
    );
  }

  const data = await response.json();
  return data;
}
