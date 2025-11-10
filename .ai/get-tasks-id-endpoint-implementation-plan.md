
# Plan Implementacji Endpointu API: GET /tasks/{id}

## 1. Przegląd Endpointu
Ten endpoint służy do pobierania szczegółowych informacji o pojedynczym zadaniu na podstawie jego unikalnego identyfikatora (ID). Dostęp do zadania jest autoryzowany na podstawie sesji użytkownika lub klucza API (dla AI), a polityki RLS w bazie danych zapewniają, że zwracane są tylko te zadania, do których żądający ma uprawnienia.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/tasks/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (w ścieżce URL): Unikalny identyfikator zadania w formacie UUID.
  - **Opcjonalne:** Brak.
- **Ciało Żądania:** Brak.

## 3. Używane Typy
- **DTO (Data Transfer Object):**
  - `TaskGetDto`: Reprezentuje pełny obiekt zadania zwracany w odpowiedzi. Zgodnie z `src/types.ts`, jest to alias do typu `Task`, który odpowiada strukturze tabeli `tasks`.
    ```typescript
    // src/types.ts
    export type TaskGetDto = Task;
    ```

## 4. Szczegóły Odpowiedzi
- **Odpowiedź Sukcesu (200 OK):**
  - Zwraca obiekt JSON reprezentujący zadanie, zgodny z typem `TaskGetDto`.
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
- **Kody Statusów Błędów:**
  - `400 Bad Request`: Jeśli podany `id` ma nieprawidłowy format (np. nie jest UUID).
  - `401 Unauthorized`: Jeśli żądanie nie zawiera prawidłowych danych uwierzytelniających (sesja użytkownika lub klucz API).
  - `404 Not Found`: Jeśli zadanie o podanym `id` nie istnieje lub użytkownik/AI nie ma do niego dostępu.
  - `500 Internal Server Error`: W przypadku nieoczekiwanych błędów po stronie serwera (np. błąd bazy danych).

## 5. Przepływ Danych
1.  Klient (przeglądarka lub AI) wysyła żądanie `GET` na adres `/api/tasks/{id}`.
2.  Middleware Astro (`src/middleware/index.ts`) przechwytuje żądanie, weryfikuje dane uwierzytelniające (sesję użytkownika lub klucz API) i umieszcza klienta Supabase w `context.locals.supabase`.
3.  Handler endpointu w `src/pages/api/tasks/[id].ts` jest wywoływany.
4.  Handler waliduje parametr `id` ze ścieżki URL przy użyciu `zod`.
5.  Handler wywołuje metodę `getTaskById` z serwisu `TaskService` (`src/lib/services/task.service.ts`), przekazując `id` zadania oraz klienta Supabase.
6.  Metoda `getTaskById` wykonuje zapytanie `SELECT` do tabeli `tasks` w bazie danych Supabase, filtrując po `id`.
7.  Polityki Row Level Security (RLS) na tabeli `tasks` automatycznie zapewniają, że zapytanie zwróci dane tylko wtedy, gdy użytkownik jest właścicielem projektu, do którego należy zadanie (lub AI ma dostęp przez klucz API).
8.  Jeśli zadanie zostanie znalezione, serwis zwraca jego dane do handlera. Jeśli nie, zwraca `null`.
9.  Handler endpointu formatuje odpowiedź:
    -   Jeśli zadanie zostało znalezione, zwraca je jako JSON z kodem statusu `200 OK`.
    -   Jeśli zadanie nie zostało znalezione, zwraca odpowiedź z kodem `404 Not Found`.

## 6. Kwestie Bezpieczeństwa
- **Uwierzytelnianie:** Middleware weryfikuje, czy użytkownik jest zalogowany (przez JWT w cookies) lub czy AI dostarczyło prawidłowy `X-API-Key`.
- **Autoryzacja:** Dostęp do danych jest kontrolowany przez polityki RLS w Supabase. Zapytanie do bazy danych powiedzie się tylko dla zadań w projektach, do których żądający ma uprawnienia. Zapobiega to wyciekowi danych między różnymi użytkownikami.
- **Walidacja Danych Wejściowych:** Parametr `id` musi być walidowany jako prawidłowy UUID, aby zapobiec błędom zapytań do bazy danych i potencjalnym atakom (np. SQL Injection, chociaż Supabase SDK parametryzuje zapytania).

## 7. Kwestie Wydajności
- Zapytanie do bazy danych filtruje po kluczu głównym (`id`), co jest operacją bardzo wydajną dzięki domyślnemu indeksowi `PRIMARY KEY`.
- Nie przewiduje się problemów z wydajnością dla tego endpointu, ponieważ operuje on na pojedynczym rekordzie.

## 8. Kroki Implementacyjne
1.  **Utworzenie pliku endpointu:**
    -   Stwórz nowy plik `src/pages/api/tasks/[id].ts`.
    -   Dodaj `export const prerender = false;` na początku pliku.

2.  **Implementacja handlera `GET`:**
    -   Zdefiniuj asynchroniczną funkcję `GET({ params, context }: APIContext)` w pliku `[id].ts`.
    -   Pobierz klienta Supabase z kontekstu: `const supabase = context.locals.supabase;`.

3.  **Walidacja parametru `id`:**
    -   Użyj `zod` do stworzenia schemy walidującej `params.id` jako string w formacie UUID.
    -   W przypadku błędu walidacji, zwróć odpowiedź z kodem `400 Bad Request` i czytelnym komunikatem błędu.

4.  **Stworzenie metody w serwisie:**
    -   W pliku `src/lib/services/task.service.ts` dodaj nową metodę `getTaskById`.
    -   Metoda powinna przyjmować dwa argumenty: `taskId: string` i `supabase: SupabaseClient`.
    -   Typ `SupabaseClient` powinien być importowany z `src/db/supabase.client.ts`.

5.  **Implementacja logiki w serwisie:**
    -   Wewnątrz `getTaskById`, wykonaj zapytanie do Supabase:
      ```typescript
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      ```
    -   Dodaj obsługę błędów zapytania (`error`).
    -   Zwróć `data` (obiekt zadania) w przypadku sukcesu lub `null`, jeśli `data` jest puste.

6.  **Połączenie endpointu z serwisem:**
    -   W handlerze `GET` w `[id].ts`, wywołaj nowo utworzoną metodę `taskService.getTaskById(validatedId, supabase)`.
    -   Obsłuż wynik:
        -   Jeśli metoda zwróci `null`, odpowiedz kodem `404 Not Found`.
        -   Jeśli metoda zwróci obiekt zadania, odpowiedz kodem `200 OK` i zwróć obiekt jako JSON.
        -   Obsłuż potencjalne błędy rzucone przez serwis, zwracając `500 Internal Server Error`.
