# Plan Implementacji Endpointu API: POST /tasks/reorder

## 1. Przegląd Endpointu
Celem tego endpointu jest umożliwienie zmiany kolejności zadań w ramach jednego projektu. Endpoint przyjmie listę zadań wraz z ich nową pozycją (kolejnością) i zaktualizuje odpowiednie rekordy w bazie danych. Operacja powinna być wykonana w całości (jako transakcja), aby zapewnić spójność danych.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/tasks/reorder`
- **Parametry:** Brak parametrów w URL.
- **Ciało Żądania (Request Body):**
  ```json
  {
    "tasks": [
      { "id": "uuid-dla-zadania-1", "order": 1 },
      { "id": "uuid-dla-zadania-2", "order": 2 },
      { "id": "uuid-dla-zadania-3", "order": 3 }
    ]
  }
  ```
  Ciało żądania musi zawierać tablicę `tasks`, gdzie każdy obiekt posiada `id` zadania (UUID) oraz `order` (liczbę całkowitą).

## 3. Używane Typy
Do walidacji i przetwarzania danych wejściowych zostaną zdefiniowane następujące typy i schematy:

- **Schemat Walidacji (Zod):**
  ```typescript
  // src/lib/schemas/task.schemas.ts
  import { z } from 'zod';

  export const ReorderTaskSchema = z.object({
    id: z.string().uuid(),
    order: z.number().int().min(0),
  });

  export const ReorderTasksDtoSchema = z.object({
    tasks: z.array(ReorderTaskSchema).min(1),
  });
  ```

- **Typ DTO (Data Transfer Object):**
  ```typescript
  // src/types.ts
  import { z } from 'zod';
  import { ReorderTasksDtoSchema } from './lib/schemas/task.schemas.ts';

  export type ReorderTasksDto = z.infer<typeof ReorderTasksDtoSchema>;
  ```

## 4. Szczegóły Odpowiedzi
- **Sukces (200 OK):**
  - Zwraca pustą odpowiedź z kodem statusu 200, informując o pomyślnej aktualizacji kolejności zadań.
- **Błędy:**
  - **400 Bad Request:** Nieprawidłowe ciało żądania (np. brakujące pola, zły format danych).
  - **401 Unauthorized:** Użytkownik nie jest zalogowany.
  - **403 Forbidden:** Użytkownik nie ma uprawnień do modyfikacji zadań w danym projekcie.
  - **404 Not Found:** Co najmniej jedno z zadań o podanym `id` nie istnieje.
  - **500 Internal Server Error:** Wystąpił błąd serwera, np. podczas operacji na bazie danych.

## 5. Przepływ Danych
1.  Klient wysyła żądanie `POST` na `/api/tasks/reorder` z listą zadań do przeorganizowania.
2.  Middleware Astro weryfikuje token JWT i dołącza obiekt `user` do `context.locals`.
3.  Handler endpointu (`src/pages/api/tasks/reorder.ts`) parsuje i waliduje ciało żądania przy użyciu `ReorderTasksDtoSchema`.
4.  Handler wywołuje metodę `reorderTasks` z serwisu `TaskService`, przekazując zweryfikowane dane oraz ID zalogowanego użytkownika.
5.  `TaskService` weryfikuje, czy wszystkie zadania z listy należą do tego samego projektu i czy użytkownik jest właścicielem tego projektu.
6.  Serwis wykonuje transakcję w bazie danych (Supabase), aby zaktualizować pole `order` dla każdego zadania. Użycie transakcji gwarantuje, że operacja powiedzie się w całości lub zostanie całkowicie wycofana w przypadku błędu.
7.  Handler zwraca odpowiedni kod statusu HTTP w zależności od wyniku operacji.

## 6. Względy Bezpieczeństwa
- **Uwierzytelnianie:** Endpoint musi być chroniony. Dostęp do niego mają tylko zalogowani użytkownicy. Middleware jest odpowiedzialne za weryfikację tokenu JWT.
- **Autoryzacja:** Przed wykonaniem operacji serwis musi sprawdzić, czy zalogowany użytkownik jest właścicielem projektu, do którego należą zadania. Zapobiega to nieautoryzowanej modyfikacji danych przez innych użytkowników.
- **Walidacja Danych:** Wszystkie dane wejściowe muszą być rygorystycznie walidowane za pomocą schematu Zod, aby chronić system przed atakami typu injection i niepoprawnymi danymi.

## 7. Obsługa Błędów
- **Błąd walidacji:** Jeśli dane wejściowe nie przejdą walidacji, handler zwróci odpowiedź `400 Bad Request` z komunikatem o błędzie z Zod.
- **Brak autoryzacji:** Jeśli użytkownik nie jest zalogowany, middleware zwróci `401 Unauthorized`.
- **Brak uprawnień:** Jeśli użytkownik próbuje modyfikować zadania, do których nie ma uprawnień, serwis zwróci błąd, a handler odpowie `403 Forbidden`.
- **Zadanie nie znalezione:** Jeśli którekolwiek z zadań nie zostanie znalezione w bazie danych, operacja zostanie przerwana, a handler zwróci `404 Not Found`.
- **Błąd bazy danych:** W przypadku problemów z wykonaniem transakcji, błąd zostanie zalogowany, a handler zwróci `500 Internal Server Error`.

## 8. Wydajność
- Operacja aktualizacji wielu wierszy może być kosztowna. Aby zoptymalizować wydajność, wszystkie aktualizacje powinny być wykonane w ramach jednej transakcji w bazie danych.
- Należy unikać wielokrotnych zapytań do bazy w pętli (N+1 problem). Zamiast tego, można pobrać wszystkie zadania jednym zapytaniem, zweryfikować uprawnienia w pamięci, a następnie wykonać operację `update`.

## 9. Kroki Implementacji
1.  **Aktualizacja typów:**
    -   Dodaj `ReorderTasksDto` do pliku `src/types.ts`.
2.  **Utworzenie schematu walidacji:**
    -   W pliku `src/lib/schemas/task.schemas.ts` dodaj `ReorderTaskSchema` i `ReorderTasksDtoSchema`.
3.  **Implementacja logiki w serwisie:**
    -   W pliku `src/lib/services/task.service.ts` dodaj nową metodę `reorderTasks(userId: string, dto: ReorderTasksDto): Promise<void>`.
    -   Wewnątrz metody:
        -   Pobierz wszystkie zadania na podstawie `id` z `dto.tasks`.
        -   Sprawdź, czy wszystkie zadania istnieją i należą do tego samego projektu.
        -   Sprawdź, czy `userId` jest właścicielem tego projektu.
        -   Jeśli weryfikacja się powiedzie, wykonaj transakcję w Supabase, aby zaktualizować pole `order` dla każdego zadania.
4.  **Utworzenie endpointu:**
    -   Utwórz nowy plik `src/pages/api/tasks/reorder.ts`.
    -   W pliku zaimplementuj handler `POST`, który:
        -   Pobiera `user` z `context.locals`.
        -   Waliduje ciało żądania za pomocą `ReorderTasksDtoSchema`.
        -   Wywołuje `taskService.reorderTasks`.
        -   Obsługuje błędy i zwraca odpowiednie kody statusu.
