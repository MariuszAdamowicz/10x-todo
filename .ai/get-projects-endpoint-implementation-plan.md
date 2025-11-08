# API Endpoint Implementation Plan: GET /projects

## 1. Przegląd punktu końcowego
Celem tego punktu końcowego jest dostarczenie listy wszystkich projektów skojarzonych z uwierzytelnionym użytkownikiem. Zwraca on podstawowe informacje o każdym projekcie, takie jak ID, nazwa, opis i data utworzenia, z wyłączeniem wrażliwych danych, jak klucz API.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/projects`
- **Parametry**:
  - **Wymagane**: Brak.
  - **Opcjonalne**: Brak.
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **`ProjectGetDto[]`**: Zgodnie z definicją w `src/types.ts`, odpowiedź będzie tablicą obiektów typu `ProjectGetDto`.
  ```typescript
  // from src/types.ts
  export type ProjectGetDto = Pick<Project, 'id' | 'name' | 'description' | 'created_at'>;
  ```

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (200 OK)**: Zwraca tablicę obiektów `ProjectGetDto`. Tablica może być pusta, jeśli użytkownik nie ma żadnych projektów.
  ```json
  [
    {
      "id": "uuid",
      "name": "string",
      "description": "string | null",
      "created_at": "timestamptz"
    }
  ]
  ```
- **Odpowiedzi błędów**:
  - **`401 Unauthorized`**: Zwracany, gdy użytkownik nie jest uwierzytelniony.
    ```json
    {
      "error": "Unauthorized"
    }
    ```
  - **`500 Internal Server Error`**: Zwracany w przypadku nieoczekiwanego błędu serwera (np. błąd bazy danych).
    ```json
    {
      "error": "Internal Server Error"
    }
    ```

## 5. Przepływ danych
1.  Żądanie `GET` trafia do punktu końcowego Astro `/src/pages/api/projects/index.ts`.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje sesję użytkownika i umieszcza obiekt `user` w `context.locals`.
3.  Handler `GET` w pliku punktu końcowego sprawdza istnienie `context.locals.user`. Jeśli go brakuje, zwraca odpowiedź `401`.
4.  Jeśli użytkownik jest uwierzytelniony, handler wywołuje funkcję `getProjectsForUser` z nowego serwisu `src/lib/services/project.service.ts`, przekazując do niej instancję klienta Supabase (`context.locals.supabase`) oraz ID użytkownika (`context.locals.user.id`).
5.  Funkcja `getProjectsForUser` wykonuje zapytanie do tabeli `projects` w bazie Supabase, filtrując wyniki po `user_id`.
6.  Serwis zwraca listę projektów do handlera.
7.  Handler serializuje wynik do formatu JSON i wysyła odpowiedź `200 OK` z listą projektów.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Dostęp do punktu końcowego jest bezwzględnie warunkowany posiadaniem ważnej sesji użytkownika, zarządzanej przez Supabase i weryfikowanej przez middleware.
- **Autoryzacja**: Logika pobierania danych musi rygorystycznie filtrować projekty na podstawie `user_id` pochodzącego z obiektu sesji na serwerze. To zapobiega możliwości odpytania o projekty innego użytkownika.
- **Row Level Security (RLS)**: Tabela `projects` w Supabase musi mieć włączoną politykę RLS, która na poziomie bazy danych ogranicza dostęp do wierszy tylko dla ich właścicieli (`auth.uid() = user_id`). Stanowi to drugą, kluczową warstwę zabezpieczeń.

## 7. Rozważania dotyczące wydajności
- **Indeksowanie**: Zapytanie filtrujące po kolumnie `user_id` będzie wydajne, ponieważ jest to klucz obcy i powinien mieć założony indeks.
- **Paginacja**: W obecnej wersji specyfikacji paginacja nie jest wymagana. Jeśli jednak przewiduje się, że użytkownicy mogą posiadać bardzo dużą liczbę projektów, w przyszłości należy rozważyć dodanie paginacji (np. za pomocą parametrów `limit` i `offset`), aby uniknąć przesyłania dużych ilości danych i nadmiernego obciążania serwera.

## 8. Etapy wdrożenia
1.  **Utworzenie pliku serwisu**: Stwórz nowy plik `src/lib/services/project.service.ts`.
2.  **Implementacja logiki serwisu**: W pliku `project.service.ts` zaimplementuj asynchroniczną funkcję `getProjectsForUser(supabase: SupabaseClient, userId: string)`. Funkcja ta powinna:
    -   Przyjmować jako argumenty klienta Supabase i ID użytkownika.
    -   Wykonać zapytanie `select('id, name, description, created_at')` do tabeli `projects`.
    -   Użyć `.eq('user_id', userId)` do filtrowania wyników.
    -   Użyć `.order('created_at', { ascending: false })` do sortowania projektów od najnowszych.
    -   Obsłużyć potencjalny błąd zapytania i rzucić wyjątek w razie jego wystąpienia.
    -   Zwrócić dane jako `ProjectGetDto[]`.
3.  **Utworzenie pliku API route**: Stwórz nowy plik `src/pages/api/projects/index.ts`.
4.  **Implementacja handlera GET**: W pliku `index.ts` zaimplementuj handler `GET({ context, cookies })`. Handler powinien:
    -   Upewnić się, że `export const prerender = false;` jest ustawione.
    -   Pobrać `supabase` i `user` z `context.locals`.
    -   Sprawdzić, czy `user` istnieje. Jeśli nie, zwrócić `new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })`.
    -   Wywołać funkcję `getProjectsForUser` z serwisu, przekazując `supabase` i `user.id`.
    -   Zaimplementować blok `try...catch` do obsługi błędów z warstwy serwisu. W bloku `catch` zwrócić `new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })`.
    -   W przypadku sukcesu, zwrócić `new Response(JSON.stringify(projects), { status: 200 })`.
