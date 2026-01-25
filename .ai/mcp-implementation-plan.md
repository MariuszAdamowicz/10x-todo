### Plan Implementacji Serwera MCP (10x-Todo)

#### 1. Struktura Projektu

Serwer MCP zostanie zaimplementowany jako niezależny moduł wewnątrz istniejącego katalogu `mcp/` w repozytorium (monorepo). Będzie to aplikacja Node.js wykorzystująca TypeScript.

**Proponowana struktura plików:**

```text
mcp/
├── package.json          # Zależności: @modelcontextprotocol/sdk, zod, axios/fetch
├── tsconfig.json         # Konfiguracja TS (ESM, strict)
├── src/
│   ├── index.ts          # Punkt wejścia: inicjalizacja serwera i transportu stdio
│   ├── config.ts         # Walidacja zmiennych środowiskowych przekazanych przez klienta
│   ├── types.ts          # Współdzielone typy TypeScript (DTOs z głównego API)
│   ├── api-client.ts     # Wrapper na fetch z obsługą autentykacji i błędów
│   ├── tools/
│   │   ├── index.ts      # Rejestracja wszystkich narzędzi
│   │   ├── read.ts       # Narzędzia do odczytu (get_task_hierarchy, list_delegated)
│   │   └── write.ts      # Narzędzia do zapisu (create, update, propose)
│   ├── resources/
│   │   └── index.ts      # Definicje zasobów (todo://tasks/...)
│   └── prompts/
│       └── index.ts      # Definicje promptów (10x-assistant)
```

#### 2. Kluczowe Moduły

- **`src/index.ts`**:
  - Inicjalizacja `McpServer` z `@modelcontextprotocol/sdk/server/mcp.js`.
  - Inicjalizacja `StdioServerTransport`.
  - Podłączenie modułów tools, resources i prompts.
  - Obsługa sygnałów zamknięcia procesu.

- **`src/config.ts`**:
  - Odpowiedzialny za pobranie i walidację `TODO_API_KEY` oraz `TODO_API_URL` z `process.env`.
  - **Kluczowa zmiana**: Moduł ten musi rzucić wyraźny błąd, jeśli klucz nie zostanie dostarczony przez proces nadrzędny (Klienta MCP), co wymusza poprawną konfigurację po stronie klienta.

- **`src/api-client.ts`**:
  - Klasa lub zestaw funkcji do komunikacji z REST API aplikacji 10x-Todo.
  - Pobiera klucz API dynamicznie z konfiguracji (pozwala to na uruchomienie wielu instancji serwera z różnymi kluczami).
  - **Kluczowa funkcja**: `safeFetch` – przechwytuje błędy HTTP (4xx, 5xx) i tłumaczy je na czytelne komunikaty tekstowe.

- **`src/tools/`**:
  - Modularyzacja narzędzi. Każde narzędzie eksportuje definicję zawierającą nazwę, opis, schemat Zod i handler.

#### 3. Definicje Narzędzi (Tools)

Poniżej znajdują się szczegółowe specyfikacje narzędzi. Wszystkie identyfikatory są typu UUID.

- **Narzędzie: `get_task_hierarchy`**
  - **Opis**: Pobiera pełną strukturę (drzewo) wszystkich zadań w projekcie.
  - **Schemat Wejściowy (Zod)**: `{}` (brak parametrów).
  - **Logika `execute`**: `GET /api/tasks` -> zwraca JSON.
  - **Opakowanie Wyniku**: `{ content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] }`

- **Narzędzie: `list_delegated_tasks`**
  - **Opis**: Pobiera listę zadań bezpośrednio przypisanych do asystenta AI (`is_delegated: true`).
  - **Schemat Wejściowy (Zod)**: `{}` (brak parametrów).
  - **Logika `execute`**: `GET /api/tasks?delegated=true`.
  - **Opakowanie Wyniku**: `{ content: [{ type: "text", text: JSON.stringify(delegatedTasks, null, 2) }] }`

- **Narzędzie: `create_subtask`**
  - **Opis**: Tworzy nowe pod-zadanie.
  - **Schemat Wejściowy (Zod)**:
    ```typescript
    z.object({
      parentId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
    });
    ```
  - **Logika `execute`**: `POST /api/tasks` z `{ parent_id, title, description }`.

- **Narzędzie: `update_subtask_status`**
  - **Opis**: Aktualizuje status pod-zadania stworzonego przez AI.
  - **Schemat Wejściowy (Zod)**:
    ```typescript
    z.object({
      taskId: z.string().uuid(),
      status: z.enum(["todo", "in_progress", "done", "cancelled"]),
    });
    ```
  - **Logika `execute`**: `PATCH /api/tasks/{taskId}` z `{ status }`.

- **Narzędzie: `propose_task_resolution`**
  - **Opis**: Zgłasza człowiekowi zakończenie zadania delegowanego lub prosi o anulowanie.
  - **Schemat Wejściowy (Zod)**:
    ```typescript
    z.object({
      taskId: z.string().uuid(),
      status: z.enum(["done", "cancelled"]),
      comment: z.string().min(5),
    });
    ```
  - **Logika `execute`**: `POST /api/tasks/{taskId}/propose-status` z `{ status, comment }`.

#### 4. Definicje Zasobów (Resources)

- **Zasób: `todo://tasks/delegated`** (JSON) - Lista zadań priorytetowych.
- **Zasób: `todo://tasks/all`** (JSON) - Pełny kontekst projektu.

#### 5. Definicje Promptów

- **Prompt: `10x-assistant`**: System prompt definiujący rolę Junior Developera, nakazujący sprawdzanie zadań delegowanych i komentowanie propozycji.

#### 6. Konfiguracja Serwera i Wdrożenia

Kluczową zmianą jest przeniesienie odpowiedzialności za `API_KEY` na klienta (rejestrację serwera).

- **Wymagane Zmienne Środowiskowe (dostarczane przez Klienta MCP)**:
  - `TODO_API_URL`: Adres API (np. `http://localhost:3000`).
  - `TODO_API_KEY`: Unikalny klucz API dla danej sesji/klienta.

- **Przykład konfiguracji klienta (np. `claude_desktop_config.json`)**:

  ```json
  {
    "mcpServers": {
      "10x-todo": {
        "command": "node",
        "args": ["/absolute/path/to/10x-todo/mcp/dist/index.js"],
        "env": {
          "TODO_API_URL": "http://localhost:3000",
          "TODO_API_KEY": "KLUCZ_API_GENEROWANY_W_APLIKACJI"
        }
      }
    }
  }
  ```

  _Dzięki temu podejściu, ten sam kod serwera może być zarejestrowany wielokrotnie z różnymi kluczami (np. dla różnych projektów lub użytkowników)._

- **Uruchamianie**: `node dist/index.js` (skompilowany JS).

#### 7. Obsługa Błędów

- Błędy HTTP (401/403) z API będą tłumaczone na: _"Odmowa dostępu. Sprawdź poprawność klucza API w konfiguracji klienta MCP."_
- Serwer nie powinien się crashować przy błędnym kluczu, lecz zwracać błąd wewnątrz wywołania narzędzia (`ToolError`).

#### 8. Strategia Testowania

- **Testy manualne**: Uruchomienie z `TODO_API_KEY=test-key npx @modelcontextprotocol/inspector node dist/index.js`.
- **Weryfikacja**: Sprawdzenie czy endpointy są wywoływane z poprawnym nagłówkiem `X-API-Key` pobranym ze zmiennych środowiskowych.
