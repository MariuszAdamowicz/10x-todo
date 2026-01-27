### Plan Implementacji Serwera MCP (10x-Todo) - Wersja HTTP

#### 1. Architektura

Serwer MCP został zrefaktoryzowany z aplikacji opartej na `stdio` do standardowej usługi HTTP opartej na `Express.js`. Zapewnia to większą elastyczność i łatwość integracji z różnymi klientami AI, w tym z tymi, które nie wspierają uruchamiania lokalnych procesów.

**Kluczowe zmiany:**

- **Protokół:** Zmiana z `stdio` na `HTTP/S`.
- **Framework:** Użycie `Express.js` do obsługi zapytań.
- **Konfiguracja:** Parametry (`apiKey`, `apiUrl`) są przekazywane dynamicznie w ścieżce URL, a nie przez zmienne środowiskowe.
- **Stanowość:** Serwer jest bezstanowy (stateless). Każde zapytanie HTTP jest w pełni niezależne i inicjalizuje kontekst MCP na nowo.

#### 2. Struktura Projektu

Struktura plików pozostaje w dużej mierze zgodna z pierwotnym planem, z następującymi modyfikacjami:

- Usunięto `src/config.ts`.
- Zmodyfikowano `src/index.ts` na serwer Express.
- Zmodyfikowano `src/api-client.ts` do obsługi dynamicznej konfiguracji.

```text
mcp-server/
├── package.json          # Zależności: @modelcontextprotocol/sdk, express, etc.
├── tsconfig.json         # Konfiguracja TS
├── README.md             # NOWA DOKUMENTACJA
├── src/
│   ├── index.ts          # Główny plik z serwerem Express
│   ├── index.test.ts     # Testy dla serwera HTTP
│   ├── types.ts          # Współdzielone typy
│   ├── api-client.ts     # Wrapper na fetch z dynamiczną konfiguracją
│   ├── tools/
│   │   ├── index.ts
│   │   ├── read.ts
│   │   └── write.ts
│   ├── resources/
│   │   └── index.ts
│   └── prompts/
│       └── index.ts
```

#### 3. API Endpoint

Serwer udostępnia jeden główny endpoint do komunikacji z MCP oraz endpoint do monitorowania stanu.

- **Endpoint:** `POST /:apiKey/:encodedApiUrl/mcp`
  - **Metoda:** `POST`
  - **Parametry w ścieżce:**
    - `apiKey` (string, UUID): Klucz API wygenerowany w aplikacji 10x-Todo.
    - `encodedApiUrl` (string, base64): Adres URL głównego API aplikacji 10x-Todo, zakodowany w Base64.
  - **Ciało zapytania (`body`):** Standardowy obiekt żądania MCP (`McpRequest`).
  - **Odpowiedź:** Standardowy obiekt odpowiedzi MCP (`McpResponse`).

- **Endpoint:** `GET /health`
  - **Metoda:** `GET`
  - **Odpowiedź:** Status `200 OK` z tekstem `OK`. Służy do `HEALTHCHECK` w Dockerze.

#### 4. Konfiguracja Klienta AI

Klient AI (np. Gemini CLI, Cursor) musi być skonfigurowany tak, aby wysyłał zapytania na dynamicznie zbudowany adres URL.

- **Przykład adresu URL dla klienta:**
  ```
  http://localhost:8081/d1a2b3c4-e5f6-a7b8-c9d0-e1f2a3b4c5d6/aHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwaQ==/mcp
  ```
  Gdzie:
  - `d1a2b3c4-...` to `apiKey`.
  - `aHR0cDovL...` to `http://localhost:8080/api` zakodowane w Base64.

#### 5. Uruchamianie i Wdrożenie

- **Lokalnie:** Serwer jest częścią `docker-compose.yml` i jest uruchamiany razem z główną aplikacją.
- **Produkcyjnie:** Obraz Docker jest budowany i wdrażany na platformie hostingowej (np. DigitalOcean).
- **Port:** Serwer nasłuchuje na porcie zdefiniowanym w zmiennej środowiskowej `PORT` (domyślnie `8081`).

#### 6. Strategia Testowania

- Testy jednostkowe i integracyjne zaimplementowane przy użyciu `vitest` i `supertest`.
- Testy weryfikują działanie endpointu `/health` oraz poprawne parsowanie parametrów z URL i obsługę błędów w głównym endpoincie MCP.
