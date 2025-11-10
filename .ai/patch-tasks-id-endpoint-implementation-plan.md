
# Plan Implementacji API: Aktualizacja Zadania

## 1. Przegląd Endpointu
Ten endpoint umożliwia aktualizację istniejącego zadania (`task`) na podstawie jego identyfikatora. Umożliwia modyfikację pól takich jak `title`, `description`, `status_id` oraz `is_delegated`. Endpoint jest dostępny zarówno dla uwierzytelnionych użytkowników, jak i dla asystentów AI.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `PATCH`
- **Struktura URL:** `/api/tasks/{id}`
- **Parametry URL:**
  - **Wymagane:** `id` (uuid) - Identyfikator zadania do aktualizacji.
- **Ciało Żądania (Request Body):**
  - Struktura: `application/json`
  - Pola (wszystkie opcjonalne):
    - `title`: `string` - Nowy tytuł zadania.
    - `description`: `string | null` - Nowy opis zadania.
    - `status_id`: `smallint` - Nowy identyfikator statusu zadania.
    - `is_delegated`: `boolean` - Flaga delegacji zadania do AI (może być modyfikowana tylko przez użytkownika).

## 3. Używane Typy
- **Command Model:** `TaskUpdateCommand` (z `src/types.ts`)
  ```typescript
  export type TaskUpdateCommand = Partial<
    Pick<Task, 'title' | 'description' | 'status_id' | 'is_delegated'>
  >;
  ```
- **Schemat Walidacji Zod:** `updateTaskSchema` (do utworzenia w `src/lib/schemas/task.schemas.ts`)
- **Typ Odpowiedzi:** `Task` (z `src/types.ts`)

## 4. Szczegóły Odpowiedzi
- **Odpowiedź Sukcesu (200 OK):**
  - Zwraca pełny, zaktualizowany obiekt zadania.
  ```json
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
  ```
- **Odpowiedzi Błędów:**
  - `400 Bad Request`: Nieprawidłowy format `id` lub błędy walidacji ciała żądania (np. pusty obiekt, nieprawidłowe typy danych).
  - `401 Unauthorized`: Brak lub nieprawidłowe dane uwierzytelniające (sesja użytkownika lub klucz API).
  - `403 Forbidden`: Próba modyfikacji zadania bez odpowiednich uprawnień (np. AI próbuje zmienić status zadania bezpośrednio, zamiast przez proces propozycji, lub użytkownik próbuje zmienić zadanie nienależące do niego).
  - `404 Not Found`: Zadanie o podanym `id` nie istnieje lub nie jest dostępne dla danego użytkownika/AI.
  - `500 Internal Server Error`: Błędy po stronie serwera, np. problem z połączeniem do bazy danych.

## 5. Przepływ Danych
1.  Żądanie `PATCH` trafia do endpointu `/api/tasks/[id].ts`.
2.  Middleware (`src/middleware/index.ts`) weryfikuje dane uwierzytelniające (JWT użytkownika lub `X-API-Key` AI) i zapisuje informacje o tożsamości (użytkownik lub projekt AI) w `context.locals`.
3.  Handler `PATCH` w pliku `[id].ts` jest wywoływany.
4.  Następuje walidacja parametru `id` z URL (musi być poprawnym UUID).
5.  Ciało żądania jest walidowane przy użyciu schematu `updateTaskSchema` z biblioteki Zod.
6.  Wywoływana jest metoda serwisu `task.service.ts`: `updateTask(id, validatedData, principal)`.
7.  Serwis `updateTask` konstruuje i wykonuje zapytanie `UPDATE` do bazy danych Supabase.
    -   Zapytanie musi zawierać klauzulę `WHERE` sprawdzającą zarówno `id` zadania, jak i jego przynależność do uwierzytelnionego użytkownika (`user_id`) lub projektu (`project_id` w przypadku AI).
    -   Pole `updated_at` jest automatycznie aktualizowane.
8.  Serwis zwraca zaktualizowany obiekt zadania lub `null`, jeśli zadanie nie zostało znalezione lub użytkownik nie ma do niego dostępu.
9.  Endpoint zwraca odpowiedź `200 OK` z obiektem zadania lub odpowiedni kod błędu (`404`, `403` itp.).

## 6. Kwestie Bezpieczeństwa
- **Uwierzytelnianie:** Dostęp do endpointu musi być chroniony. Middleware musi zapewnić, że każde żądanie jest uwierzytelnione.
- **Autoryzacja:** Kluczowym elementem jest weryfikacja uprawnień. Logika biznesowa w serwisie musi rygorystycznie sprawdzać, czy podmiot (użytkownik lub AI) ma prawo do modyfikacji danego zadania. Należy zapobiec sytuacji, w której użytkownik modyfikuje zadania innego użytkownika.
- **Ograniczenia AI:** Zgodnie ze specyfikacją, AI nie powinno móc bezpośrednio zmieniać statusu zadania (`status_id`) ani flagi `is_delegated` za pomocą tego endpointu. Logika serwisu musi blokować takie próby, zezwalając AI jedynie na modyfikację `title` i `description`. Zmiany statusu przez AI muszą przechodzić przez dedykowany endpoint propozycji (`/propose-status`).
- **Walidacja Danych:** Wszystkie dane wejściowe muszą być walidowane za pomocą Zod, aby zapobiec atakom typu SQL Injection i zapewnić spójność danych.

## 7. Kwestie Wydajności
- Zapytanie `UPDATE` w bazie danych powinno być szybkie, ponieważ operuje na kluczu głównym (`id`).
- Należy upewnić się, że na kolumnach używanych w klauzuli `WHERE` (`id`, `project_id`) istnieją indeksy w bazie danych, co jest domyślnym zachowaniem dla kluczy głównych i obcych.

## 8. Kroki Implementacyjne
1.  **Schemat Walidacji:** W pliku `src/lib/schemas/task.schemas.ts` zdefiniuj nowy schemat `updateTaskSchema` używając `zod`. Powinien on bazować na istniejącym schemacie zadania, ale wszystkie pola powinny być opcjonalne (`.partial()`).
2.  **Serwis:** W pliku `src/lib/services/task.service.ts` zaimplementuj asynchroniczną funkcję `updateTask(id: string, data: TaskUpdateCommand, principal: { userId?: string, projectId?: string }): Promise<Task | null>`.
    -   Funkcja powinna przyjmować `id` zadania, zwalidowane dane oraz obiekt `principal` z informacją o tożsamości.
    -   Wewnątrz funkcji, dodaj logikę sprawdzającą uprawnienia (np. blokowanie zmiany `is_delegated` przez AI).
    -   Skonstruuj i wykonaj zapytanie `update` do Supabase, używając `eq('id', id)` oraz `eq('project_id', principal.projectId)` lub podobnej logiki dla użytkownika.
    -   Zwróć zaktualizowany rekord lub `null`.
3.  **Endpoint API:** W pliku `src/pages/api/tasks/[id].ts` dodaj `export` dla metody `PATCH`.
    -   Pobierz `id` z `context.params`.
    -   Pobierz `principal` z `context.locals`.
    -   Zwaliduj `id` i ciało żądania.
    -   Wywołaj serwis `taskService.updateTask(...)`.
    -   Na podstawie wyniku z serwisu, zwróć odpowiednią odpowiedź HTTP (`Astro.Response`).
