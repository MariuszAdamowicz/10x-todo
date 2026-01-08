# Plan Testów Projektu: 10x To-Do App

## 1. Wprowadzenie i Cele
Celem niniejszego planu jest zapewnienie wysokiej jakości oprogramowania dla aplikacji "10x To-Do App". Projekt jest narzędziem do zarządzania zadaniami, umożliwiającym współpracę programistów z asystentami AI. Głównym celem testów jest weryfikacja poprawności działania kluczowych funkcjonalności, bezpieczeństwa danych (w szczególności separacji uprawnień User/AI) oraz stabilności API.

## 2. Zakres Testów
Plan obejmuje testowanie:
*   **Interfejsu Użytkownika (Web):** Logowanie, rejestracja, zarządzanie projektami i zadaniami.
*   **REST API:** Endpointy służące do komunikacji frontend-backend oraz komunikacji z agentami AI.
*   **Logiki Biznesowej:** Serwisy (`ProjectService`, `TaskService`) oraz walidacja danych (Zod).
*   **Integracji z Bazą Danych:** Poprawność zapytań i procedur RPC w Supabase.
*   **Bezpieczeństwa:** Mechanizmy autentykacji (Sesja, API Key) i autoryzacji (RLS, Middleware).

**Wyłączenia z zakresu:**
*   Testy wydajnościowe pod ekstremalnym obciążeniem (chyba że zajdzie taka potrzeba).
*   Aplikacje mobilne (nie są częścią MVP).
*   Testy zewnętrzne usług trzecich (Supabase availability), zakładamy ich dostępność.

## 3. Typy Testów

### 3.1. Testy Jednostkowe (Unit Tests)
*   **Cel:** Weryfikacja izolowanej logiki biznesowej i funkcji pomocniczych.
*   **Obszar:**
    *   `src/lib/utils.ts` (np. funkcja `cn`).
    *   `src/lib/schemas/*.ts` (Walidacja schematów Zod - czy odrzucają niepoprawne dane).
    *   Komponenty UI bez skutków ubocznych (np. `Badge`, `Button`, `ThemeToggle`).

### 3.2. Testy Integracyjne (Integration Tests)
*   **Cel:** Weryfikacja współpracy między modułami (Serwis <-> Baza Danych, API Endpoint <-> Serwis).
*   **Obszar:**
    *   `ProjectService` i `TaskService`: Testowanie metod CRUD z wykorzystaniem lokalnej instancji Supabase lub mocków bazy danych. Sprawdzenie obsługi błędów (`ProjectNotFoundError`, `AuthorizationError`).
    *   Endpointy API (`src/pages/api/`): Weryfikacja kodów odpowiedzi HTTP (200, 201, 400, 401, 403, 404) w zależności od danych wejściowych i nagłówków.

### 3.3. Testy End-to-End (E2E)
*   **Cel:** Symulacja pełnych ścieżek użytkownika w przeglądarce.
*   **Obszar:**
    *   Scenariusze: Rejestracja -> Logowanie -> Utworzenie Projektu -> Dodanie Zadania -> Wylogowanie.
    *   Interakcje: Drag & Drop zadań, edycja tytułów inline, delegowanie zadań.

## 4. Scenariusze Testowe

### 4.1. Autentykacja i Autoryzacja (Critical)
| ID | Scenariusz | Oczekiwany Rezultat |
|:---|:---|:---|
| AUTH-01 | Rejestracja nowego użytkownika z poprawnymi danymi | Konto utworzone, użytkownik przekierowany do `/projects`. |
| AUTH-02 | Próba rejestracji z istniejącym e-mailem | Błąd 409 lub komunikat "User already exists". |
| AUTH-03 | Logowanie z niepoprawnym hasłem | Błąd 401, komunikat o błędnych danych. |
| AUTH-04 | Dostęp do `/projects` bez logowania | Przekierowanie do `/login`. |
| AUTH-05 | Dostęp do API `/api/projects` bez ciasteczka sesyjnego | Odpowiedź 401 Unauthorized. |
| AUTH-06 | Użycie poprawnego `X-API-Key` w nagłówku do API zadań | Dostęp przyznany, kontekst ustawiony na projekt powiązany z kluczem. |
| AUTH-07 | Użycie błędnego `X-API-Key` | Odpowiedź 401 Unauthorized. |

### 4.2. Zarządzanie Projektami
| ID | Scenariusz | Oczekiwany Rezultat |
|:---|:---|:---|
| PROJ-01 | Tworzenie projektu (nazwa, opis) | Projekt widoczny na liście, klucz API wygenerowany w tle. |
| PROJ-02 | Edycja nazwy projektu | Zmiana widoczna na liście i w szczegółach. |
| PROJ-03 | Regeneracja klucza API | Stary klucz przestaje działać, nowy jest wyświetlany. |
| PROJ-04 | Usunięcie projektu (Danger Zone) | Projekt znika, powiązane zadania są usuwane (cascade delete). |

### 4.3. Zarządzanie Zadaniami (User Flow)
| ID | Scenariusz | Oczekiwany Rezultat |
|:---|:---|:---|
| TASK-01 | Dodanie zadania głównego | Zadanie pojawia się na dole listy ze statusem "To Do". |
| TASK-02 | Zmiana statusu na "Done" (checkbox) | Zadanie oznaczone jako wykonane (przekreślone). |
| TASK-03 | Reorder zadań (Drag & Drop) | Nowa kolejność zachowana po odświeżeniu strony (`position` updated). |
| TASK-04 | Delegowanie zadania do AI (toggle) | Ikona zmienia się na robota, pole `is_delegated` = true. |
| TASK-05 | Anulowanie zadania | Status zmienia się na "Canceled", zadanie wyszarzone. |
| TASK-06 | Zagnieżdżanie (tworzenie sub-taska) | Widoczna struktura rodzic-dziecko w szczegółach zadania. |

### 4.4. Interakcja z AI (API Contract & Logic)
| ID | Scenariusz | Oczekiwany Rezultat |
|:---|:---|:---|
| AI-01 | AI pobiera zadania dla swojego projektu | Zwrócona lista zadań tylko dla danego `project_id`. |
| AI-02 | AI próbuje edytować zadanie NIEDELEGOWANE | Błąd 403 Forbidden. |
| AI-03 | AI tworzy sub-task dla delegowanego zadania | Sub-task utworzony, `created_by_ai` = true. |
| AI-04 | AI proponuje zmianę statusu na "Done" (`POST /propose-status`) | Status zadania zmienia się na "Done, pending acceptance" (4), dodany komentarz. |
| AI-05 | AI próbuje zmienić status bezpośrednio (`PATCH`) na zadaniu usera | Błąd 403 Forbidden (musi użyć `propose-status`). |
| AI-06 | User akceptuje propozycję AI | Status zmienia się na "Done" (2). |
| AI-07 | User odrzuca propozycję AI z komentarzem | Status wraca do "To Do" (1) lub "In Progress", komentarz zapisany. |

## 5. Środowisko Testowe
*   **Development:** Lokalne środowisko z uruchomionym Supabase (Docker) i serwerem Astro (`npm run dev`).
*   **CI (Continuous Integration):** GitHub Actions uruchamiające lintery i testy jednostkowe przy każdym Pull Request.
*   **Baza Danych Testowa:** Osobny projekt Supabase lub zresetowana baza lokalna przed uruchomieniem testów E2E/Integracyjnych.

## 6. Narzędzia do Testowania
*   **Vitest:** Do testów jednostkowych i integracyjnych (logika serwisów, utils).
*   **Playwright:** Do testów E2E (scenariusze przeglądarkowe).
*   **Postman / Insomnia / cURL:** Do manualnego testowania API i symulowania zapytań AI.
*   **Supabase CLI:** Do testowania migracji bazy danych i typów.
*   **Zod:** Wbudowana walidacja schematów, służy jako pierwsza linia obrony (testy poprawności danych).

## 7. Harmonogram Testów
1.  **Faza 1 (Setup):** Konfiguracja Vitest i Playwright. Stworzenie helperów do mockowania bazy danych.
2.  **Faza 2 (Unit/Integration):** Pokrycie testami serwisów `TaskService` i `ProjectService` (szczególnie logiki uprawnień).
3.  **Faza 3 (API Testing):** Testy endpointów AI (symulacja agenta).
4.  **Faza 4 (E2E):** Implementacja kluczowych ścieżek użytkownika (Happy Path).
5.  **Faza 5 (Regression):** Uruchamianie pełnego zestawu testów przed każdym wydaniem.

## 8. Kryteria Akceptacji Testów
*   Wszystkie testy automatyczne (Unit, Integration) muszą przechodzić (100% pass rate).
*   Pokrycie kodu (Code Coverage) dla kluczowych serwisów (`src/lib/services`) > 80%.
*   Brak błędów krytycznych (blokujących główne funkcjonalności) w testach E2E.
*   Poprawna walidacja typów TypeScript (`npm run typecheck`) i brak błędów lintera (`npm run lint`).

## 9. Role i Odpowiedzialności
*   **Programista:** Pisanie testów jednostkowych dla tworzonego kodu, uruchamianie testów przed commitem (`husky pre-commit`).
*   **QA Engineer:** Tworzenie scenariuszy testowych, pisanie testów E2E, weryfikacja manualna przypadków brzegowych, audyt bezpieczeństwa API.

## 10. Procedury Raportowania Błędów
Błędy należy zgłaszać w systemie śledzenia zadań (np. GitHub Issues) z następującymi informacjami:
1.  **Tytuł:** Zwięzły opis błędu.
2.  **Kroki do reprodukcji:** Dokładna instrukcja jak wywołać błąd.
3.  **Oczekiwany rezultat:** Jak system powinien się zachować.
4.  **Rzeczywisty rezultat:** Jak system się zachował (screenshoty, logi z konsoli, odpowiedzi API).
5.  **Środowisko:** Przeglądarka, wersja systemu, czy błąd występuje lokalnie czy na produkcji.
6.  **Priorytet:** Critical / High / Medium / Low.
