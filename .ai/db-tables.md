# Plan schematu bazy danych

Na podstawie dokumentu wymagań produktu (PRD), notatek z sesji planowania i analizy stosu technologicznego, poniżej przedstawiono kompleksowy schemat bazy danych PostgreSQL zoptymalizowany dla Supabase.

## 1. Lista tabel

### `public.profiles`
Tabela przechowująca minimalne dane publiczne użytkowników, rozszerzająca wbudowaną tabelę `auth.users`.

| Nazwa kolumny | Typ danych    | Ograniczenia                                            | Opis                               |
|---------------|---------------|---------------------------------------------------------|------------------------------------|
| `id`          | `uuid`        | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Identyfikator użytkownika z `auth.users`. |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                             | Czas utworzenia profilu.           |

### `public.projects`
Tabela przechowująca projekty użytkowników. Każdy projekt jest odizolowanym kontenerem na zadania i posiada własny klucz API.

| Nazwa kolumny | Typ danych    | Ograniczenia                                            | Opis                                         |
|---------------|---------------|---------------------------------------------------------|----------------------------------------------|
| `id`          | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`              | Unikalny identyfikator projektu.             |
| `user_id`     | `uuid`        | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Identyfikator właściciela projektu.          |
| `name`        | `text`        | `NOT NULL`                                              | Nazwa projektu.                              |
| `description` | `text`        | `NULL`                                                  | Opcjonalny opis projektu.                    |
| `api_key`     | `uuid`        | `NOT NULL`, `UNIQUE`, `DEFAULT gen_random_uuid()`       | Unikalny klucz API do uwierzytelniania AI.   |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                             | Czas utworzenia projektu.                    |

### `public.task_statuses`
Tabela słownikowa definiująca możliwe statusy zadań.

| Nazwa kolumny | Typ danych | Ograniczenia                 | Opis                               |
|---------------|------------|------------------------------|------------------------------------|
| `id`          | `smallint` | `PRIMARY KEY`                | Unikalny identyfikator statusu.    |
| `name`        | `text`     | `NOT NULL`, `UNIQUE`         | Nazwa statusu.                     |

**Wstępne dane:**
1.  `To Do`
2.  `Done`
3.  `Canceled`
4.  `Done, pending acceptance`
5.  `Canceled, pending confirmation`

### `public.tasks`
Główna tabela aplikacji, przechowująca zadania w strukturze hierarchicznej.

| Nazwa kolumny   | Typ danych    | Ograniczenia                                                  | Opis                                                              |
|-----------------|---------------|---------------------------------------------------------------|-------------------------------------------------------------------|
| `id`            | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                    | Unikalny identyfikator zadania.                                   |
| `project_id`    | `uuid`        | `NOT NULL`, `REFERENCES projects(id) ON DELETE CASCADE`       | Identyfikator projektu, do którego należy zadanie.                |
| `parent_id`     | `uuid`        | `NULL`, `REFERENCES tasks(id) ON DELETE CASCADE`              | Identyfikator zadania nadrzędnego (dla pod-zadań).                |
| `status_id`     | `smallint`    | `NOT NULL`, `REFERENCES task_statuses(id)`                    | Identyfikator statusu zadania.                                    |
| `title`         | `text`        | `NOT NULL`                                                    | Tytuł zadania.                                                    |
| `description`   | `text`        | `NULL`                                                        | Opcjonalny opis zadania.                                          |
| `position`      | `integer`     | `NOT NULL`, `DEFAULT 0`                                       | Pozycja zadania na liście (względem rodzeństwa).                  |
| `is_delegated`  | `boolean`     | `NOT NULL`, `DEFAULT false`                                   | Flaga wskazująca, czy zadanie jest delegowane do AI.              |
| `created_by_ai` | `boolean`     | `NOT NULL`, `DEFAULT false`                                   | Flaga wskazująca, czy zadanie zostało utworzone przez AI.         |
| `created_at`    | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                   | Czas utworzenia zadania.                                          |
| `updated_at`    | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                   | Czas ostatniej modyfikacji zadania.                               |

### `public.task_comments`
Tabela do przechowywania komentarzy i historii zmian statusów zadań.

| Nazwa kolumny        | Typ danych    | Ograniczenia                                              | Opis                                                              |
|----------------------|---------------|-----------------------------------------------------------|-------------------------------------------------------------------|
| `id`                 | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                | Unikalny identyfikator komentarza.                                |
| `task_id`            | `uuid`        | `NOT NULL`, `REFERENCES tasks(id) ON DELETE CASCADE`      | Identyfikator zadania, którego dotyczy komentarz.                 |
| `comment`            | `text`        | `NOT NULL`                                                | Treść komentarza.                                                 |
| `author_is_ai`       | `boolean`     | `NOT NULL`, `DEFAULT false`                               | Flaga wskazująca, czy autorem komentarza jest AI.                 |
| `previous_status_id` | `smallint`    | `NULL`, `REFERENCES task_statuses(id)`                    | Poprzedni status zadania (jeśli komentarz loguje zmianę statusu). |
| `new_status_id`      | `smallint`    | `NULL`, `REFERENCES task_statuses(id)`                    | Nowy status zadania (jeśli komentarz loguje zmianę statusu).      |
| `created_at`         | `timestamptz` | `NOT NULL`, `DEFAULT now()`                               | Czas utworzenia komentarza.                                       |

## 2. Relacje między tabelami

-   **`auth.users` 1-do-1 `profiles`**: Każdy użytkownik Supabase ma jeden profil.
-   **`auth.users` 1-do-N `projects`**: Użytkownik może mieć wiele projektów.
-   **`projects` 1-do-N `tasks`**: Projekt zawiera wiele zadań. Usunięcie projektu powoduje kaskadowe usunięcie wszystkich jego zadań.
-   **`tasks` 1-do-N `tasks` (self-referencing)**: Zadanie może mieć wiele pod-zadań. Usunięcie zadania nadrzędnego powoduje kaskadowe usunięcie jego pod-zadań.
-   **`task_statuses` 1-do-N `tasks`**: Każdy status może być przypisany do wielu zadań.
-   **`tasks` 1-do-N `task_comments`**: Zadanie może mieć wiele komentarzy. Usunięcie zadania powoduje kaskadowe usunięcie jego komentarzy.
