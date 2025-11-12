
# Plan Implementacji Endpointu API: GET /task-statuses

## 1. Przegląd Endpointu
Ten endpoint służy do pobierania pełnej listy wszystkich możliwych statusów zadań zdefiniowanych w systemie. Jest to endpoint typu "read-only", przeznaczony do użytku przez uwierzytelnionych użytkowników oraz asystentów AI, aby mogli oni poprawnie interpretować i wyświetlać statusy zadań.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/task-statuses`
- **Parametry:**
  - **Wymagane:** Brak
  - **Opcjonalne:** Brak
- **Ciało Żądania (Request Body):** Brak

## 3. Używane Typy
- **`TaskStatusGetDto`**: Reprezentuje pojedynczy status zadania. Jest to alias do typu `TaskStatus`, który jest bezpośrednim odzwierciedleniem tabeli `task_statuses` w bazie danych.
  ```typescript
  // src/types.ts
  export type TaskStatusGetDto = {
    id: number;
    name: string;
  };
  ```

## 4. Szczegóły Odpowiedzi
- **Odpowiedź Sukcesu (200 OK):** Zwraca tablicę obiektów `TaskStatusGetDto`, posortowaną rosnąco według `id`.
  ```json
  [
    {
      "id": 1,
      "name": "To Do"
    },
    {
      "id": 2,
      "name": "Done"
    },
    {
      "id": 3,
      "name": "Canceled"
    },
    {
      "id": 4,
      "name": "Done, pending acceptance"
    },
    {
      "id": 5,
      "name": "Canceled, pending confirmation"
    }
  ]
  ```
- **Odpowiedzi Błędów:**
  - `401 Unauthorized`: Występuje, gdy żądanie nie zawiera prawidłowego tokenu sesji użytkownika lub klucza API. Obsługa tego błędu leży po stronie middleware.
  - `500 Internal Server Error`: Występuje w przypadku problemów z bazą danych lub innych nieoczekiwanych błędów serwera.

## 5. Przepływ Danych
1.  Żądanie `GET` trafia do endpointu `/api/task-statuses`.
2.  Middleware (`src/middleware/index.ts`) weryfikuje, czy żądanie pochodzi od uwierzytelnionego podmiotu (użytkownika lub AI). Jeśli nie, zwraca błąd `401 Unauthorized`.
3.  Handler endpointu w `src/pages/api/task-statuses/index.ts` jest wykonywany.
4.  Handler używa klienta Supabase (`context.locals.supabase`) do wykonania zapytania do tabeli `task_statuses`.
5.  Zapytanie pobiera wszystkie wiersze z kolumnami `id` i `name`.
6.  Wyniki są sortowane po `id` w porządku rosnącym.
7.  Handler serializuje wyniki do formatu JSON i zwraca je w odpowiedzi z kodem statusu `200 OK`.

## 6. Kwestie Bezpieczeństwa
- **Uwierzytelnianie:** Dostęp do endpointu jest chroniony przez middleware, który wymaga, aby każde żądanie było uwierzytelnione (za pomocą sesji JWT dla użytkowników lub nagłówka `X-API-Key` dla AI).
- **Autoryzacja:** Endpoint nie wymaga dodatkowej logiki autoryzacji, ponieważ lista statusów jest publiczna dla wszystkich uwierzytelnionych podmiotów.
- **Walidacja Danych:** Endpoint nie przyjmuje żadnych danych wejściowych, więc walidacja nie jest konieczna.
- **Ochrona przed SQL Injection:** Użycie klienta Supabase do konstruowania zapytań zapewnia ochronę przed atakami typu SQL Injection.

## 7. Kwestie Wydajności
- Tabela `task_statuses` jest mała i rzadko się zmienia, więc zapytanie będzie bardzo szybkie.
- Nie przewiduje się żadnych wąskich gardeł wydajnościowych.
- Czas odpowiedzi powinien być minimalny.

## 8. Kroki Implementacyjne
1.  **Utworzenie pliku endpointu:**
    -   Stwórz nowy plik: `src/pages/api/task-statuses/index.ts`.

2.  **Implementacja handlera `GET`:**
    -   W pliku `index.ts` zaimportuj niezbędne typy, w tym `APIRoute` z Astro i `TaskStatusGetDto` z `src/types.ts`.
    -   Dodaj `export const prerender = false;` aby zapewnić dynamiczne renderowanie endpointu.
    -   Zaimplementuj funkcję `GET` typu `APIRoute`.
    -   Wewnątrz funkcji, użyj bloku `try...catch` do obsługi błędów.
    -   W bloku `try`, uzyskaj dostęp do klienta Supabase poprzez `context.locals.supabase`.
    -   Wykonaj zapytanie do bazy danych: `supabase.from('task_statuses').select('id, name').order('id', { ascending: true })`.
    -   Sprawdź, czy wystąpił błąd podczas zapytania. Jeśli tak, zaloguj go i rzuć wyjątek, który zostanie przechwycony przez blok `catch`.
    -   Jeśli zapytanie się powiedzie, zwróć dane jako odpowiedź JSON z kodem statusu `200`.
    -   W bloku `catch`, zaloguj błąd na konsoli i zwróć odpowiedź JSON z komunikatem o błędzie serwera i kodem statusu `500`.

    **Przykładowy kod (`src/pages/api/task-statuses/index.ts`):**
    ```typescript
    import type { APIRoute } from 'astro';
    import type { TaskStatusGetDto } from '@/types';

    export const prerender = false;

    export const GET: APIRoute = async ({ locals }) => {
      const { supabase } = locals;

      try {
        const { data, error } = await supabase
          .from('task_statuses')
          .select('id, name')
          .order('id', { ascending: true });

        if (error) {
          console.error('Error fetching task statuses:', error);
          throw new Error('Failed to fetch task statuses from the database.');
        }

        const taskStatuses: TaskStatusGetDto[] = data;

        return new Response(JSON.stringify(taskStatuses), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.error('Server error while fetching task statuses:', err);
        return new Response(
          JSON.stringify({ message: 'An internal server error occurred.' }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    };
    ```
