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
    throw new Error(`API request failed [${url}] with status ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  // Zwracamy pusty obiekt jeśli status to 204 No Content
  if (response.status === 204) {
    return {};
  }

  // Próbujemy sparsować jako JSON
  const textBody = await response.text();

  try {
    const data = JSON.parse(textBody);
    return data;
  } catch (parseError) {
    // Jeśli parsowanie nie udało się, sprawdź Content-Type i zgłoś szczegółowy błąd
    const contentType = response.headers.get("content-type");
    throw new Error(
      `API returned invalid JSON from [${url}]. Content-Type: ${contentType || "missing"}. Status: ${response.status}. Parse error: ${parseError instanceof Error ? parseError.message : "Unknown"}. Body preview: ${textBody.substring(0, 200)}`
    );
  }
}
