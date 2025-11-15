# Plan implementacji widoku Ustawień Projektu

## 1. Przegląd
Widok "Ustawienia Projektu" ma na celu umożliwienie właścicielowi projektu zarządzania jego podstawowymi danymi oraz kluczowymi aspektami bezpieczeństwa. Użytkownik będzie mógł edytować nazwę i opis projektu, zarządzać kluczem API (wyświetlanie, kopiowanie, regenerowanie) oraz usuwać projekt w bezpieczny sposób. Widok ten jest kluczowy dla realizacji historyjek użytkownika US-004 i US-005.

## 2. Routing widoku
Widok będzie dostępny pod dynamiczną ścieżką:
- **Ścieżka**: `/projects/[projectId]/settings`
- **Plik**: `src/pages/projects/[projectId]/settings.astro`

## 3. Struktura komponentów
Komponenty zostaną zaimplementowane w React i osadzone na stronie Astro. Hierarchia będzie następująca:

```
- ProjectSettingsPage.astro (Wrapper strony, pobiera dane serwerowo)
  - ProjectSettingsView.tsx (Główny komponent kliencki, zarządza stanem)
    - ProjectSettingsForm.tsx (Formularz edycji danych projektu)
      - ui/Input (dla nazwy i opisu)
      - ui/Button (do zapisu zmian)
    - ApiKeyManager.tsx (Sekcja zarządzania kluczem API)
      - ui/Input (do wyświetlania klucza)
      - ui/Button (ikony do pokazywania/ukrywania i kopiowania)
      - ui/Button (do regeneracji klucza)
      - ui/AlertDialog (potwierdzenie regeneracji klucza)
    - DangerZone.tsx (Sekcja z akcjami nieodwracalnymi)
      - ui/Button (do usuwania projektu)
      - ui/AlertDialog (potwierdzenie usunięcia projektu)
```

## 4. Szczegóły komponentów

### ProjectSettingsView.tsx
- **Opis**: Główny komponent React, który renderuje cały interfejs użytkownika ustawień. Otrzymuje początkowe dane projektu z Astro i zarządza całym stanem po stronie klienta za pomocą customowego hooka `useProjectSettings`.
- **Główne elementy**: `ProjectSettingsForm`, `ApiKeyManager`, `DangerZone`.
- **Obsługiwane interakcje**: Brak bezpośrednich, deleguje logikę do komponentów podrzędnych.
- **Typy**: `ProjectGetDetailsDto`.
- **Propsy**: `initialProject: ProjectGetDetailsDto`.

### ProjectSettingsForm.tsx
- **Opis**: Formularz umożliwiający edycję nazwy i opisu projektu.
- **Główne elementy**: Dwa komponenty `Input` (dla `name` i `description`) oraz `Button` "Zapisz zmiany".
- **Obsługiwane interakcje**:
    - `onChange` na polach input aktualizuje lokalny stan formularza.
    - `onSubmit` na formularzu wywołuje funkcję zapisu, która wykonuje żądanie `PUT /api/projects/[id]`.
- **Obsługiwana walidacja**:
    - `name`: Pole jest wymagane i nie może być puste. Przycisk "Zapisz zmiany" jest nieaktywny, jeśli nazwa jest pusta lub jeśli dane nie uległy zmianie.
- **Typy**: `ProjectUpdateCommand`.
- **Propsy**: `project: ProjectSettingsViewModel`, `onSave: (data: ProjectUpdateCommand) => void`, `isSaving: boolean`.

### ApiKeyManager.tsx
- **Opis**: Sekcja do zarządzania kluczem API. Wyświetla klucz (domyślnie zamaskowany) i udostępnia przyciski do interakcji.
- **Główne elementy**: `Input` (tylko do odczytu), trzy komponenty `Button` (pokaż/ukryj, kopiuj, regeneruj) oraz `AlertDialog` do potwierdzenia regeneracji.
- **Obsługiwane interakcje**:
    - Kliknięcie przycisku "Pokaż/Ukryj" zmienia widoczność klucza.
    - Kliknięcie przycisku "Kopiuj" kopiuje klucz do schowka.
    - Kliknięcie przycisku "Generuj nowy klucz" otwiera modal potwierdzający.
- **Typy**: `ProjectSettingsViewModel`.
- **Propsy**: `project: ProjectSettingsViewModel`, `onToggleVisibility: () => void`, `onCopy: () => void`, `onRegenerate: () => void`, `isRegenerating: boolean`.

### DangerZone.tsx
- **Opis**: Sekcja zawierająca akcje destrukcyjne, oddzielona wizualnie od reszty ustawień.
- **Główne elementy**: `Button` "Usuń projekt" oraz `AlertDialog` do potwierdzenia.
- **Obsługiwane interakcje**: Kliknięcie przycisku "Usuń projekt" otwiera modal z prośbą o potwierdzenie.
- **Typy**: Brak specyficznych.
- **Propsy**: `onDelete: () => void`, `isDeleting: boolean`, `projectName: string`.

## 5. Typy
Oprócz istniejących typów DTO (`ProjectGetDetailsDto`, `ProjectUpdateCommand`, `RegenerateApiKeyResultDto`), wprowadzony zostanie jeden nowy typ `ViewModel` do zarządzania stanem UI.

```typescript
// Typ ViewModel dla widoku ustawień projektu
interface ProjectSettingsViewModel {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  isApiKeyVisible: boolean; // Flaga UI do kontrolowania widoczności klucza
  createdAt: string;
}
```
- **`isApiKeyVisible`**: `boolean` - pole nieistniejące w DTO, które będzie przechowywać informację, czy użytkownik chce widzieć pełny klucz API.

## 6. Zarządzanie stanem
Zarządzanie stanem zostanie scentralizowane w customowym hooku `useProjectSettings`, aby uniknąć skomplikowanej logiki w komponencie `ProjectSettingsView`.

**`useProjectSettings(initialProject: ProjectGetDetailsDto)`**
- **Stan**:
    - `project: ProjectSettingsViewModel` - główny obiekt stanu widoku.
    - `formState: ProjectUpdateCommand` - stan edytowanych pól formularza.
    - `isLoading`, `isSaving`, `isRegenerating`, `isDeleting`: flagi `boolean` do obsługi stanu ładowania dla poszczególnych akcji.
    - `error: string | null` - do przechowywania i wyświetlania komunikatów o błędach.
- **Funkcje**:
    - `saveChanges()`: Wywołuje `PUT /api/projects/[id]`.
    - `toggleApiKeyVisibility()`: Zmienia flagę `isApiKeyVisible`.
    - `copyApiKey()`: Kopiuje klucz do schowka i wyświetla powiadomienie.
    - `regenerateApiKey()`: Wywołuje `POST /api/projects/[id]/regenerate-api-key`.
    - `deleteProject()`: Wywołuje `DELETE /api/projects/[id]` i przekierowuje po sukcesie.

## 7. Integracja API
Integracja z API będzie realizowana poprzez wywołania `fetch` w funkcjach hooka `useProjectSettings`.

- **Pobieranie danych**: `GET /api/projects/[id]`
    - Wywoływane po stronie serwera w pliku `settings.astro` i przekazywane jako `initialProject` do komponentu React.
    - **Typ odpowiedzi**: `ProjectGetDetailsDto`.
- **Aktualizacja projektu**: `PUT /api/projects/[id]`
    - **Typ żądania**: `ProjectUpdateCommand`.
    - **Typ odpowiedzi**: `ProjectUpdateResultDto`.
- **Regeneracja klucza**: `POST /api/projects/[id]/regenerate-api-key`
    - **Typ żądania**: Brak (puste body).
    - **Typ odpowiedzi**: `RegenerateApiKeyResultDto`.
- **Usuwanie projektu**: `DELETE /api/projects/[id]`
    - **Typ odpowiedzi**: `204 No Content`.

## 8. Interakcje użytkownika
- **Edycja formularza**: Użytkownik wpisuje dane, stan `formState` jest aktualizowany. Przycisk "Zapisz" staje się aktywny.
- **Zapis**: Po kliknięciu "Zapisz", przycisk jest blokowany, a loader jest pokazywany. Po sukcesie wyświetlany jest toast "Zapisano pomyślnie".
- **Kopiowanie klucza**: Po kliknięciu "Kopiuj", wyświetlany jest toast "Skopiowano do schowka".
- **Regeneracja klucza**: Użytkownik klika "Generuj nowy klucz", otwiera się modal. Po potwierdzeniu, akcja jest wykonywana. W przypadku sukcesu modal jest zamykany, a nowy klucz pojawia się w polu.
- **Usuwanie projektu**: Użytkownik klika "Usuń projekt", otwiera się modal. Dla bezpieczeństwa modal może wymagać wpisania nazwy projektu. Po potwierdzeniu i sukcesie, użytkownik jest przekierowywany na listę projektów.

## 9. Warunki i walidacja
- **Nazwa projektu**: Weryfikowane w `ProjectSettingsForm`. Pole nie może być puste. Przycisk zapisu jest nieaktywny, jeśli `formState.name.trim() === ''`.
- **Akcje destrukcyjne**: Weryfikacja odbywa się poprzez wymuszenie dodatkowego kroku w postaci modala (`AlertDialog`), co minimalizuje ryzyko przypadkowego wykonania akcji.

## 10. Obsługa błędów
- **Błąd pobierania danych**: Strona Astro powinna obsłużyć błąd 404 (brak projektu) lub 403 (brak dostępu) i wyświetlić odpowiednią stronę błędu.
- **Błąd zapisu/regeneracji/usunięcia**: Hook `useProjectSettings` przechwyci błąd z wywołania API. Błąd zostanie zapisany w stanie `error` i wyświetlony użytkownikowi za pomocą komponentu `Toast` lub bezpośrednio w modalu (w przypadku akcji destrukcyjnych). Formularz nie zostanie wyczyszczony, aby użytkownik mógł ponowić próbę.

## 11. Kroki implementacji
1.  **Stworzenie pliku strony**: Utworzenie pliku `src/pages/projects/[projectId]/settings.astro`. Implementacja logiki pobierania danych po stronie serwera (`Astro.props.id`) i przekazanie ich do komponentu React.
2.  **Główny komponent React**: Stworzenie `ProjectSettingsView.tsx`, który przyjmie dane z Astro i użyje `client:load`.
3.  **Implementacja hooka `useProjectSettings`**: Zdefiniowanie stanu i logiki dla wszystkich operacji (CRUD).
4.  **Komponent `ProjectSettingsForm`**: Budowa formularza z użyciem komponentów `Input` i `Button` z biblioteki `shadcn/ui`. Podłączenie logiki zapisu z hooka.
5.  **Komponent `ApiKeyManager`**: Implementacja logiki wyświetlania, maskowania, kopiowania i regeneracji klucza API. Użycie `AlertDialog` z `shadcn/ui` do potwierdzenia.
6.  **Komponent `DangerZone`**: Stworzenie sekcji z przyciskiem usuwania i podłączenie `AlertDialog` z prośbą o potwierdzenie.
7.  **Integracja i testowanie**: Połączenie wszystkich komponentów w `ProjectSettingsView`, upewnienie się, że stan jest poprawnie przekazywany i aktualizowany. Przetestowanie wszystkich interakcji, w tym ścieżek błędów.
8.  **Styling**: Dopracowanie wyglądu za pomocą Tailwind CSS, aby zapewnić spójność z resztą aplikacji, zwłaszcza dla "strefy zagrożenia".
9.  **Obsługa powiadomień**: Zintegrowanie komponentu `Toast` z `shadcn/ui` do wyświetlania informacji zwrotnych po akcjach użytkownika.
