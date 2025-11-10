
# Plan Implementacji Endpointu API: POST /tasks

## 1. Przegląd Endpointu
Ten endpoint służy do tworzenia nowych zadań lub podzadań w ramach projektu. Jest dostępny zarówno dla uwierzytelnionych użytkowników (poprzez sesję), jak i dla asystentów AI (poprzez klucz API). Logika biznesowa zapewnia, że zadania są tworzone we właściwym kontekście i z odpowiednimi uprawnieniami.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/tasks`
- **Parametry:** Brak parametrów w URL.
- **Ciało Żądania (Request Body):**
  ```json
  {
    "project_id": "uuid", // Wymagane dla użytkownika, niejawne dla AI
    "parent_id": "uuid | null",
    "title": "string",
    "description": "string | null"
  }
  ```

## 3. Używane Typy
- **Model Komendy (Command Model):** `TaskCreateCommand` z `src/types.ts`
  ```typescript
  export type TaskCreateCommand = Pick<Task, 'parent_id' | 'title' | 'description'> &
    Partial<Pick<Task, 'project_id'>>;
  ```
- **Schemat Walidacji (Zod):**
  ```typescript
  import { z } from 'zod';

  export const TaskCreateSchema = z.object({
    title: z.string().min(1, { message: "Tytuł jest wymagany." }),
    description: z.string().nullable().optional(),
    parent_id: z.string().uuid().nullable().optional(),
    project_id: z.string().uuid().optional(), // Wymagane dla użytkownika, opcjonalne dla AI
  });
  ```

## 4. Szczegóły Odpowiedzi
- **Odpowiedź Sukcesu (201 Created):** Zwraca pełny obiekt nowo utworzonego zadania, zgodny z typem `Task` z `src/types.ts`.
  ```json
  {
    "id": "uuid",
    "project_id": "uuid",
    "parent_id": "uuid | null",
    "status_id": 1, // Domyślnie 'To Do'
    "title": "string",
    "description": "string | null",
    "position": "integer", // Obliczone na podstawie istniejących zadań
    "is_delegated": false,
    "created_by_ai": "boolean",
    "created_at": "timestamptz",
    "updated_at": "timestamptz"
  }
  ```
- **Odpowiedzi Błędów:**
  - `400 Bad Request`: Nieprawidłowe dane wejściowe (np. brak `title`).
  - `401 Unauthorized`: Brak lub nieprawidłowy token sesji lub klucz API.
  - `403 Forbidden`: Próba utworzenia zadania w projekcie bez uprawnień lub naruszenie reguł przez AI.
  - `404 Not Found`: Podany `project_id` lub `parent_id` nie istnieje.
  - `500 Internal Server Error`: Błąd serwera.

## 5. Przepływ Danych
1.  Middleware (`src/middleware/index.ts`) weryfikuje dane uwierzytelniające (sesja lub klucz API) i umieszcza `userId` lub `projectId` w `context.locals`.
2.  Handler endpointu (`src/pages/api/tasks/index.ts`) parsuje i waliduje ciało żądania przy użyciu schemy Zod (`TaskCreateSchema`).
3.  W przypadku błędu walidacji, zwracany jest błąd `400`.
4.  Handler wywołuje funkcję `createTask` z nowego serwisu `src/lib/services/task.service.ts`, przekazując zwalidowane dane oraz informacje o uwierzytelnianiu z `context.locals`.
5.  Serwis `task.service.ts`:
    -   Określa `projectId` (bezpośrednio z `project_id` dla użytkownika, lub z `locals` dla AI).
    -   Sprawdza, czy uwierzytelniony podmiot ma uprawnienia do projektu.
    -   Jeśli `parent_id` jest podane, weryfikuje jego istnienie i uprawnienia. W przypadku AI, sprawdza, czy zadanie nadrzędne ma `is_delegated = true` i czy głębokość zagnieżdżenia nie przekracza 1.
    -   Oblicza nową pozycję (`position`) dla zadania.
    -   Ustawia wartości domyślne: `status_id` na `1` ('To Do'), `created_by_ai` na `true` lub `false`.
    -   Wstawia nowy rekord do tabeli `tasks` w bazie danych za pomocą klienta Supabase.
6.  Handler endpointu otrzymuje wynik z serwisu i zwraca odpowiedź `201 Created` z danymi nowego zadania lub odpowiedni kod błędu.

## 6. Kwestie Bezpieczeństwa
- **Autoryzacja:** Dostęp jest weryfikowany na dwóch poziomach: przez middleware oraz przez polityki RLS w Supabase. Użytkownik może tworzyć zadania tylko w swoich projektach.
- **Zakres AI:** Klucz API ogranicza AI do działania tylko w obrębie jednego projektu. Logika w serwisie `task.service.ts` musi rygorystycznie egzekwować regułę, że AI może tworzyć podzadania tylko pod zadaniami delegowanymi (`is_delegated = true`) i na dozwolonej głębokości.
- **Walidacja Danych:** Użycie Zod do walidacji danych wejściowych chroni przed podstawowymi atakami typu injection i zapewnia integralność danych.
- **Zapobieganie SQL Injection:** Użycie metod z biblioteki `@supabase/supabase-js` zapewnia parametryzację zapytań do bazy danych.

## 7. Kwestie Wydajności
- Operacja tworzenia zadania jest operacją o niskim koszcie.
- Weryfikacja `parent_id` i obliczanie `position` wymagają dodatkowych zapytań do bazy danych, ale są one indeksowane i szybkie.
- Należy zapewnić, że kolumny `project_id` i `parent_id` w tabeli `tasks` są poprawnie zindeksowane.

## 8. Kroki Implementacyjne
1.  **Utworzenie pliku serwisu:** Stworzyć nowy plik `src/lib/services/task.service.ts`.
2.  **Implementacja `createTask` w serwisie:**
    -   Zdefiniować funkcję `createTask(command: TaskCreateCommand, auth: { userId?: string, projectId?: string })`.
    -   Dodać logikę weryfikacji uprawnień do projektu.
    -   Dodać logikę walidacji `parent_id` (w tym reguły dla AI).
    -   Dodać logikę obliczania `position` dla nowego zadania.
    -   Zaimplementować wstawianie rekordu do bazy danych przy użyciu `supabase.from('tasks').insert(...)`.
3.  **Utworzenie schemy walidacji:** W nowym pliku `src/lib/schemas/task.schemas.ts` (lub podobnym) zdefiniować `TaskCreateSchema` przy użyciu Zod.
4.  **Implementacja endpointu:** W pliku `src/pages/api/tasks/index.ts`:
    -   Dodać `export const prerender = false;`.
    -   Zaimplementować handler `POST`.
    -   Dodać obsługę `try...catch` do przechwytywania błędów.
    -    sparsować ciało żądania `await request.json()`.
    -   Zwalidować dane wejściowe za pomocą `TaskCreateSchema.safeParse()`.
    -   Wywołać serwis `taskService.createTask(...)`.
    -   Zwrócić odpowiedź `Astro.json(...)` z odpowiednim statusem i danymi.
5.  **Aktualizacja middleware (jeśli konieczne):** Upewnić się, że middleware poprawnie identyfikuje `projectId` na podstawie `X-API-Key` i przekazuje je w `context.locals`.
