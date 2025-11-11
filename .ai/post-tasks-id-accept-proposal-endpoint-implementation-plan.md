
# API Endpoint Implementation Plan: POST /tasks/{id}/accept-proposal

## 1. Endpoint Overview
Ten endpoint pozwala deweloperowi (użytkownikowi) na zaakceptowanie propozycji zmiany statusu zadania, która została zgłoszona przez asystenta AI. Po pomyślnym wykonaniu, status zadania jest finalnie zmieniany na na "Done" lub "Canceled".

## 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/tasks/{id}/accept-proposal`
- **Parameters**:
  - **Required**:
    - `id` (w ścieżce URL): `uuid` identyfikujący zadanie, którego propozycja dotyczy.
- **Request Body**: Brak (puste ciało).

## 3. Used Types
- `Task`: Pełny typ encji zadania z `src/types.ts`.
- `TaskStatus`: Typ encji statusu zadania z `src/types.ts`.
- `z.object({ id: z.string().uuid() })`: Schemat Zod do walidacji parametru `id` z URL.

## 4. Response Details
- **Success (200 OK)**: Zwraca pełny, zaktualizowany obiekt zadania (`Task`).
  ```json
  {
    "id": "uuid",
    "project_id": "uuid",
    "parent_id": "uuid | null",
    "status_id": 2, // Nowy, finalny status
    "title": "string",
    "description": "string | null",
    "position": "integer",
    "is_delegated": "boolean",
    "created_by_ai": "boolean",
    "created_at": "timestamptz",
    "updated_at": "timestamptz"
  }
  ```
- **Error**:
  - `400 Bad Request`: Jeśli `id` zadania ma nieprawidłowy format.
  - `401 Unauthorized`: Jeśli użytkownik nie jest zalogowany.
  - `403 Forbidden`: Jeśli użytkownik nie jest właścicielem projektu, do którego należy zadanie.
  - `404 Not Found`: Jeśli zadanie o podanym `id` nie istnieje.
  - `409 Conflict`: Jeśli zadanie nie ma statusu oczekującego na akceptację (np. "Done, pending acceptance").

## 5. Data Flow
1.  Endpoint odbiera żądanie `POST` z `id` zadania w URL.
2.  Następuje walidacja formatu `id` przy użyciu `zod`. Jeśli jest nieprawidłowy, zwracany jest błąd `400`.
3.  Pobierana jest sesja użytkownika z `context.locals.supabase` w celu weryfikacji tożsamości. Jeśli sesja nie istnieje, zwracany jest błąd `401`.
4.  Wywoływana jest funkcja serwisowa, np. `acceptStatusProposal(taskId, userId)`, z `task.service.ts`.
5.  Wewnątrz serwisu:
    a. Pobierane jest zadanie z bazy danych wraz z informacjami o projekcie, do którego należy.
    b. Sprawdzane jest, czy zadanie istnieje. Jeśli nie, zwracany jest błąd `404`.
    c. Weryfikowane jest, czy zalogowany użytkownik jest właścicielem projektu. Jeśli nie, zwracany jest błąd `403`.
    d. Sprawdzany jest aktualny `status_id` zadania. Musi on odpowiadać statusowi oczekującemu na akceptację (np. `4` dla "Done, pending acceptance" lub `5` dla "Canceled, pending confirmation"). Jeśli status jest inny, zwracany jest błąd `409`.
    e. Status zadania jest aktualizowany na finalny (np. z `4` na `2` - "Done").
    f. Zaktualizowane zadanie jest zapisywane w bazie danych.
6.  Serwis zwraca zaktualizowany obiekt zadania do endpointu.
7.  Endpoint zwraca klientowi odpowiedź `200 OK` wraz ze zaktualizowanym zadaniem.

## 6. Security Considerations
- **Authentication**: Endpoint musi być chroniony i dostępny tylko dla zalogowanych użytkowników. Middleware Astro (`src/middleware/index.ts`) powinno weryfikować sesję Supabase.
- **Authorization**: Logika biznesowa w serwisie musi rygorystycznie sprawdzać, czy zalogowany użytkownik jest właścicielem projektu, do którego należy zadanie. Należy wykorzystać `user_id` z sesji do filtrowania zapytań do bazy danych.
- **Input Validation**: Parametr `id` musi być walidowany jako UUID, aby zapobiec błędom zapytań i potencjalnym atakom.

## 7. Performance Considerations
- Operacja jest stosunkowo prosta i nie powinna stanowić problemu wydajnościowego.
- Należy upewnić się, że kolumny używane w klauzulach `WHERE` (`id`, `project_id`, `user_id`) są odpowiednio zindeksowane w bazie danych, co jest standardem dla kluczy głównych i obcych.

## 8. Implementation Steps
1.  **Create Endpoint File**: Utwórz plik `src/pages/api/tasks/[id]/accept-proposal.ts`.
2.  **Define Zod Schema**: W pliku endpointu zdefiniuj schemat `zod` do walidacji `id` z `Astro.params`.
3.  **Implement Endpoint Logic**:
    - Zaimplementuj handler `POST`.
    - Pobierz `id` z `Astro.params` i zwaliduj go.
    - Pobierz klienta Supabase i sesję użytkownika z `context.locals`.
    - Zabezpiecz endpoint przed niezalogowanymi użytkownikami.
    - Wywołaj nową funkcję serwisową, przekazując `id` zadania i `id` użytkownika.
    - Obsłuż potencjalne błędy zwrócone z serwisu i mapuj je na odpowiednie kody statusu HTTP.
    - W przypadku sukcesu, zwróć odpowiedź `200 OK` z danymi zadania.
4.  **Create Service Function**: W pliku `src/lib/services/task.service.ts` dodaj nową funkcję asynchroniczną `acceptStatusProposal(taskId: string, userId: string)`.
5.  **Implement Service Logic**:
    - Wewnątrz `acceptStatusProposal`, pobierz zadanie z bazy danych, dołączając dane projektu (`projects(user_id)`).
    - Sprawdź, czy zadanie istnieje.
    - Sprawdź, czy `project.user_id` jest zgodne z `userId`.
    - Sprawdź, czy `status_id` zadania to `4` lub `5`.
    - Określ nowy, finalny status (np. jeśli `4`, to nowy status to `2`).
    - Zaktualizuj `status_id` zadania w bazie danych.
    - Zwróć zaktualizowane zadanie lub rzuć odpowiedni błąd (np. `TaskNotFoundError`, `AuthorizationError`, `InvalidStateError`).
6.  **Error Handling**: Zdefiniuj dedykowane klasy błędów (np. w `src/lib/errors.ts`), aby ułatwić mapowanie na kody HTTP w warstwie API.
