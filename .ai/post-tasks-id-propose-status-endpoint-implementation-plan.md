
# Plan Implementacji Endpointu API: POST /tasks/{id}/propose-status

## 1. Przegląd Endpointu
Ten endpoint jest przeznaczony wyłącznie dla asystentów AI. Umożliwia AI zaproponowanie zmiany statusu dla zadania, które zostało mu delegowane. Propozycja ta ustawia zadanie w stanie oczekującym na akceptację przez dewelopera i dodaje komentarz z uzasadnieniem zmiany.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/tasks/{id}/propose-status`
- **Parametry:**
  - **Wymagane:**
    - `id` (w ścieżce URL): `uuid` identyfikujący zadanie, którego dotyczy propozycja.
- **Ciało Żądania (Request Body):**
  ```json
  {
    "new_status_id": "smallint",
    "comment": "string"
  }
  ```
  - `new_status_id`: ID nowego statusu, który jest proponowany (np. "Done" lub "Canceled").
  - `comment`: Tekstowy komentarz wyjaśniający powód propozycji zmiany statusu.

## 3. Używane Typy
- **Command Model:** `TaskProposeStatusCommand`
  ```typescript
  export type TaskProposeStatusCommand = {
    new_status_id: Task['status_id'];
    comment: TaskComment['comment'];
  };
  ```
- **DTO (odpowiedź):** `TaskGetDto` (pełny obiekt zadania)
  ```typescript
  export type TaskGetDto = Task;
  ```

## 4. Szczegóły Odpowiedzi
- **Odpowiedź Sukcesu (200 OK):** Zwraca pełny, zaktualizowany obiekt zadania z nowym, oczekującym statusem.
  ```json
  {
    "id": "uuid",
    "project_id": "uuid",
    "parent_id": "uuid | null",
    "status_id": "smallint", // ID statusu "pending acceptance"
    "title": "string",
    "description": "string | null",
    "position": "integer",
    "is_delegated": true,
    "created_by_ai": "boolean",
    "created_at": "timestamptz",
    "updated_at": "timestamptz"
  }
  ```
- **Odpowiedzi Błędów:**
  - `400 Bad Request`: Nieprawidłowe dane wejściowe (np. pusty komentarz, nieprawidłowe `new_status_id`).
  - `401 Unauthorized`: Brak lub nieprawidłowy klucz API (`X-API-Key`).
  - `403 Forbidden`: Zadanie nie jest delegowane do AI lub próba zmiany statusu na nieprawidłowy.
  - `404 Not Found`: Zadanie o podanym `id` nie zostało znalezione.
  - `500 Internal Server Error`: Błędy po stronie serwera (np. błąd bazy danych).

## 5. Przepływ Danych
1.  Żądanie `POST` trafia do endpointu `/api/tasks/{id}/propose-status`.
2.  Middleware (`src/middleware/index.ts`) przechwytuje żądanie, weryfikuje nagłówek `X-API-Key` i dołącza `projectId` do `Astro.locals`. Jeśli klucz jest nieprawidłowy, zwraca `401 Unauthorized`.
3.  Handler endpointu w `src/pages/api/tasks/[id]/propose-status.ts` jest wywoływany.
4.  Handler waliduje ciało żądania przy użyciu schemy Zod, sprawdzając obecność i typy `new_status_id` oraz `comment`. W razie błędu zwraca `400 Bad Request`.
5.  Handler wywołuje metodę `proposeTaskStatus(taskId, command, projectId)` z serwisu `task.service.ts`.
6.  Serwis `task.service.ts` wykonuje następujące operacje w ramach jednej transakcji:
    a.  Pobiera zadanie o podanym `taskId` i sprawdza, czy należy do `projectId` oraz czy ma ustawioną flagę `is_delegated=true`. Jeśli nie, zwraca `403 Forbidden` lub `404 Not Found`.
    b.  Sprawdza, czy proponowany `new_status_id` jest dozwolony (np. "Done" lub "Canceled").
    c.  Mapuje `new_status_id` na odpowiedni status oczekujący (np. "Done" -> "Done, pending acceptance").
    d.  Aktualizuje pole `status_id` w tabeli `tasks`.
    e.  Tworzy nowy wpis w tabeli `task_comments`, zapisując `comment`, `author_is_ai=true` oraz poprzedni i nowy status zadania.
7.  Jeśli transakcja się powiedzie, serwis zwraca zaktualizowany obiekt zadania.
8.  Handler endpointu zwraca otrzymany obiekt zadania z kodem `200 OK`.

## 6. Kwestie Bezpieczeństwa
- **Autentykacja:** Endpoint musi być chroniony i dostępny wyłącznie po uwierzytelnieniu za pomocą klucza API (`X-API-Key`). Middleware jest odpowiedzialny za weryfikację klucza.
- **Autoryzacja:** Logika w serwisie musi rygorystycznie sprawdzać, czy zadanie, którego dotyczy propozycja:
    1.  Należy do projektu powiązanego z klucem API (`projectId`).
    2.  Jest delegowane do AI (`is_delegated = true`).
    Zapobiega to modyfikacji zadań, do których AI nie ma uprawnień.
- **Walidacja Danych:** Wszystkie dane wejściowe (`id` z URL, `new_status_id` i `comment` z ciała żądania) muszą być walidowane, aby zapobiec atakom typu SQL Injection i zapewnić spójność danych.

## 7. Kwestie Wydajności
- Operacje na bazie danych (pobranie zadania, aktualizacja statusu, wstawienie komentarza) powinny być wykonane w ramach jednej transakcji, aby zapewnić atomowość i spójność danych.
- Należy upewnić się, że kolumny `id` w tabeli `tasks` oraz `project_id` są odpowiednio zindeksowane.

## 8. Kroki Implementacji
1.  **Schema Walidacji:** W pliku `src/lib/schemas/task.schemas.ts` zdefiniuj schemę Zod dla `TaskProposeStatusCommand`.
2.  **Serwis:** W pliku `src/lib/services/task.service.ts` dodaj nową metodę `proposeTaskStatus`.
    - Metoda powinna przyjmować `taskId: string`, `command: TaskProposeStatusCommand` i `projectId: string`.
    - Zaimplementuj logikę opisaną w sekcji "Przepływ Danych", używając transakcji Supabase (`supabase.rpc('propose_task_status', ...)` lub wykonując kolejne zapytania wewnątrz transakcji).
    - Zadbaj o odpowiednią obsługę błędów i zwracanie `ServiceResponse`.
3.  **Endpoint API:** Utwórz nowy plik `src/pages/api/tasks/[id]/propose-status.ts`.
    - Zaimplementuj handler dla metody `POST`.
    - Pobierz `id` zadania z `Astro.params`.
    - Pobierz `projectId` z `Astro.locals.user.projectId`.
    - Przeprowadź walidację ciała żądania za pomocą przygotowanej schemy Zod.
    - Wywołaj metodę `taskService.proposeTaskStatus`.
    - Zwróć odpowiednią odpowiedź HTTP w zależności od wyniku operacji serwisu.
4.  **Typy:** Upewnij się, że typ `TaskProposeStatusCommand` jest poprawnie zdefiniowany w `src/types.ts`.
