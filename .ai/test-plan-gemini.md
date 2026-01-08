<analiza_projektu>

**1. Kluczowe komponenty projektu wynikające z analizy kodu:**
*   **Warstwa Frontendowa (UI):** Zbudowana na **Astro** z komponentami **React**. Kluczowe widoki to Dashboard (`ProjectsView`), Szczegóły Projektu (`ProjectAndTasksView`) oraz Ustawienia (`ProjectSettingsView`). Wykorzystuje **Tailwind CSS** do stylowania i **Shadcn UI** (Radix Primitives) do interfejsu (modale, dropdowny, toasty).
*   **Zarządzanie Stanem i Logika Biznesowa (Hooks):** Customowe hooki (`useTasks`, `useProjects`, `useProjectSettings`) obsługujące asynchroniczne zapytania do API, zarządzanie stanem lokalnym oraz *optimistic UI updates* (szczególnie przy `reorderTasks` i edycji zadań).
*   **Warstwa API (Backend for Frontend):** Endpointy Astro (`src/pages/api/`) pełniące rolę backendu. Obsługują autoryzację, walidację danych (Zod) i komunikację z bazą danych.
*   **Warstwa Usług (Services):** `TaskService` i `ProjectService` izolują logikę biznesową od kontrolerów API. Zawierają kluczowe reguły, np. ograniczenia dla agentów AI, logikę propozycji zmian statusu.
*   **Baza Danych i Autoryzacja:** **Supabase** (PostgreSQL). Wykorzystanie RLS (Row Level Security), Supabase Auth (User Management) oraz dedykowana obsługa kluczy API dla agentów AI (weryfikacja w middleware).
*   **Integracja AI:** Specyficzny model uprawnień dla AI (`delegation_locked_at`, `created_by_ai`). AI nie edytuje zadań bezpośrednio (chyba że są podzadaniami), lecz wysyła "propozycje" zmian statusu (`TaskProposeStatusCommand`), które użytkownik musi zaakceptować lub odrzucić.

**2. Specyfika stosu technologicznego i jego wpływ na strategię testowania:**
*   **Astro (SSR + Client Hydration):** Wymaga testowania zarówno renderowania po stronie serwera (SEO, initial load), jak i interaktywności po stronie klienta (React Islands). Middleware Astro (`src/middleware/index.ts`) jest krytycznym punktem bezpieczeństwa.
*   **Supabase & RLS:** Testy integracyjne muszą weryfikować, czy użytkownik A nie widzi danych użytkownika B. Należy sprawdzić, czy tokeny sesyjne i klucze API AI są poprawnie interpretowane przez bazę.
*   **Optimistic UI:** W `useTasks.ts` widoczna jest implementacja optymistycznych aktualizacji. Testy muszą sprawdzić scenariusze *race conditions* i *error handling* (cofnięcie zmian w UI, gdy API zwróci błąd).
*   **Zod & TypeScript:** Silne typowanie i walidacja `runtime` na wejściu API. Testy API powinny skupić się na przypadkach brzegowych (błędne typy danych), aby upewnić się, że `safeParse` zwraca odpowiednie kody błędów (400).

**3. Priorytety testowe bazujące na strukturze repozytorium:**
1.  **Bezpieczeństwo i Autoryzacja:** Weryfikacja Middleware i RLS. Kluczowe jest, aby AI z kluczem projektu X nie mogło modyfikować projektu Y.
2.  **Workflow AI (Delegacja i Propozycje):** To unikalna funkcjonalność tego systemu. Testy muszą pokryć proces: Delegacja -> AI proponuje zmianę -> Użytkownik Akceptuje/Odrzuca.
3.  **CRUD Zadań i Podzadań:** Podstawowa funkcjonalność. Szczególny nacisk na hierarchię (parent-child) i usuwanie kaskadowe.
4.  **Drag & Drop (Reordering):** Funkcjonalność UI (`dnd-kit`), która często generuje błędy wizualne lub niespójność danych przy szybkich akcjach.

**4. Potencjalne obszary ryzyka wymagające szczególnej uwagi w testach:**
*   **Bezpieczeństwo kluczy API:** Endpoint `regenerate-api-key`. Ryzyko wycieku klucza lub dostępu nieautoryzowanego użytkownika do regeneracji.
*   **Konflikty edycji (User vs AI):** Sytuacja, w której użytkownik modyfikuje zadanie w tym samym momencie, gdy AI próbuje wysłać propozycję lub zaktualizować podzadanie.
*   **Spójność danych przy Drag&Drop:** Ryzyko błędnego zapisu kolejności (`position`) w bazie danych przy szybkim przesuwaniu wielu elementów.
*   **Sesje Supabase:** Obsługa wygasania tokenów i odświeżania sesji (SSR cookies).

</analiza_projektu>

<plan_testów>

# Kompleksowy Plan Testów dla Projektu "10x To-Do App"

## 1. Wprowadzenie i cele testowania
Celem niniejszego planu jest zapewnienie wysokiej jakości oprogramowania projektu "10x To-Do App", aplikacji do zarządzania zadaniami z zaawansowaną integracją asystentów AI. Głównym priorytetem jest weryfikacja poprawności reguł biznesowych dotyczących współpracy człowiek-AI, bezpieczeństwa danych (izolacja użytkowników) oraz stabilności interfejsu użytkownika.

## 2. Zakres testów

### W zakresie (In-Scope):
*   **Interfejs Użytkownika (Frontend):** Wszystkie widoki (Logowanie, Rejestracja, Dashboard, Szczegóły Projektu, Ustawienia).
*   **API (Backend):** Endpointy w `src/pages/api/` (Projekty, Zadania, Auth, AI-specific endpoints).
*   **Logika Biznesowa:** Usługi `TaskService` i `ProjectService`.
*   **Integracja z Bazą Danych:** Weryfikacja operacji CRUD i polityk bezpieczeństwa (RLS) w Supabase.
*   **Integracja AI:** Symulacja zachowań agenta AI (korzystanie z API Key, delegacja zadań, system propozycji).

### Poza zakresem (Out-of-Scope):
*   Testy wydajnościowe infrastruktury Supabase (zakładamy SLA dostawcy).
*   Testy "inteligencji" samego modelu AI (testujemy jedynie mechanizm komunikacji API i reguły dostępu, a nie jakość generowanych treści przez AI).

## 3. Typy testów do przeprowadzenia

1.  **Testy Jednostkowe (Unit Tests):** Skupione na usługach (`*.service.ts`) i helperach.
2.  **Testy Integracyjne API:** Weryfikacja endpointów REST i ich interakcji z bazą danych oraz Middleware.
3.  **Testy End-to-End (E2E):** Pełne scenariusze użytkownika w przeglądarce.
4.  **Testy Bezpieczeństwa:** Weryfikacja uprawnień, RLS i walidacji danych.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Moduł Uwierzytelniania i Zarządzania Kontem
| ID | Tytuł Scenariusza | Opis | Oczekiwany Rezultat |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Rejestracja nowego użytkownika | Próba rejestracji z poprawnym email/hasłem. | Konto utworzone w Supabase, użytkownik przekierowany do `/projects`. |
| **AUTH-02** | Walidacja formularza rejestracji | Rejestracja z hasłem < 8 znaków lub niezgodnymi hasłami. | Wyświetlenie błędu walidacji (Zod), brak zapytania do API. |
| **AUTH-03** | Dostęp do chronionych zasobów bez logowania | Próba wejścia na `/projects` bez sesji. | Przekierowanie do `/login`. |
| **AUTH-04** | Izolacja danych (RLS) | Użytkownik A próbuje pobrać projekty Użytkownika B przez API (znając ID). | Błąd 404 (Not Found) lub 403 (Forbidden) - zasób niewidoczny. |

### 4.2. Zarządzanie Projektami i Ustawienia
| ID | Tytuł Scenariusza | Opis | Oczekiwany Rezultat |
| :--- | :--- | :--- | :--- |
| **PROJ-01** | Tworzenie projektu | Utworzenie projektu przez modal. | Projekt pojawia się na liście, generowany jest `api_key`. |
| **PROJ-02** | Regeneracja klucza API | Użycie funkcji "Regenerate Key" w ustawieniach. | Stary klucz przestaje działać, nowy jest widoczny i zapisany w bazie. |
| **PROJ-03** | Danger Zone - Usuwanie projektu | Próba usunięcia projektu bez wpisania nazwy vs. z wpisaniem nazwy. | Przycisk usunięcia aktywny tylko po poprawnym wpisaniu nazwy. Projekt i powiązane zadania znikają. |

### 4.3. Zarządzanie Zadaniami (Human Workflow)
| ID | Tytuł Scenariusza | Opis | Oczekiwany Rezultat |
| :--- | :--- | :--- | :--- |
| **TASK-01** | Tworzenie zadania i podzadania | Dodanie zadania głównego, wejście w szczegóły, dodanie podzadania. | Zadania zapisane w bazie, widoczna hierarchia w UI (`parent_id`). |
| **TASK-02** | Edycja "In-Place" | Dwukrotne kliknięcie na zadanie i zmiana tytułu. | Zmiana zapisana, UI zaktualizowane (optimistic update), brak błędów w konsoli. |
| **TASK-03** | Reordering (Drag & Drop) | Przesunięcie zadania na liście (góra/dół). | Nowa pozycja (`position`) zapisana w bazie. Po odświeżeniu kolejność zachowana. |
| **TASK-04** | Optymistyczna aktualizacja przy błędzie | Zmiana statusu zadania przy symulowanym błędzie sieci (offline). | UI początkowo pokazuje zmianę, następnie cofa ją i wyświetla Toast z błędem. |

### 4.4. Workflow AI (Delegacja i Propozycje) - **KRYTYCZNE**
| ID | Tytuł Scenariusza | Opis | Oczekiwany Rezultat |
| :--- | :--- | :--- | :--- |
| **AI-01** | Delegacja zadania | Użytkownik klika ikonę robota (toggle delegation). | Flaga `is_delegated` = true. Ikona zmienia kolor. |
| **AI-02** | Blokada edycji dla AI (bez delegacji) | Próba edycji zadania przez API używając klucza API projektu, gdy `is_delegated` = false. | API zwraca błąd 403 (AuthorizationError). |
| **AI-03** | Tworzenie podzadań przez AI | AI tworzy podzadanie dla delegowanego zadania głównego. | Sukces. Podzadanie ma flagę `created_by_ai` = true. |
| **AI-04** | Propozycja zmiany statusu (Proposal) | AI wysyła request na `/tasks/{id}/propose-status` z nowym statusem i komentarzem. | Status zadania nie zmienia się na "Done", ale pojawia się flaga "Pending User Action". Komentarz widoczny w UI. |
| **AI-05** | Akceptacja propozycji AI | Użytkownik klika "Accept" przy propozycji AI. | Status zmienia się na docelowy (np. Done), UI odświeżone. |
| **AI-06** | Odrzucenie propozycji AI | Użytkownik klika "Reject" i podaje powód. | Status wraca do poprzedniego (np. In Progress), komentarz zwrotny zapisany. |
| **AI-07** | Próba zmiany statusu przez AI na "In Progress" | AI próbuje ustawić status inny niż Done/Canceled dla własnego podzadania. | API zwraca błąd walidacji (reguła biznesowa z `TaskService`). |

## 5. Środowisko testowe

*   **Lokalne (Localhost):**
    *   Baza danych: Lokalna instancja Supabase (Docker) lub projekt deweloperski w chmurze Supabase.
    *   Uruchomienie: `npm run dev`.
*   **Staging:**
    *   Wdrożenie na platformie hostingowej (np. Vercel/Netlify) podłączone do bazy stagingowej.
    *   Zmienne środowiskowe: Oddzielne `SUPABASE_URL` i klucze.

## 6. Narzędzia do testowania

*   **Testy Jednostkowe/Integracyjne:** `Vitest` (zgodny z ekosystemem Astro/Vite).
*   **Testy E2E:** `Playwright` (zalecany ze względu na dobrą obsługę asynchroniczności i wielu kontekstów przeglądarki).
*   **Testy API:** `Postman` lub `Bruno` (do testowania endpointów z nagłówkiem `X-API-Key` symulującym AI).
*   **Analiza Statyczna:** `ESLint`, `Prettier`, `tsc` (TypeScript Compiler) - uruchamiane przez `Husky` przed commitem.

## 7. Harmonogram testów

1.  **Faza 0: Analiza statyczna i Unit Testy** - Ciągła integracja (przy każdym Pull Request).
2.  **Faza 1: Testy API (Backend)** - Przed integracją frontendu, weryfikacja `TaskService` i uprawnień AI.
3.  **Faza 2: Testy Frontendowe (Komponenty)** - Weryfikacja formularzy i stanów UI.
4.  **Faza 3: Testy E2E i Manualne** - Weryfikacja pełnych ścieżek (Happy Path + Edge Cases) przed wydaniem wersji produkcyjnej.

## 8. Kryteria akceptacji testów

*   **Brak błędów krytycznych (Blocker/Critical):** Uniemożliwiających logowanie, zarządzanie zadaniami lub naruszających bezpieczeństwo danych (RLS).
*   **Pokrycie kodu (Code Coverage):** Minimum 80% dla `TaskService` i `ProjectService`.
*   **Testy E2E:** Przejście 100% zdefiniowanych scenariuszy "Happy Path".
*   **Bezpieczeństwo AI:** Potwierdzone testami negatywnymi, że AI nie może modyfikować zadań niedelegowanych.

## 9. Role i odpowiedzialności

*   **QA Engineer:** Tworzenie scenariuszy, automatyzacja testów E2E, testy manualne eksploracyjne, weryfikacja API.
*   **Backend Developer:** Unit testy serwisów, obsługa błędów API, implementacja RLS.
*   **Frontend Developer:** Unit testy komponentów, obsługa stanów ładowania i błędów w UI (Toasty).

## 10. Procedury raportowania błędów

Błędy zgłaszane w systemie śledzenia (np. GitHub Issues/Jira) powinny zawierać:
1.  **Tytuł:** Zwięzły opis problemu.
2.  **Środowisko:** (Lokalne/Staging, Przeglądarka).
3.  **Kroki do reprodukcji:** Dokładna lista czynności.
4.  **Oczekiwany rezultat vs Rzeczywisty rezultat.**
5.  **Logi:** Z konsoli przeglądarki lub serwera (jeśli dotyczy API).
6.  **Priorytet:** (Critical, High, Medium, Low).

</plan_testów>