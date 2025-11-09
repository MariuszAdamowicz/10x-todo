# API Endpoint Implementation Plan: GET /projects/{id}

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia pobranie szczegółowych informacji o pojedynczym projekcie na podstawie jego unikalnego identyfikatora (ID). Odpowiedź zawiera kluczowe dane projektu, w tym jego nazwę, opis oraz klucz API. Dostęp do zasobu jest ograniczony wyłącznie do uwierzytelnionego użytkownika, który jest właścicielem danego projektu.

## 2. Szczegóły żądania
- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/projects/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (parametr ścieżki, `string`): Unikalny identyfikator projektu w formacie UUID.
  - **Opcjonalne:** Brak.
- **Request Body:** Brak.

## 3. Wykorzystywane typy
- **DTO odpowiedzi:** `ProjectGetDetailsDto`
  ```typescript
  export type ProjectGetDetailsDto = Pick<
    Project,
    'id' | 'name' | 'description' | 'api_key' | 'created_at'
  >;
  ```

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (200 OK):**
  ```json
  {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "api_key": "uuid",
    "created_at": "timestamptz"
  }
  ```
- **Odpowiedzi błędów:**
  - `400 Bad Request`: Jeśli podane `id` nie jest prawidłowym UUID.
  - `401 Unauthorized`: Jeśli użytkownik nie jest zalogowany.
  - `404 Not Found`: Jeśli projekt o podanym `id` nie istnieje lub użytkownik nie jest jego właścicielem.
  - `500 Internal Server Error`: W przypadku nieoczekiwanego błędu serwera.

## 5. Przepływ danych
1.  Żądanie `GET` trafia do pliku `src/pages/api/projects/[id].ts`.
2.  Middleware (`src/middleware/index.ts`) weryfikuje sesję użytkownika Supabase. Jeśli użytkownik nie jest uwierzytelniony, zwraca odpowiedź `401 Unauthorized`.
3.  Handler `GET` w pliku `[id].ts` pobiera `id` projektu z `Astro.params`.
4.  Parametr `id` jest walidowany przy użyciu schematu `zod` (`z.string().uuid()`). Jeśli walidacja się nie powiedzie, zwracany jest błąd `400 Bad Request`.
5.  Handler wywołuje nową metodę w serwisie `ProjectService`, np. `getProjectById(supabase, id, user.id)`, przekazując klienta Supabase, ID projektu oraz ID zalogowanego użytkownika.
6.  Metoda `getProjectById` wykonuje zapytanie do tabeli `projects` w bazie danych Supabase, filtrując wyniki po `id` projektu oraz `user_id`.
    ```sql
    SELECT id, name, description, api_key, created_at
    FROM projects
    WHERE id = {id} AND user_id = {user_id}
    LIMIT 1;
    ```
7.  Jeśli zapytanie nie zwróci żadnego rekordu (projekt nie istnieje lub użytkownik nie jest właścicielem), serwis zwraca `null`.
8.  Handler API, otrzymawszy `null` z serwisu, zwraca odpowiedź `404 Not Found`.
9.  Jeśli projekt zostanie znaleziony, serwis zwraca obiekt `ProjectGetDetailsDto`.
10. Handler API zwraca odpowiedź `200 OK` z danymi projektu w formacie JSON.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Każde żądanie musi być uwierzytelnione. Middleware Astro jest odpowiedzialne za weryfikację tokena sesji Supabase i zapewnienie, że `context.locals.user` jest dostępne.
- **Autoryzacja:** Logika autoryzacji jest zaimplementowana w warstwie serwisu (`project.service.ts`). Zapytanie do bazy danych bezwzględnie filtruje projekty po `user_id` zalogowanego użytkownika, co zapobiega atakom typu IDOR (Insecure Direct Object Reference) i uniemożliwia dostęp do projektów innych użytkowników.
- **Walidacja danych wejściowych:** Parametr `id` jest rygorystycznie walidowany jako UUID, co chroni przed potencjalnymi atakami, np. SQL Injection, chociaż użycie ORM Supabase już zapewnia ochronę.

## 7. Rozważania dotyczące wydajności
- Zapytanie do bazy danych jest proste i wykorzystuje klucz główny (`id`) oraz indeksowany klucz obcy (`user_id`), co zapewnia wysoką wydajność.
- Nie przewiduje się problemów z wydajnością przy standardowym obciążeniu. Ilość danych zwracanych w odpowiedzi jest niewielka.

## 8. Etapy wdrożenia
1.  **Utworzenie pliku endpointu:** Stwórz nowy plik `src/pages/api/projects/[id].ts`.
2.  **Implementacja handlera GET:** W pliku `[id].ts` zaimplementuj handler `GET` dla `APIContext`.
3.  **Walidacja ID projektu:** W handlerze `GET` dodaj logikę walidacji parametru `id` z `Astro.params` przy użyciu biblioteki `zod`.
4.  **Rozszerzenie serwisu projektów:** W pliku `src/lib/services/project.service.ts` dodaj nową, asynchroniczną metodę `getProjectById(supabase: SupabaseClient, id: string, userId: string)`.
5.  **Implementacja logiki w serwisie:** W metodzie `getProjectById` zaimplementuj zapytanie do Supabase, które pobiera projekt na podstawie `id` i `user_id`. Metoda powinna zwracać `ProjectGetDetailsDto` lub `null`.
6.  **Integracja handlera z serwisem:** W handlerze `GET` wywołaj metodę `projectService.getProjectById`, przekazując wymagane parametry.
7.  **Obsługa odpowiedzi:** Na podstawie wyniku z serwisu, zwróć odpowiednią odpowiedź HTTP: `200 OK` z danymi projektu lub `404 Not Found`.
8.  **Obsługa błędów:** Dodaj bloki `try...catch` do obsługi ewentualnych nieoczekiwanych błędów i zwracania odpowiedzi `500 Internal Server Error`.
