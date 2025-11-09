# Plan Implementacji Endpointu API: Usuwanie Projektu

## 1. Przegląd Endpointu
Ten dokument opisuje plan implementacji dla endpointu `DELETE /api/projects/{id}`. Endpoint ten jest odpowiedzialny za usunięcie projektu należącego do uwierzytelnionego użytkownika, wraz ze wszystkimi powiązanymi z nim zadaniami. Usunięcie projektu jest operacją nieodwracalną.

## 2. Szczegóły Żądania
-   **Metoda HTTP:** `DELETE`
-   **Struktura URL:** `/api/projects/{id}`
-   **Parametry:**
    -   **Wymagane:** `id` (parametr ścieżki) - unikalny identyfikator (UUID) projektu, który ma zostać usunięty.
-   **Ciało Żądania:** Brak.

## 3. Używane Typy
Implementacja nie wymaga tworzenia nowych typów DTO ani modeli komend. Będziemy korzystać z istniejących typów encji, takich jak `Project`.

## 4. Szczegóły Odpowiedzi
-   **Odpowiedź Sukcesu (204 No Content):** Zwracana, gdy projekt zostanie pomyślnie usunięty. Odpowiedź nie zawiera ciała.
-   **Odpowiedzi Błędów:**
    -   `400 Bad Request`: Zwracany, gdy `id` w URL nie jest poprawnym formatem UUID.
    -   `401 Unauthorized`: Zwracany, gdy użytkownik nie jest uwierzytelniony.
    -   `403 Forbidden`: Zwracany, gdy użytkownik próbuje usunąć projekt, którego nie jest właścicielem.
    -   `404 Not Found`: Zwracany, gdy projekt o podanym `id` nie istnieje.
    -   `500 Internal Server Error`: Zwracany w przypadku nieoczekiwanych błędów serwera.

## 5. Przepływ Danych
1.  Użytkownik wysyła żądanie `DELETE` na adres `/api/projects/{id}`.
2.  Middleware Astro weryfikuje sesję użytkownika. Jeśli sesja jest nieprawidłowa, zwraca `401 Unauthorized`.
3.  Handler endpointu w `src/pages/api/projects/[id].ts` odbiera żądanie.
4.  Identyfikator `id` z URL jest walidowany przy użyciu `zod` w celu sprawdzenia, czy jest to prawidłowy UUID.
5.  Handler wywołuje metodę `deleteProject(id, userId)` z serwisu `ProjectService` (`src/lib/services/project.service.ts`).
6.  Serwis `ProjectService` wykonuje zapytanie do bazy danych Supabase, aby usunąć projekt. Zapytanie `DELETE` będzie warunkowane przez `id` projektu oraz `user_id`, aby upewnić się, że tylko właściciel może usunąć swój projekt.
7.  Baza danych, dzięki ograniczeniu `ON DELETE CASCADE` na kluczu obcym `project_id` w tabeli `tasks`, automatycznie usuwa wszystkie zadania powiązane z usuwanym projektem.
8.  Na podstawie wyniku operacji z serwisu, handler zwraca odpowiedni kod statusu HTTP (`204`, `403`, `404` lub `500`).

## 6. Kwestie Bezpieczeństwa
-   **Autoryzacja:** Dostęp do endpointu jest ograniczony do uwierzytelnionych użytkowników. Logika biznesowa w serwisie `ProjectService` oraz polityki RLS (Row Level Security) w Supabase zapewnią, że użytkownik może usunąć tylko te projekty, których jest właścicielem.
-   **Walidacja Danych Wejściowych:** Parametr `id` będzie walidowany za pomocą `zod`, aby zapobiec atakom lub błędom wynikającym z nieprawidłowego formatu danych (np. SQL Injection, chociaż Supabase SDK w dużym stopniu przed tym chroni).

## 7. Obsługa Błędów
-   **Brak uwierzytelnienia (401):** Obsługiwane przez middleware Astro.
-   **Nieprawidłowe ID (400):** Walidacja `zod` w handlerze zwróci błąd.
-   **Projekt nie znaleziony (404):** Serwis `ProjectService` sprawdzi, czy usunięcie powiodło się (np. sprawdzając liczbę usuniętych wierszy). Jeśli żaden wiersz nie został usunięty, zwróci informację, na podstawie której handler odpowie `404`.
-   **Brak uprawnień (403):** Warunek `user_id` w zapytaniu `DELETE` zapobiegnie usunięciu projektu przez nieuprawnionego użytkownika. Jeśli operacja się nie powiedzie z tego powodu, handler zwróci `403`.
-   **Błąd serwera (500):** Wszelkie nieoczekiwane błędy (np. błąd połączenia z bazą danych) zostaną przechwycone w bloku `try...catch`, zalogowane, a handler zwróci `500`.

## 8. Wydajność
-   Operacja usuwania jest pojedynczym zapytaniem do bazy danych.
-   Dzięki kaskadowemu usuwaniu zadań, operacja jest atomowa z perspektywy bazy danych.
-   W przypadku projektów z bardzo dużą liczbą zadań, operacja może trwać dłużej. Na obecnym etapie nie przewiduje się jednak, aby stanowiło to problem. Indeks na kolumnie `project_id` w tabeli `tasks` zapewni wysoką wydajność kaskadowego usuwania.

## 9. Kroki Implementacyjne
1.  **Aktualizacja serwisu `ProjectService`:**
    -   W pliku `src/lib/services/project.service.ts` dodać nową metodę asynchroniczną `deleteProject(id: string, userId: string)`.
    -   Wewnątrz metody zaimplementować logikę usuwania projektu z bazy Supabase, używając `supabase.from('projects').delete().match({ id, user_id: userId })`.
    -   Metoda powinna zwracać informację o powodzeniu lub typie błędu (np. `not_found`).

2.  **Implementacja handlera `DELETE`:**
    -   W pliku `src/pages/api/projects/[id].ts` dodać eksportowaną funkcję `DELETE`.
    -   Pobrać `id` z `Astro.params` oraz `user` z `Astro.locals.session`.
    -   Zwalidować `id` przy użyciu `zod.string().uuid()`.
    -   Wywołać metodę `projectService.deleteProject()` z odpowiednimi parametrami.
    -   Na podstawie wyniku zwrócić odpowiednią odpowiedź HTTP (`Response` z kodem `204`, `400`, `403`, `404` lub `500`).
    -   Dodać obsługę błędów w bloku `try...catch`.
