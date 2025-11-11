# Plan Implementacji Endpointu API: POST /tasks/{id}/reject-proposal

## 1. Przegląd Endpointu
Ten endpoint pozwala uwierzytelnionemu użytkownikowi na odrzucenie propozycji zmiany statusu zadania, która została zgłoszona przez AI. Odrzucenie propozycji cofa status zadania do stanu "Do zrobienia" (`To Do`) i zapisuje komentarz z powodem odrzucenia. Endpoint jest dostępny tylko dla użytkowników.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/tasks/{id}/reject-proposal`
- **Parametry:**
  - **Wymagane:**
    - `id` (w ścieżce URL): UUID zadania, którego propozycja dotyczy.
  - **Opcjonalne:** Brak.
- **Ciało Żądania (Request Body):**
  - **Typ:** `application/json`
  - **Struktura:**
    ```json
    {
      "comment": "string"
    }
    ```

## 3. Używane Typy
- **Model Polecenia (Command Model):** `TaskRejectProposalCommand` - definiuje strukturę ciała żądania.
  ```typescript
  // src/types.ts
  export type TaskRejectProposalCommand = Pick<TaskComment, 'comment'>;
  ```
- **DTO Odpowiedzi (Response DTO):** `TaskGetDto` (alias dla `Task`) - pełny obiekt zaktualizowanego zadania.
  ```typescript
  // src/types.ts
  export type TaskGetDto = Task;
  ```

## 4. Przepływ Danych
1.  Użytkownik wysyła żądanie `POST` na adres `/api/tasks/{id}/reject-proposal` z wymaganym `id` zadania w URL oraz `comment` w ciele żądania.
2.  Middleware Astro weryfikuje sesję użytkownika. Jeśli sesja jest nieprawidłowa, zwraca błąd `401 Unauthorized`.
3.  Handler endpointu w `src/pages/api/tasks/[id]/reject-proposal.ts` parsuje i waliduje `id` (musi być UUID) oraz ciało żądania (za pomocą Zod, `comment` nie może być pusty).
4.  Handler wywołuje metodę `taskService.rejectProposal(id, user.id, comment)`.
5.  Metoda `rejectProposal` w `TaskService` wykonuje następujące operacje w ramach jednej transakcji bazodanowej:
    a. Pobiera zadanie wraz z projektem, aby zweryfikować właściciela.
    b. Sprawdza, czy zadanie istnieje. Jeśli nie, rzuca `NotFoundError` (404).
    c. Weryfikuje, czy zalogowany użytkownik (`user.id`) jest właścicielem projektu (`project.user_id`). Jeśli nie, rzuca `ForbiddenError` (403).
    d. Sprawdza, czy status zadania to `Done, pending acceptance` (ID: 4) lub `Canceled, pending confirmation` (ID: 5). Jeśli nie, rzuca `ConflictError` (409), informując, że nie ma propozycji do odrzucenia.
    e. Aktualizuje status zadania (`status_id`) na `1` (`To Do`).
    f. Tworzy nowy wpis w tabeli `task_comments`, zapisując dostarczony komentarz, informację o autorze (`author_is_ai: false`) oraz poprzedni i nowy status zadania.
6.  Serwis zwraca zaktualizowany obiekt zadania do handlera.
7.  Handler serializuje obiekt zadania do formatu JSON i wysyła go w odpowiedzi z kodem statusu `200 OK`.

## 5. Kwestie Bezpieczeństwa
- **Uwierzytelnianie:** Dostęp do endpointu musi być chroniony. Middleware Astro musi sprawdzić, czy użytkownik jest zalogowany, zanim przekaże żądanie dalej.
- **Autoryzacja:** Logika biznesowa w serwisie musi bezwzględnie weryfikować, czy zadanie należy do projektu, którego właścicielem jest uwierzytelniony użytkownik. Zapobiega to modyfikacji zadań przez nieuprawnione osoby.
- **Walidacja Danych Wejściowych:** Parametr `id` musi być walidowany jako UUID, a `comment` jako niepusty string, aby zapobiec atakom typu SQL Injection lub XSS. Należy użyć biblioteki Zod do walidacji schematu.

## 6. Obsługa Błędów
Endpoint powinien obsługiwać następujące scenariusze błędów, zwracając odpowiednie kody statusu HTTP:
- **400 Bad Request:**
  - `id` w URL nie jest poprawnym UUID.
  - Ciało żądania jest niepoprawne (np. brak pola `comment` lub jest ono puste).
- **401 Unauthorized:**
  - Użytkownik nie jest uwierzytelniony (obsługiwane przez middleware).
- **403 Forbidden:**
  - Użytkownik próbuje odrzucić propozycję dla zadania, które nie należy do jego projektu.
- **404 Not Found:**
  - Zadanie o podanym `id` nie zostało znalezione w bazie danych.
- **409 Conflict:**
  - Zadanie nie ma aktywnej propozycji do odrzucenia (jego status nie jest "oczekujący na akceptację").
- **500 Internal Server Error:**
  - Wystąpił błąd serwera, np. niepowodzenie transakcji bazodanowej.

## 7. Kwestie Wydajności
- Operacje bazodanowe (odczyt, aktualizacja, wstawienie) powinny być wykonane w ramach jednej transakcji, aby zapewnić spójność danych i zminimalizować liczbę zapytań do bazy.
- Zapytanie pobierające zadanie powinno być zoptymalizowane i wykorzystywać indeksy na `id` zadania.

## 8. Kroki Implementacyjne
1.  **Utworzenie pliku endpointu:** Stwórz nowy plik `src/pages/api/tasks/[id]/reject-proposal.ts`.
2.  **Walidacja danych wejściowych:**
    - W pliku `reject-proposal.ts`, zaimplementuj walidację parametru `id` z `Astro.params`.
    - Zdefiniuj schemat Zod dla `TaskRejectProposalCommand` w `src/lib/schemas/task.schemas.ts`.
    - Użyj schematu Zod do walidacji ciała żądania.
3.  **Implementacja logiki w serwisie:**
    - W pliku `src/lib/services/task.service.ts`, dodaj nową metodę asynchroniczną `rejectProposal(taskId: string, userId: string, comment: string): Promise<Task>`.
    - Zaimplementuj wewnątrz metody logikę opisaną w sekcji "Przepływ Danych", używając `supabase.rpc('reject_task_proposal', ...)` jeśli istnieje odpowiednia procedura RPC, lub wykonując operacje krok po kroku w transakcji.
4.  **Integracja endpointu z serwisem:**
    - W pliku `reject-proposal.ts`, wywołaj metodę `taskService.rejectProposal` z poprawnymi parametrami.
    - Zaimplementuj obsługę błędów (try-catch) i zwracaj odpowiednie odpowiedzi HTTP na podstawie typów błędów rzucanych przez serwis.
