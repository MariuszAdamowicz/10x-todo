# API Endpoint Implementation Plan: POST /projects

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia uwierzytelnionym użytkownikom tworzenie nowych projektów. Po pomyślnym utworzeniu, projekt jest automatycznie powiązany z użytkownikiem, który go utworzył, i generowany jest dla niego unikalny klucz API.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/projects`
- **Parametry**: Brak parametrów w URL.
- **Request Body**: Wymagane jest ciało żądania w formacie `application/json`.
  ```json
  {
    "name": "string",
    "description": "string | null"
  }
  ```
  - `name`: Nazwa projektu (wymagana).
  - `description`: Opcjonalny opis projektu.

## 3. Wykorzystywane typy
Implementacja będzie korzystać z istniejących typów zdefiniowanych w `src/types.ts`:
- **Command Model (Request)**: `ProjectCreateCommand`
- **DTO (Response)**: `ProjectCreateResultDto`

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (201 Created)**: Zwraca pełny obiekt nowo utworzonego projektu.
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "string",
    "description": "string | null",
    "api_key": "uuid",
    "created_at": "timestamptz"
  }
  ```
- **Odpowiedzi błędów**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe.
  - `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
  - `500 Internal Server Error`: Wewnętrzny błąd serwera.

## 5. Przepływ danych
1.  Klient wysyła żądanie `POST` na adres `/api/projects` z danymi projektu w ciele.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje token sesji użytkownika i dołącza dane użytkownika do `context.locals`.
3.  Handler `POST` w `src/pages/api/projects/index.ts` jest wywoływany.
4.  Handler sprawdza, czy `context.locals.user` istnieje. Jeśli nie, zwraca `401 Unauthorized`.
5.  Ciało żądania jest parsowane i walidowane przy użyciu schematu `zod` pod kątem zgodności z typem `ProjectCreateCommand`. W przypadku błędu zwracane jest `400 Bad Request`.
6.  Handler wywołuje funkcję `createProject` z serwisu `project.service.ts`, przekazując jej klienta Supabase, ID użytkownika (`context.locals.user.id`) oraz zwalidowane dane projektu.
7.  Funkcja `createProject` wykonuje operację `insert` w tabeli `projects`, ustawiając `user_id` na ID zalogowanego użytkownika. Pola `id`, `api_key` i `created_at` są generowane automatycznie przez bazę danych.
8.  Serwis zwraca nowo utworzony obiekt projektu lub zgłasza błąd, jeśli operacja w bazie danych się nie powiedzie.
9.  Handler API łapie ewentualne błędy z warstwy serwisu i zwraca `500 Internal Server Error`.
10. W przypadku sukcesu, handler zwraca odpowiedź `201 Created` z danymi nowego projektu.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Dostęp do punktu końcowego jest chroniony przez middleware, który weryfikuje sesję użytkownika. Wszystkie żądania bez ważnej sesji zostaną odrzucone.
- **Autoryzacja**: Identyfikator `user_id` dla nowego projektu jest pobierany wyłącznie z zaufanego źródła (`context.locals.user.id`), a nie z danych wejściowych od klienta. Zapobiega to tworzeniu projektów w imieniu innych użytkowników.
- **Walidacja danych**: Wszystkie dane wejściowe są rygorystycznie walidowane za pomocą `zod`, aby zapewnić ich poprawność i integralność, chroniąc przed nieoczekiwanymi formatami danych.
- **Ochrona przed SQL Injection**: Użycie biblioteki klienckiej Supabase zapewnia parametryzację zapytań do bazy danych, co eliminuje ryzyko ataków SQL Injection.

## 7. Obsługa błędów
- **Brak uwierzytelnienia**:
  - **Kod**: `401 Unauthorized`
  - **Odpowiedź**: `{"error": "Unauthorized"}`
- **Błąd walidacji**:
  - **Kod**: `400 Bad Request`
  - **Odpowiedź**: `{"error": "Bad Request", "details": "[...zod error details...]"}`
- **Błąd serwera**:
  - **Kod**: `500 Internal Server Error`
  - **Odpowiedź**: `{"error": "Internal Server Error"}`

## 8. Rozważania dotyczące wydajności
Operacja `INSERT` na tabeli `projects` jest z natury szybka. Indeks na kolumnie `user_id` (który jest kluczem obcym) zapewni dobrą wydajność przyszłych zapytań o projekty danego użytkownika. Na tym etapie nie przewiduje się żadnych wąskich gardeł wydajnościowych.

## 9. Etapy wdrożenia
1.  **Definicja schematu walidacji**: W pliku `src/pages/api/projects/index.ts` zdefiniować schemat `zod` dla `ProjectCreateCommand`.
2.  **Implementacja serwisu**: W pliku `src/lib/services/project.service.ts` utworzyć asynchroniczną funkcję `createProject(supabase: SupabaseClient, userId: string, projectData: ProjectCreateCommand)`.
3.  **Logika serwisu**: Wewnątrz `createProject`, zaimplementować logikę wstawiania nowego rekordu do tabeli `projects` przy użyciu `supabase.from('projects').insert({...}).select().single()`. Należy upewnić się, że pole `user_id` jest ustawione.
4.  **Obsługa błędów w serwisie**: Dodać obsługę błędów dla zapytania do bazy danych. W przypadku błędu, funkcja powinna go zgłosić (throw).
5.  **Implementacja handlera API**: W pliku `src/pages/api/projects/index.ts` utworzyć handler `POST`.
6.  **Sprawdzenie uwierzytelnienia**: W handlerze `POST` dodać warunek sprawdzający `context.locals.user` i zwracający `401`, jeśli użytkownik nie jest zalogowany.
7.  **Walidacja w handlerze**: Dodać logikę do parsowania i walidacji ciała żądania przy użyciu zdefiniowanego schematu `zod`.
8.  **Wywołanie serwisu**: Wywołać funkcję `project.service.ts::createProject` z odpowiednimi argumentami.
9.  **Obsługa błędów w handlerze**: Obudować wywołanie serwisu w blok `try...catch`, aby przechwytywać błędy i zwracać odpowiedź `500`.
10. **Zwrócenie odpowiedzi**: W przypadku pomyślnego utworzenia projektu, zwrócić odpowiedź `201 Created` wraz z danymi projektu.
