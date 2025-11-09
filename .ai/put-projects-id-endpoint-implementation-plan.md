
# Plan Implementacji Endpointu API: Aktualizacja Projektu

## 1. Przegląd Endpointu
Ten endpoint umożliwia użytkownikom aktualizację istniejącego projektu. Użytkownik musi być uwierzytelniony i być właścicielem projektu, aby móc go zmodyfikować. Endpoint przyjmuje identyfikator projektu w ścieżce URL oraz nowe dane projektu w ciele żądania.

## 2. Szczegóły Żądania
- **Metoda HTTP:** `PUT`
- **Struktura URL:** `/api/projects/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (w ścieżce URL): Unikalny identyfikator projektu (UUID).
  - **Opcjonalne:** Brak
- **Ciało Żądania (Request Body):**
  - `Content-Type: application/json`
  - Struktura:
    ```json
    {
      "name": "Nowa nazwa projektu",
      "description": "Zaktualizowany opis projektu"
    }
    ```

## 3. Używane Typy
- **Command Model:** `ProjectUpdateCommand` (z `src/types.ts`)
  ```typescript
  export type ProjectUpdateCommand = Pick<Project, 'name' | 'description'>;
  ```
- **DTO:** `ProjectUpdateResultDto` (z `src/types.ts`)
  ```typescript
  export type ProjectUpdateResultDto = Project;
  ```
- **Walidacja (Zod):**
  ```typescript
  import { z } from 'zod';

  const projectUpdateSchema = z.object({
    name: z.string().min(1, "Nazwa projektu jest wymagana."),
    description: z.string().nullable(),
  });

  const idSchema = z.string().uuid("Nieprawidłowy format ID projektu.");
  ```

## 4. Szczegóły Odpowiedzi
- **Sukces (200 OK):** Zwraca pełny, zaktualizowany obiekt projektu.
  ```json
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "name": "Nowa nazwa projektu",
    "description": "Zaktualizowany opis projektu",
    "api_key": "q1r2s3t4-u5v6-w7x8-y9z0-a1b2c3d4e5f6",
    "created_at": "2025-11-09T10:00:00Z"
  }
  ```
- **Błędy:**
  - **400 Bad Request:** Nieprawidłowy format `id` lub błędy walidacji ciała żądania.
  - **401 Unauthorized:** Użytkownik nie jest zalogowany.
  - **403 Forbidden:** Użytkownik nie jest właścicielem projektu.
  - **404 Not Found:** Projekt o podanym `id` nie istnieje.
  - **500 Internal Server Error:** Błąd serwera, np. problem z bazą danych.

## 5. Przepływ Danych
1. Endpoint `PUT /api/projects/{id}` otrzymuje żądanie.
2. Middleware Astro weryfikuje token JWT i dołącza obiekt `user` oraz klienta `supabase` do `context.locals`.
3. Handler `PUT` w `src/pages/api/projects/[id].ts` jest wywoływany.
4. Walidacja parametru `id` z URL przy użyciu `zod`.
5. Walidacja ciała żądania przy użyciu `zod` (`projectUpdateSchema`).
6. Wywołanie nowej metody `projectService.updateProject(supabase, id, userId, projectData)`.
7. Serwis `project.service.ts` wykonuje zapytanie `UPDATE` do tabeli `projects` w Supabase, używając `id` i `user_id` w klauzuli `WHERE`, aby upewnić się, że użytkownik modyfikuje własny projekt.
8. Baza danych zwraca zaktualizowany rekord.
9. Serwis zwraca zaktualizowany projekt do handlera.
10. Handler serializuje dane do formatu JSON i zwraca odpowiedź z kodem statusu 200.

## 6. Kwestie Bezpieczeństwa
- **Uwierzytelnianie:** Zapewnione przez middleware Astro, które weryfikuje token JWT Supabase. Dostęp do endpointu powinien być zablokowany dla niezalogowanych użytkowników.
- **Autoryzacja:** Kluczowym elementem jest weryfikacja, czy zalogowany użytkownik (`user.id`) jest właścicielem projektu, który próbuje zaktualizować. Zapytanie `UPDATE` w serwisie musi zawierać warunek `eq('user_id', userId)`, co jest zgodne z polityką RLS w Supabase (`allow update for users on their own projects`).
- **Walidacja Danych:** Wszystkie dane wejściowe (`id` i ciało żądania) muszą być rygorystycznie walidowane za pomocą `zod`, aby zapobiec atakom typu SQL Injection i zapewnić spójność danych.

## 7. Obsługa Błędów
- **Brak `user` w `context.locals`:** Zwróć 401 Unauthorized.
- **Nieprawidłowy `id` (nie-UUID):** Zwróć 400 Bad Request z komunikatem "Nieprawidłowy format ID projektu."
- **Nieprawidłowe ciało żądania:** Zwróć 400 Bad Request z szczegółami błędów walidacji `zod`.
- **Projekt nie znaleziony lub brak uprawnień:** Zapytanie `update` w Supabase z `match({ id: validatedId, user_id: userId })` zwróci `data: null`. W takim przypadku zwróć 404 Not Found. To zapobiega ujawnianiu informacji, czy projekt istnieje, ale należy do kogoś innego.
- **Błąd bazy danych:** W bloku `catch` złap błąd z `projectService` i zwróć 500 Internal Server Error. Błąd powinien być logowany po stronie serwera.

## 8. Wydajność
- Zapytanie `UPDATE` na kluczu głównym (`id`) i indeksowanym polu (`user_id`) jest wysoce wydajne.
- Nie przewiduje się problemów z wydajnością przy typowym obciążeniu.

## 9. Kroki Implementacji
1. **Utworzenie nowej metody w `project.service.ts`:**
   - Dodaj metodę `updateProject(supabase: SupabaseClient, id: string, userId: string, projectData: ProjectUpdateCommand): Promise<ProjectUpdateResultDto | null>`.
   - Wewnątrz metody wykonaj zapytanie `UPDATE` do Supabase:
     ```typescript
     const { data, error } = await supabase
       .from('projects')
       .update({ name: projectData.name, description: projectData.description })
       .eq('id', id)
       .eq('user_id', userId)
       .select()
       .single();
     ```
   - Zaimplementuj obsługę błędów i zwracanie `data` lub `null`.

2. **Implementacja handlera `PUT` w `src/pages/api/projects/[id].ts`:**
   - Dodaj `export async function PUT(context: APIContext): Promise<Response>`.
   - Pobierz `id` z `context.params` oraz `supabase` i `user` z `context.locals`.
   - Sprawdź, czy `user` istnieje, jeśli nie, zwróć 401.
   - Zwaliduj `id` za pomocą `idSchema`.
   - Pobierz i zwaliduj ciało żądania za pomocą `projectUpdateSchema`.
   - Wywołaj `projectService.updateProject` z odpowiednimi parametrami.
   - Jeśli wynik jest `null`, zwróć 404.
   - Jeśli wystąpi błąd, zwróć 500.
   - Jeśli operacja się powiedzie, zwróć zaktualizowany projekt z kodem 200.

3. **Dodanie dokumentacji Swagger:**
   - W pliku `src/pages/api/projects/[id].ts`, dodaj blok komentarza JSDoc dla metody `PUT`, opisujący endpoint zgodnie ze standardem OpenAPI.

