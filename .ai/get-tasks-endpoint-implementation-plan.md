
# Plan Implementacji Endpointu API: GET /tasks

## 1. Przegląd Endpointu
Ten endpoint służy do pobierania listy zadań (`tasks`). Jest przeznaczony zarówno dla uwierzytelnionych użytkowników (działających w kontekście wybranego projektu), jak i dla asystentów AI (działających w kontekście projektu powiązanego z kluczem API). Endpoint wspiera filtrowanie, sortowanie i paginację, co pozwala na elastyczne i wydajne przeglądanie danych.

## 2. Szczegóły Żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/tasks`
- **Parametry Zapytania (Query Params)**:
  - **Wymagane dla użytkownika**:
    - `projectId` (`uuid`): Identyfikator projektu, z którego mają być pobrane zadania.
  - **Opcjonalne**:
    - `parentId` (`uuid`): Filtruje zadania, zwracając tylko bezpośrednie pod-zadania wskazanego zadania nadrzędnego. Jeśli pominięty, zwraca zadania z najwyższego poziomu (bez rodzica).
    - `statusId` (`number`): Filtruje zadania po ich statusie (np. "To Do", "Done").
    - `page` (`number`, domyślnie `1`): Numer strony do paginacji wyników.
    - `limit` (`number`, domyślnie `10`): Liczba wyników na stronie (maksymalnie 100).
  - **Specyficzne dla AI**:
    - `delegated` (`boolean`): Jeśli `true`, zwraca tylko zadania delegowane do AI.

## 3. Używane Typy
- **DTO Zapytania (Walidacja Zod)**:
  ```typescript
  // Schemat Zod do walidacji parametrów zapytania
  const GetTasksQuerySchema = z.object({
    projectId: z.string().uuid().optional(), // Wymagane dla użytkownika, nieobecne dla AI
    parentId: z.string().uuid().optional(),
    statusId: z.coerce.number().int().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    delegated: z.coerce.boolean().optional()
  });
  ```
- **DTO Odpowiedzi**:
  - `TaskGetDto`: Zdefiniowany w `src/types.ts` jako alias dla typu `Task`.
  - **Struktura odpowiedzi sukcesu (200 OK)**:
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "project_id": "uuid",
          "parent_id": "uuid | null",
          "status_id": "smallint",
          "title": "string",
          "description": "string | null",
          "position": "integer",
          "is_delegated": "boolean",
          "created_by_ai": "boolean",
          "created_at": "timestamptz",
          "updated_at": "timestamptz"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100,
        "totalPages": 10
      }
    }
    ```

## 4. Przepływ Danych
1.  Żądanie `GET` trafia do endpointu `/src/pages/api/tasks/index.ts`.
2.  Middleware (`src/middleware/index.ts`) weryfikuje dane uwierzytelniające:
    -   Dla użytkownika: Sprawdza sesję i dołącza dane użytkownika do `context.locals`.
    -   Dla AI: Sprawdza nagłówek `X-API-Key` i dołącza `projectId` do `context.locals`.
3.  Handler endpointu parsuje i waliduje parametry zapytania (`Astro.url.searchParams`) przy użyciu schemy `GetTasksQuerySchema`.
4.  Handler wywołuje funkcję `getTasks` z serwisu `src/lib/services/task.service.ts`.
    -   Przekazuje do niej zwalidowane filtry, opcje paginacji oraz identyfikator podmiotu (`userId` dla użytkownika lub `projectId` dla AI).
5.  Serwis `task.service.ts` wykonuje następujące operacje:
    -   **Dla użytkownika**: Weryfikuje, czy `userId` ma uprawnienia do dostępu do przekazanego `projectId`.
    -   Dynamicznie buduje zapytanie do Supabase, uwzględniając wszystkie filtry (`projectId`, `parentId`, `statusId`, `delegated`).
    -   Stosuje paginację za pomocą metody `.range()`.
    -   Wykonuje dwa zapytania: jedno po dane, drugie po całkowitą liczbę pasujących rekordów (`count`).
    -   Zwraca obiekt `{ data, count }`.
6.  Handler formatuje odpowiedź, dołączając dane i informacje o paginacji, a następnie odsyła ją z kodem `200 OK`.

## 5. Kwestie Bezpieczeństwa
- **Uwierzytelnianie**: Obsługiwane przez middleware dla każdej z ról (użytkownik, AI).
- **Autoryzacja**:
  - **Kluczowy mechanizm**: Zapytanie w `task.service.ts` musi bezwzględnie filtrować projekty po `user_id` pobranym z sesji (`context.locals.user.id`), aby zapobiec próbom dostępu do danych innych użytkowników (IDOR).
  - Dla AI, `projectId` jest bezpiecznie powiązany z kluczem API, co ogranicza dostęp tylko do jednego projektu.
- **Walidacja danych wejściowych**: Użycie `zod` do walidacji wszystkich parametrów zapytania chroni przed błędnymi lub złośliwymi danymi wejściowymi.

## 6. Obsługa Błędów
- **`400 Bad Request`**: Zwracany, gdy parametry zapytania nie przejdą walidacji `zod` (np. `projectId` nie jest w formacie UUID, `page` nie jest liczbą).
- **`401 Unauthorized`**: Zwracany przez middleware, jeśli brakuje sesji użytkownika lub klucza API.
- **`403 Forbidden`**: Zwracany, gdy uwierzytelniony użytkownik próbuje uzyskać dostęp do projektu (`projectId`), do którego nie ma uprawnień.
- **`500 Internal Server Error`**: Zwracany w przypadku nieoczekiwanych problemów z bazą danych lub wewnętrzną logiką serwera.

## 7. Wydajność
- **Indeksowanie**: Należy upewnić się, że w bazie danych istnieją indeksy na kolumnach `project_id`, `parent_id`, `status_id` oraz `user_id` (w tabeli `projects`), aby zapewnić szybkie działanie zapytań filtrujących.
- **Paginacja**: Implementacja paginacji jest kluczowa dla wydajności przy dużych zbiorach danych, zapobiegając przesyłaniu tysięcy rekordów w jednym żądaniu. Limit `max(100)` chroni serwer przed nadmiernym obciążeniem.

## 8. Kroki Implementacyjne
1.  **Walidacja (Zod)**: W pliku `/src/pages/api/tasks/index.ts` zdefiniuj schemę `GetTasksQuerySchema` do walidacji parametrów `Astro.url.searchParams`.
2.  **Serwis (`task.service.ts`)**:
    -   Stwórz lub rozbuduj funkcję `getTasks(options)`.
    -   `options` powinien zawierać filtry (`projectId`, `parentId`, `statusId`, `delegated`), paginację (`page`, `limit`) oraz identyfikator podmiotu (`userId` lub `aiProjectId`).
    -   Zaimplementuj logikę weryfikacji uprawnień użytkownika do projektu.
    -   Zbuduj dynamiczne zapytanie Supabase z użyciem `.select()`, `.eq()`, `.is()`, `.in()` itd.
    -   Dodaj obsługę paginacji za pomocą `.range((page - 1) * limit, page * limit - 1)`.
    -   Pobierz całkowitą liczbę rekordów dla celów paginacji (`{ count: 'exact' }`).
    -   Zwróć `{ data, count }`.
3.  **Endpoint (`/src/pages/api/tasks/index.ts`)**:
    -   Zaimplementuj handler `GET`.
    -   Pobierz dane uwierzytelniające z `context.locals`.
    -   Zwaliduj parametry zapytania za pomocą przygotowanej schemy `zod`.
    -   Wywołaj serwis `taskService.getTasks()` z odpowiednimi parametrami.
    -   Obsłuż błędy (np. błąd walidacji, błąd z serwisu) i zwróć odpowiednie kody statusu HTTP.
    -   W przypadku sukcesu, zbuduj i zwróć obiekt odpowiedzi zawierający `data` i `pagination`.
