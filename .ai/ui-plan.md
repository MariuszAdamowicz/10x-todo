# Architektura UI dla Aplikacji 10x To-Do

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji 10x To-Do opiera się na podejściu hybrydowym, wykorzystującym Astro do renderowania po stronie serwera (SSR) statycznych widoków (takich jak logowanie, rejestracja, ogólny layout) oraz React do tworzenia dynamicznych i interaktywnych "wysp" funkcjonalności. Główne interakcje, takie jak zarządzanie projektami i zadaniami, będą realizowane jako komponenty React.

Struktura jest zaprojektowana wokół trzech głównych obszarów:
1.  **Uwierzytelnianie:** Dedykowane strony dla logowania i rejestracji.
2.  **Zarządzanie Projektami:** Widok listy projektów oraz ich ustawień.
3.  **Zarządzanie Zadaniami:** Główny, dynamiczny widok projektu, który umożliwia hierarchiczne zarządzanie zadaniami, delegowanie ich do AI i obsługę cyklu życia zadania.

Nawigacja opiera się na routingu po stronie klienta z dynamiczną aktualizacją URL, co pozwala na głębokie linkowanie i odzwierciedlenie hierarchii zadań w pasku adresu. Stylizacja zostanie zrealizowana za pomocą Tailwind CSS, a biblioteka Shadcn/ui posłuży jako fundament dla budowy spójnych i dostępnych komponentów UI.

## 2. Lista widoków

### Widok Rejestracji
- **Nazwa widoku:** Rejestracja
- **Ścieżka widoku:** `/register`
- **Główny cel:** Umożliwienie nowym użytkownikom założenia konta (US-001).
- **Kluczowe informacje do wyświetlenia:** Formularz rejestracji.
- **Kluczowe komponenty widoku:**
    - `Card`: Kontener dla formularza.
    - `Input`: Pola na adres e-mail i hasło.
    - `Button`: Przycisk "Zarejestruj się".
    - Link do widoku logowania.
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** Prosty, jednoetapowy formularz. Komunikaty o błędach walidacji wyświetlane inline. Po sukcesie automatyczne przekierowanie do listy projektów.
    - **Dostępność:** Poprawne etykiety dla pól formularza (`aria-label`), walidacja po stronie klienta i serwera.
    - **Bezpieczeństwo:** Komunikacja przez HTTPS, walidacja danych wejściowych.

### Widok Logowania
- **Nazwa widoku:** Logowanie
- **Ścieżka widoku:** `/login`
- **Główny cel:** Umożliwienie istniejącym użytkownikom zalogowania się na swoje konto (US-002).
- **Kluczowe informacje do wyświetlenia:** Formularz logowania.
- **Kluczowe komponenty widoku:**
    - `Card`: Kontener dla formularza.
    - `Input`: Pola na adres e-mail i hasło.
    - `Button`: Przycisk "Zaloguj się".
    - Link do widoku rejestracji.
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** Czytelne komunikaty w przypadku błędnych danych.
    - **Dostępność:** Zapewnienie, że błędy logowania są komunikowane w sposób dostępny.
    - **Bezpieczeństwo:** Ochrona przed atakami brute-force (w gestii Supabase Auth).

### Widok Listy Projektów
- **Nazwa widoku:** Moje Projekty
- **Ścieżka widoku:** `/projects`
- **Główny cel:** Wyświetlenie listy projektów użytkownika i umożliwienie tworzenia nowych (US-003).
- **Kluczowe informacje do wyświetlenia:** Lista projektów z ich nazwami i opisami.
- **Kluczowe komponenty widoku:**
    - `Button`: Przycisk "Utwórz nowy projekt".
    - `Modal` / `Dialog`: Formularz do tworzenia nowego projektu.
    - `Card`: Elementy listy reprezentujące poszczególne projekty.
    - `Skeleton`: Animacja ładowania podczas pobierania listy projektów.
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** Wyraźny komunikat i wezwanie do działania, gdy lista projektów jest pusta.
    - **Dostępność:** Każdy projekt na liście jest linkiem z odpowiednią etykietą ARIA.
    - **Bezpieczeństwo:** Dane pobierane przez `GET /projects` po stronie serwera (Astro) lub klienta, zawsze w kontekście zalogowanego użytkownika.

### Widok Projektu i Zadań
- **Nazwa widoku:** Widok Projektu
- **Ścieżka widoku:** `/projects/[projectId]/tasks/[...taskId]`
- **Główny cel:** Centralne miejsce do zarządzania zadaniami, ich hierarchią, delegowaniem i interakcją z AI (pokrywa większość historyjek od US-006 do US-016).
- **Kluczowe informacje do wyświetlenia:** Nazwa projektu, nawigacja okruszkowa, lista zadań dla bieżącego poziomu.
- **Kluczowe komponenty widoku:**
    - `Breadcrumb`: Nawigacja okruszkowa pokazująca ścieżkę w hierarchii zadań.
    - `TaskList` (React): Interaktywna lista zadań obsługująca:
        - `TaskItem` (React): Reprezentacja pojedynczego zadania z tytułem, statusem i akcjami.
        - Wizualne wskaźniki dla zadań delegowanych i propozycji AI.
        - Przyciski akcji (Akceptuj/Odrzuć, Deleguj, Dodaj pod-zadanie).
        - Obsługa zmiany kolejności (drag-and-drop z alternatywą klawiaturową).
    - `Skeleton`: Animacja ładowania listy zadań.
    - `Toast` / `Sonner`: Globalne powiadomienia o błędach lub sukcesach.
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** "Optimistic UI" dla operacji CRUD na zadaniach. Stany ładowania i zablokowane przyciski podczas operacji. Polling w celu synchronizacji danych z AI.
    - **Dostępność:** Pełne wsparcie dla ARIA, alternatywna obsługa drag-and-drop z klawiatury.
    - **Bezpieczeństwo:** Wszystkie operacje na API są autoryzowane. Walidacja danych wejściowych.

### Widok Ustawień Projektu
- **Nazwa widoku:** Ustawienia Projektu
- **Ścieżka widoku:** `/projects/[projectId]/settings`
- **Główny cel:** Zarządzanie metadanymi projektu oraz kluczem API (US-004, US-005).
- **Kluczowe informacje do wyświetlenia:** Formularz edycji projektu, sekcja z kluczem API, strefa zagrożenia.
- **Kluczowe komponenty widoku:**
    - `Input`: Pola do edycji nazwy i opisu projektu.
    - `Button`: Przyciski "Zapisz", "Kopiuj klucz API", "Generuj nowy klucz", "Usuń projekt".
    - `Modal` / `Dialog`: Okno potwierdzenia dla operacji destrukcyjnych (regeneracja klucza, usunięcie projektu).
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** Klucz API jest domyślnie częściowo ukryty. Operacje destrukcyjne wymagają dodatkowego potwierdzenia.
    - **Dostępność:** Wszystkie przyciski i pola formularzy mają jasne etykiety.
    - **Bezpieczeństwo:** Dostęp do tego widoku jest ograniczony do właściciela projektu.

## 3. Mapa podróży użytkownika

Główny przepływ pracy użytkownika (happy path) wygląda następująco:

1.  **Start:** Użytkownik ląduje na stronie głównej i przechodzi do **Widoku Rejestracji** (`/register`), a następnie do **Widoku Logowania** (`/login`).
2.  **Panel Główny:** Po zalogowaniu użytkownik jest przekierowywany do **Widoku Listy Projektów** (`/projects`).
3.  **Tworzenie Projektu:** Użytkownik tworzy nowy projekt za pomocą modala, co skutkuje dodaniem nowego elementu do listy.
4.  **Zarządzanie Zadaniami:** Użytkownik klika na projekt, przechodząc do **Widoku Projektu i Zadań** (`/projects/[id]`). Tutaj może:
    - Dodawać zadania (`POST /tasks`).
    - Tworzyć pod-zadania, nawigując w głąb hierarchii (`/projects/[id]/tasks/[taskId]`).
    - Zmieniać kolejność zadań (`POST /tasks/reorder`).
    - Delegować zadanie do AI (`PATCH /tasks/[id]`).
5.  **Interakcja z AI:** Gdy AI zaproponuje zmianę statusu, zadanie w widoku zostaje specjalnie oznaczone. Użytkownik może:
    - Zaakceptować propozycję (`POST /tasks/[id]/accept-proposal`).
    - Odrzucić propozycję, dodając komentarz w modalu (`POST /tasks/[id]/reject-proposal`).
6.  **Zarządzanie Projektem:** W dowolnym momencie użytkownik może przejść do **Widoku Ustawień Projektu** (`/projects/[id]/settings`), aby edytować projekt, zarządzać kluczem API lub usunąć projekt.

## 4. Układ i struktura nawigacji

Nawigacja została zaprojektowana z myślą o prostocie i orientacji w hierarchii.

- **Layout Główny (Astro):**
    - **Nagłówek:** Zawiera logo aplikacji (link do `/projects`) oraz menu użytkownika z opcją "Wyloguj".
    - **Treść Główna:** Obszar, w którym renderowane są poszczególne widoki (strony Astro lub komponenty React).
- **Nawigacja w Widoku Projektu:**
    - **Routing "Drill-Down":** Adres URL jednoznacznie identyfikuje bieżącą lokalizację w drzewie zadań (np. `/projects/abc/tasks/xyz/123`). Jest to kluczowe dla odświeżania strony i udostępniania linków.
    - **Nawigacja Okruszkowa (Breadcrumbs):** Komponent `Breadcrumb` w **Widoku Projektu i Zadań** wyświetla klikalną ścieżkę od korzenia projektu do bieżącego zadania, umożliwiając szybki powrót na wyższe poziomy.

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów, które będą stanowić podstawę interfejsu.

- **`Button`:** Przycisk z obsługą stanów ładowania (spinner) i wariantami wizualnymi.
- **`Modal` / `Dialog`:** Komponent do wyświetlania treści (np. formularzy, potwierdzeń) w warstwie nad głównym interfejsem.
- **`Skeleton`:** Komponent do wyświetlania "szkieletu" interfejsu podczas ładowania danych, poprawiający postrzeganą wydajność.
- **`Toast` / `Sonner`:** Komponent do wyświetlania krótkich, globalnych powiadomień (np. o błędach lub pomyślnie zakończonych operacjach).
- **`Breadcrumb`:** Komponent nawigacyjny, który buduje ścieżkę powrotu w hierarchicznych strukturach.
- **`TaskList` (React):** Kontener na listę zadań, odpowiedzialny za pobieranie danych z API, obsługę "optimistic UI", pollingu oraz mechanizmu drag-and-drop.
- **`TaskItem` (React):** Komponent reprezentujący pojedyncze zadanie. Odpowiada za wyświetlanie jego stanu (w tym propozycji AI) i udostępnianie akcji kontekstowych (edycja, delegowanie, akceptacja/odrzucenie).
