# Specyfikacja Techniczna: Moduł Autentykacji Użytkowników

## 1. Wprowadzenie

Niniejszy dokument opisuje architekturę i plan wdrożenia funkcjonalności autentykacji użytkowników (rejestracja, logowanie, wylogowywanie, odzyskiwanie hasła) w aplikacji 10x To-Do. Specyfikacja opiera się na wymaganiach zdefiniowanych w PRD (US-001, US-002) oraz na przyjętym stosie technologicznym (Astro, React, Supabase).

Celem jest stworzenie bezpiecznego i spójnego systemu zarządzania sesją użytkownika, który integruje się z istniejącą architekturą aplikacji (SSR w Astro, komponenty klienckie w React) i wykorzystuje gotowe mechanizmy Supabase Auth.

## 2. Architektura Interfejsu Użytkownika

### 2.1. Nowe Strony (Astro)

Wprowadzone zostaną nowe, publicznie dostępne strony renderowane po stronie serwera przez Astro. Będą one pełniły rolę kontenerów dla interaktywnych formularzy w React.

-   `src/pages/login.astro`: Strona logowania.
    -   Będzie zawierać komponent `<LoginForm client:load />`.
    -   Będzie renderować podstawowy layout dla gości.
-   `src/pages/register.astro`: Strona rejestracji.
    -   Będzie zawierać komponent `<RegisterForm client:load />`.

### 2.2. Nowe Komponenty (React)

Interaktywne elementy UI zostaną zaimplementowane jako komponenty React, wykorzystując bibliotekę `shadcn/ui` oraz `react-hook-form` do zarządzania stanem i walidacją.

-   `src/components/features/auth/LoginForm.tsx`:
    -   Formularz z polami na e-mail i hasło.
    -   Przycisk "Zaloguj się".
    -   Link do strony `/register`.
    -   Obsługa stanu ładowania i wyświetlanie komunikatów o błędach (np. "Nieprawidłowe dane logowania").
    -   Po pomyślnym zalogowaniu (otrzymaniu odpowiedzi z API), komponent dokona przekierowania (`window.location.href = '/projects'`).
-   `src/components/features/auth/RegisterForm.tsx`:
    -   Formularz z polami na e-mail, hasło i potwierdzenie hasła.
    -   Walidacja po stronie klienta (np. czy hasła są identyczne).
    -   Po pomyślnej rejestracji, analogiczne przekierowanie do `/projects`.

### 2.3. Modyfikacja Istniejących Komponentów i Layoutów

-   **`src/layouts/Layout.astro`**:
    -   Layout będzie musiał rozróżniać stan zalogowania użytkownika. Informacja o sesji będzie dostępna poprzez `Astro.locals.user`.
    -   W zależności od stanu zalogowania, layout będzie renderował odpowiednie elementy w nagłówku.
-   **`src/components/layout/Header.astro`**:
    -   W nagłówku pojawi się logika warunkowa:
        -   **Jeśli użytkownik jest zalogowany (`Astro.locals.user`)**: Wyświetlony zostanie nowy komponent `UserNav.tsx` (client-side), który pokaże np. awatar użytkownika i menu z opcją "Wyloguj".
        -   **Jeśli użytkownik nie jest zalogowany**: Wyświetlone zostaną przyciski/linki "Zaloguj się" i "Zarejestruj się".
-   **`src/components/layout/UserNav.tsx`**:
    -   Komponent React, który będzie zawierał przycisk "Wyloguj".
    -   Kliknięcie przycisku wywoła `POST` na endpoint `/api/auth/logout`, a po pomyślnej odpowiedzi przekieruje na stronę główną (`/`).

### 2.4. Podział Odpowiedzialności (Astro vs React)

-   **Astro (`.astro`)** odpowiada za:
    -   Routing i definicję stron.
    -   Renderowanie statycznej struktury HTML (layout, nagłówek, stopka).
    -   Ochronę stron renderowanych serwerowo (przekierowanie w `Astro.locals`).
    -   Osadzanie komponentów React z dyrektywą `client:load`.
-   **React (`.tsx`)** odpowiada za:
    -   Wszelką interaktywność po stronie klienta.
    -   Zarządzanie stanem formularzy (dane wejściowe, ładowanie, błędy).
    -   Walidację danych w czasie rzeczywistym.
    -   Komunikację z API autentykacji.
    -   Dynamiczne renderowanie elementów UI w zależności od akcji użytkownika (np. wyświetlanie `toast` z błędem).

## 3. Logika Backendowa

### 3.1. Middleware (`src/middleware/index.ts`)

Middleware w Astro będzie centralnym punktem zarządzania sesją po stronie serwera.

-   Przy każdym żądaniu, middleware będzie używać `Astro.cookies` do odczytania tokena sesji Supabase.
-   Następnie zweryfikuje token przy użyciu klienta Supabase, aby uzyskać dane zalogowanego użytkownika.
-   Dane użytkownika (lub `null`) zostaną przypisane do `Astro.locals.user`. Dzięki temu informacja o sesji będzie dostępna we wszystkich stronach Astro i endpointach API.
-   Dla chronionych ścieżek (np. `/projects`, `/api/*` z wyjątkiem `/api/auth/*`), middleware sprawdzi, czy `Astro.locals.user` istnieje. Jeśli nie, przekieruje użytkownika na stronę `/login` z kodem `302`.

### 3.2. Endpointy API (`src/pages/api/auth/`)

Zostaną utworzone dedykowane endpointy API (Astro routes) do obsługi logiki autentykacji.

-   `POST /api/auth/register`:
    -   Przyjmuje `email` i `password`.
    -   Wywołuje `supabase.auth.signUp()`.
    -   W przypadku sukcesu, Supabase automatycznie wygeneruje sesję. Endpoint ustawi odpowiednie ciasteczka sesyjne w odpowiedzi (za pomocą `Astro.cookies.set`) i zwróci status `200 OK`.
    -   W przypadku błędu (np. użytkownik już istnieje), zwróci odpowiedni kod błędu (np. `409 Conflict`) z komunikatem.
-   `POST /api/auth/login`:
    -   Przyjmuje `email` i `password`.
    -   Wywołuje `supabase.auth.signInWithPassword()`.
    -   W przypadku sukcesu, ustawi ciasteczka sesyjne i zwróci `200 OK`.
    -   W przypadku błędu, zwróci `401 Unauthorized`.
-   `POST /api/auth/logout`:
    -   Wywołuje `supabase.auth.signOut()`.
    -   Czyści ciasteczka sesyjne (`Astro.cookies.delete`) i zwraca `200 OK`.

### 3.3. Walidacja i Obsługa Błędów

-   **Walidacja**: Każdy endpoint API będzie używał `zod` do walidacji ciała żądania (`request.json()`). Schematy walidacji (np. `LoginSchema`, `RegisterSchema`) zostaną zdefiniowane w `src/lib/schemas/auth.schemas.ts`. Zapewni to bezpieczeństwo i spójność danych.
-   **Obsługa Błędów**: Błędy zwracane przez Supabase (np. `Invalid login credentials`, `User already registered`) będą przechwytywane w blokach `try...catch` i mapowane na odpowiednie odpowiedzi HTTP (np. 401, 409, 500) wraz z czytelnym komunikatem JSON, który frontend będzie mógł wyświetlić użytkownikowi.

## 4. System Autentykacji (Supabase Auth + Astro)

### 4.1. Konfiguracja

-   Klucze Supabase (`SUPABASE_URL` i `SUPABASE_ANON_KEY`) zostaną dodane do zmiennych środowiskowych w pliku `.env`.
-   Plik `database.types.ts` zostanie zaktualizowany o typy związane z autentykacją, jeśli będzie to konieczne (choć Supabase Auth w dużej mierze zarządza tym wewnętrznie).

### 4.2. Zarządzanie Sesją

-   Kluczowym mechanizmem będzie wykorzystanie `Supabase Server-Side Auth` dla Astro, które opiera się na ciasteczkach (cookies). Po pomyślnym zalogowaniu/rejestracji, Supabase generuje JWT, który jest bezpiecznie przechowywany w ciasteczku `httpOnly`.
-   Middleware (`src/middleware/index.ts`) będzie odpowiedzialny za odczytanie tego ciasteczka i uwierzytelnienie użytkownika na serwerze przy każdym żądaniu.
-   Dzięki temu podejściu, tokeny nie są przechowywane w `localStorage` przeglądarki, co zwiększa bezpieczeństwo (ochrona przed atakami XSS). Aplikacja pozostaje zgodna z modelem `output: "server"`, a stan zalogowania jest spójny między renderowaniem serwerowym a klienckim.

### 4.3. Procesy Autentykacji

-   **Rejestracja**: `supabase.auth.signUp()` stworzy nowego użytkownika w tabeli `auth.users` w Supabase. Domyślnie może być włączone potwierdzenie e-mail, ale zgodnie z US-001 (automatyczne zalogowanie), można je wyłączyć w ustawieniach Supabase na rzecz natychmiastowej sesji.
-   **Logowanie**: `supabase.auth.signInWithPassword()` zweryfikuje dane i, jeśli są poprawne, zwróci sesję.
-   **Wylogowanie**: `supabase.auth.signOut()` unieważni sesję po stronie Supabase. Endpoint API musi dodatkowo usunąć ciasteczko z przeglądarki.

**Uwaga**: Funkcjonalność odzyskiwania hasła, wspomniana w US-002, jest jawnie wykluczona z zakresu MVP w sekcji "Granice produktu" dokumentu PRD i nie będzie implementowana w tej fazie.
