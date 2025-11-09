# Plan Implementacji Endpointu API: POST /projects/{id}/regenerate-api-key

## 1. Przegląd Endpointu
Celem tego endpointu jest unieważnienie starego klucza API dla określonego projektu i wygenerowanie nowego. Operacja ta jest dostępna tylko dla uwierzytelnionego użytkownika, który jest właścicielem danego projektu. W odpowiedzi zwracany jest nowo utworzony klucz API.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/projects/{id}/regenerate-api-key`
- **Parametry:**
  - **Wymagane:** `id` (UUID projektu) - przekazywany w ścieżce URL.
- **Ciało Żądania:** Brak.

## 3. Używane Typy
- **DTO Odpowiedzi:** `RegenerateApiKeyResultDto`
  ```typescript
  // zdefiniowany w src/types.ts
  export type RegenerateApiKeyResultDto = Pick<Project, 'api_key'>;
  ```
- **Model Polecenia (Command Model):** Nie dotyczy (brak ciała żądania).

## 4. Szczegóły Odpowiedzi
- **Odpowiedź Sukcesu (200 OK):**
  ```json
  {
    "api_key": "nowy-unikalny-klucz-api-uuid"
  }
  ```
- **Odpowiedzi Błędów:**
  - `400 Bad Request`: Nieprawidłowy format identyfikatora projektu.
  - `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
  - `403 Forbidden`: Użytkownik nie jest właścicielem projektu.
  - `404 Not Found`: Projekt o podanym identyfikatorze nie istnieje.
  - `500 Internal Server Error`: Wewnętrzny błąd serwera (np. błąd bazy danych).

## 5. Przepływ Danych
1.  Żądanie `POST` trafia do handlera endpointu w Astro (`src/pages/api/projects/[id]/regenerate-api-key.ts`).
2.  Middleware Supabase weryfikuje token JWT użytkownika i umieszcza sesję w `context.locals`.
3.  Handler endpointu pobiera `id` projektu z `Astro.params` oraz `user` z `context.locals.user`.
4.  Waliduje `id` projektu przy użyciu `zod`, aby upewnić się, że jest to poprawny UUID.
5.  Wywoływana jest nowa metoda `regenerateApiKey(projectId, userId)` w serwisie `ProjectService` (`src/lib/services/project.service.ts`).
6.  Wewnątrz serwisu:
    a. Pobierany jest projekt z bazy danych na podstawie `projectId`.
    b. Jeśli projekt nie zostanie znaleziony, rzucany jest błąd `404 Not Found`.
    c. Sprawdzana jest autoryzacja: czy `project.user_id` jest zgodne z `userId`. Jeśli nie, rzucany jest błąd `403 Forbidden`.
    d. Generowany jest nowy UUID dla klucza API.
    e. Rekord projektu w tabeli `projects` jest aktualizowany o nowy `api_key`.
    f. Serwis zwraca obiekt zawierający nowy klucz API.
7.  Handler endpointu odbiera dane z serwisu i zwraca odpowiedź `200 OK` z nowym kluczem API w formacie JSON.
8.  W przypadku wystąpienia błędu w serwisie, jest on przechwytywany i zwracany jako odpowiednia odpowiedź HTTP z błędem.

## 6. Kwestie Bezpieczeństwa
- **Uwierzytelnianie:** Dostęp do endpointu jest chroniony przez middleware Supabase, który wymaga ważnego tokenu JWT w nagłówku `Authorization`.
- **Autoryzacja:** Logika biznesowa w `ProjectService` musi bezwzględnie weryfikować, czy uwierzytelniony użytkownik jest właścicielem projektu (`project.user_id === user.id`), zanim pozwoli na regenerację klucza.
- **Walidacja Danych Wejściowych:** Identyfikator projektu (`id`) musi być walidowany jako poprawny format UUID, aby zapobiec błędom zapytań do bazy danych i potencjalnym atakom.
- **Generowanie Klucza:** Nowy klucz API musi być generowany przy użyciu kryptograficznie bezpiecznej funkcji, np. `gen_random_uuid()` w PostgreSQL, aby zapewnić jego unikalność i nieprzewidywalność.

## 7. Obsługa Błędów
Endpoint powinien być przygotowany na obsługę następujących scenariuszy błędów i zwracać odpowiednie kody statusu HTTP:
- **400 Bad Request:** Zwracany, gdy `id` w URL nie jest prawidłowym UUID.
- **401 Unauthorized:** Zwracany przez middleware, gdy brak jest ważnego tokenu sesji.
- **403 Forbidden:** Zwracany, gdy użytkownik próbuje zregenerować klucz dla projektu, którego nie jest właścicielem.
- **404 Not Found:** Zwracany, gdy projekt o podanym `id` nie istnieje w bazie danych.
- **500 Internal Server Error:** Zwracany w przypadku nieoczekiwanego błędu po stronie serwera, np. gdy operacja zapisu do bazy danych się nie powiedzie.

## 8. Kwestie Wydajności
Operacja jest stosunkowo prosta i nie powinna stanowić problemu wydajnościowego. Obejmuje jedno zapytanie `SELECT` i jedno `UPDATE` na indeksowanej kolumnie (`id`), co jest bardzo wydajne. Nie przewiduje się znaczących wąskich gardeł.

## 9. Kroki Implementacyjne
1.  **Utworzenie pliku endpointu:** Stwórz nowy plik `src/pages/api/projects/[id]/regenerate-api-key.ts`.
2.  **Implementacja handlera `POST`:**
    -   W pliku `regenerate-api-key.ts` wyeksportuj asynchroniczną funkcję `POST`.
    -   Pobierz `id` z `Astro.params` i `user` z `context.locals`.
    -   Sprawdź, czy użytkownik jest zalogowany. Jeśli nie, zwróć `401 Unauthorized`.
    -   Zwaliduj `id` przy użyciu `zod.string().uuid()`. Jeśli walidacja się nie powiedzie, zwróć `400 Bad Request`.
3.  **Rozszerzenie `ProjectService`:**
    -   W pliku `src/lib/services/project.service.ts` dodaj nową metodę asynchroniczną `regenerateApiKey(projectId: string, userId: string): Promise<RegenerateApiKeyResultDto>`.
    -   Wewnątrz metody zaimplementuj logikę opisaną w sekcji "Przepływ Danych" (pobranie projektu, weryfikacja właściciela, aktualizacja klucza).
    -   Użyj `supabase.rpc()` lub `supabase.from('projects').update()` do aktualizacji klucza.
    -   W przypadku błędów (brak projektu, brak uprawnień), rzucaj odpowiednie wyjątki (np. `new Error('Project not found')`), które zostaną obsłużone w handlerze.
4.  **Połączenie handlera z serwisem:**
    -   W handlerze `POST` wywołaj metodę `projectService.regenerateApiKey(id, user.id)`.
    -   Zaimplementuj blok `try...catch` do obsługi błędów rzucanych przez serwis i mapuj je na odpowiednie odpowiedzi HTTP.
    -   W przypadku sukcesu, zwróć odpowiedź `200 OK` z danymi zwróconymi przez serwis.
