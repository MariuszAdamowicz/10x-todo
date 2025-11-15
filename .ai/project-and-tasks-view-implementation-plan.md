# Plan implementacji widoku Projektu i Zadań

## 1. Przegląd
Widok Projektu i Zadań jest centralnym interfejsem aplikacji do zarządzania hierarchiczną listą zadań w ramach jednego projektu. Umożliwia użytkownikom tworzenie, edycję, usuwanie i reorganizację zadań. Kluczową funkcją jest nawigacja w głąb struktury zadań (drill-down), delegowanie zadań do asystenta AI oraz zarządzanie cyklem życia propozycji zmian statusu zgłaszanych przez AI. Widok jest w pełni interaktywny, wykorzystuje mechanizmy "Optimistic UI" dla płynnego doświadczenia użytkownika i jest zbudowany z myślą o dostępności.

## 2. Routing widoku
Widok będzie dostępny pod dynamiczną ścieżką, która obsługuje zagnieżdżone zadania:
- **Ścieżka:** `/projects/[projectId]/tasks/[taskId]`
- **Parametry:**
    - `[projectId]`: Identyfikator UUID projektu.
    - `[taskId]`: Opcjonalny segment "catch-all" zawierający ID zadania nadrzędnego. Np. `/tasks/task2_id` będzie wyświetlać pod-zadania dla `task2_id`. Jeśli segment jest pusty, wyświetlane są zadania najwyższego poziomu.

## 3. Struktura komponentów
Hierarchia komponentów została zaprojektowana w celu oddzielenia logiki serwerowej (Astro) od interaktywności klienta (React).

```
- ProjectTasksView (Astro Page: /src/pages/projects/[projectId]/tasks/[taskId].astro)
  - Layout (Astro)
    - Header (Astro/React)
      - Breadcrumbs (React)
    - MainContent
      - TaskList (React)
        - TaskListHeader (React)
          - AddTaskForm (React)
        - TaskItem (React)
          - Checkbox (do zmiany statusu)
          - TaskTitle (edytowalny tytuł)
          - ActionButtons (React)
            - Button (Deleguj)
            - Button (Dodaj pod-zadanie)
            - DropdownMenu (Anuluj, etc.)
          - ProposalNotification (React)
            - Button (Akceptuj)
            - Button (Odrzuć -> otwiera Dialog)
        - TaskListSkeleton (React)
      - RejectProposalDialog (React)
      - Toaster/Sonner (React, globalny)
```

## 4. Szczegóły komponentów

### `ProjectTasksView.astro` (Strona Astro)
- **Opis:** Główny plik strony. Odpowiada za logikę po stronie serwera: parsowanie parametrów URL (`projectId`, `taskId`), pobieranie początkowych danych (dane projektu, zadania dla danego poziomu, dane do breadcrumbs) oraz renderowanie komponentu `TaskList` z przekazaniem mu początkowych danych.
- **Główne elementy:** Komponent `Layout.astro`, komponent `<TaskList client:load />`.
- **Obsługiwane interakcje:** Brak (renderowanie po stronie serwera).
- **Typy:** `Project`, `Task[]`, `IBreadcrumb[]`.
- **Propsy:** Brak (jest to strona, a nie komponent).

### `Breadcrumbs` (React)
- **Opis:** Wyświetla ścieżkę nawigacyjną od nazwy projektu do bieżącego poziomu zagnieżdżenia zadań. Ostatni element nie jest linkiem.
- **Główne elementy:** Lista linków (`<a>`) i tekst. Użycie komponentu `Breadcrumb` z Shadcn/ui.
- **Obsługiwane interakcje:** Kliknięcie na element ścieżki nawiguje do odpowiedniego poziomu.
- **Typy:** `IBreadcrumb[]`.
- **Propsy:** `items: IBreadcrumb[]`.

### `TaskList` (React)
- **Opis:** Główny komponent interaktywny. Zarządza stanem listy zadań, obsługuje operacje CRUD, delegowanie i zmianę kolejności. Renderuje listę komponentów `TaskItem` i implementuje logikę drag-and-drop.
- **Główne elementy:** Kontener dla `dnd-kit`, `TaskListHeader`, `TaskListSkeleton`, mapowanie `TaskItem`.
- **Obsługiwane interakcje:** Dodawanie zadania, zmiana kolejności zadań (drag-and-drop).
- **Typy:** `TaskViewModel[]`.
- **Propsy:** `initialTasks: TaskViewModel[]`, `projectId: string`, `parentId: string | null`.

### `TaskItem` (React)
- **Opis:** Reprezentuje pojedyncze zadanie. Wyświetla tytuł, status i przyciski akcji. Jego wygląd i dostępne akcje zależą od stanu zadania (np. zablokowany po delegacji, wyświetla panel propozycji).
- **Główne elementy:** `Checkbox`, `Input` (dla edycji tytułu), `Button`, `DropdownMenu` z Shadcn/ui, `ProposalNotification`.
- **Obsługiwane interakcje:**
    - Zmiana statusu na "Zrealizowane".
    - Edycja tytułu.
    - Delegowanie do AI.
    - Dodawanie pod-zadania.
    - Anulowanie zadania.
    - Akceptacja/odrzucenie propozycji AI.
    - Nawigacja do pod-zadań.
- **Obsługiwana walidacja:** Akcje są blokowane, jeśli `task.is_delegated === true` lub `task.isMutating === true`.
- **Typy:** `TaskViewModel`.
- **Propsy:** `task: TaskViewModel`, `onUpdate: (id, data) => void`, `onNavigate: (id) => void`, ... (wszystkie akcje przekazywane z `useTasks`).

### `RejectProposalDialog` (React)
- **Opis:** Modal (okno dialogowe) do wprowadzania powodu odrzucenia propozycji AI.
- **Główne elementy:** Komponent `Dialog` z Shadcn/ui, `Textarea`, `Button`.
- **Obsługiwane interakcje:** Wpisywanie tekstu, wysłanie formularza.
- **Obsługiwana walidacja:** Przycisk "Odrzuć" jest nieaktywny, jeśli pole komentarza jest puste.
- **Typy:** `taskRejectProposalSchema`.
- **Propsy:** `isOpen: boolean`, `onClose: () => void`, `onSubmit: (comment: string) => void`.

## 5. Typy
Do implementacji widoku potrzebne będą następujące struktury danych:

- **`Task` (DTO):** Typ danych bezpośrednio z API, zdefiniowany w `src/types.ts`.
- **`IBreadcrumb`:**
  ```typescript
  export interface IBreadcrumb {
    name: string;
    href: string;
    current?: boolean;
  }
  ```
- **`TaskViewModel` (ViewModel):** Rozszerza DTO `Task` o pola potrzebne do zarządzania stanem UI.
  ```typescript
  import type { Task, TaskComment } from '@/types';

  export interface TaskViewModel extends Task {
    // Status dla Optimistic UI
    isMutating?: boolean; // Czy trwa operacja na tym zadaniu?
    isError?: boolean;     // Czy ostatnia operacja zakończyła się błędem?
    
    // Pola pochodne ułatwiające renderowanie
    isPendingUserAction?: boolean; // Czy status to 4 lub 5?
    aiProposalComment?: TaskComment; // Ostatni komentarz od AI, jeśli status jest "pending"
  }
  ```
  - `isMutating`: Służy do wyświetlania wskaźników ładowania i blokowania interfejsu dla konkretnego zadania.
  - `isError`: Umożliwia oznaczenie zadania, którego optymistyczna aktualizacja się nie powiodła.
  - `isPendingUserAction`: Flaga pochodna od `status_id`, upraszczająca warunkowe renderowanie panelu propozycji AI.
  - `aiProposalComment`: Przechowuje obiekt komentarza AI, aby łatwo wyświetlić jego treść w panelu propozycji.

## 6. Zarządzanie stanem
Zarządzanie stanem zostanie scentralizowane w niestandardowym hooku `useTasks`, aby zamknąć w nim całą logikę i ułatwić ponowne wykorzystanie.

- **`useTasks(initialTasks, projectId, parentId)`**
  - **Cel:** Zarządzanie listą zadań (`TaskViewModel[]`), w tym operacjami CRUD, zmianą kolejności i obsługą "Optimistic UI".
  - **Stan wewnętrzny:**
    - `tasks: TaskViewModel[]`: Aktualna lista zadań do wyświetlenia.
    - `isLoading: boolean`: Czy trwa początkowe ładowanie listy.
    - `error: Error | null`: Globalny błąd (np. błąd pobierania listy).
  - **Zwracane akcje:**
    - `addTask(title: string)`
    - `updateTask(taskId: string, data: Partial<TaskViewModel>)`
    - `reorderTasks(newOrder: { id: string; order: number }[])`
    - `acceptProposal(taskId: string)`
    - `rejectProposal(taskId: string, comment: string)`
  - **Logika "Optimistic UI":** Każda akcja modyfikująca natychmiast aktualizuje lokalny stan `tasks` i ustawia `isMutating: true`. Po otrzymaniu odpowiedzi z API, stan jest synchronizowany z danymi serwera. W przypadku błędu, stan jest przywracany do poprzedniej wartości, a użytkownik jest informowany za pomocą `Toast`.

## 7. Integracja API
Integracja z API będzie realizowana poprzez wywołania `fetch` wewnątrz hooka `useTasks`.

| Akcja Użytkownika | Metoda Hooka | Endpoint API | Typ Żądania | Typ Odpowiedzi |
| :--- | :--- | :--- | :--- | :--- |
| Wyświetlenie listy | `useEffect` w `useTasks` | `GET /api/tasks` | `GetTasksQuerySchema` | `Task[]` |
| Dodanie zadania | `addTask` | `POST /api/tasks` | `TaskCreateSchema` | `Task` |
| Aktualizacja zadania | `updateTask` | `PATCH /api/tasks/{id}` | `TaskUpdateSchema` | `Task` |
| Zmiana kolejności | `reorderTasks` | `POST /api/tasks/reorder` | `ReorderTasksDtoSchema` | `204 No Content` |
| Akceptacja propozycji | `acceptProposal` | `POST /api/tasks/{id}/accept-proposal` | - | `Task` |
| Odrzucenie propozycji | `rejectProposal` | `POST /api/tasks/{id}/reject-proposal` | `taskRejectProposalSchema` | `Task` |

## 8. Interakcje użytkownika
- **Dodawanie zadania:** Użytkownik wpisuje tytuł w `AddTaskForm` i klika "Dodaj". Zadanie pojawia się optymistycznie na liście.
- **Zmiana statusu:** Użytkownik klika `Checkbox` przy zadaniu. Zadanie jest oznaczane jako ukończone (np. przekreślone).
- **Zmiana kolejności:** Użytkownik przeciąga zadanie na nową pozycję. Lista aktualizuje się natychmiast. Alternatywnie, używa przycisków "Przesuń w górę/dół" dostępnych z klawiatury.
- **Delegowanie:** Kliknięcie przycisku "Deleguj" blokuje zadanie do edycji i wizualnie je oznacza.
- **Nawigacja:** Kliknięcie tytułu zadania, które ma pod-zadania, powoduje przejście do widoku tych pod-zadań i aktualizację `Breadcrumbs`.
- **Akceptacja/Odrzucenie:** W panelu propozycji AI użytkownik klika "Akceptuj" lub "Odrzuć". Odrzucenie otwiera `RejectProposalDialog`.

## 9. Warunki i walidacja
- **`AddTaskForm`:** Przycisk "Dodaj" jest nieaktywny, jeśli pole tytułu jest puste.
- **`TaskItem`:**
    - Wszystkie przyciski akcji (poza akceptacją/odrzuceniem propozycji) są nieaktywne, jeśli `task.is_delegated` jest `true`.
    - Wszystkie przyciski są nieaktywne, jeśli `task.isMutating` jest `true`.
- **`RejectProposalDialog`:** Przycisk "Odrzuć" jest nieaktywny, jeśli pole komentarza jest puste.

## 10. Obsługa błędów
- **Błąd pobierania listy zadań:** Komponent `TaskList` wyświetla komunikat o błędzie z przyciskiem "Spróbuj ponownie".
- **Błąd operacji (CRUD, reorder):**
    - Wyświetlany jest globalny `Toast` (np. z biblioteki `Sonner`) z komunikatem błędu.
    - Stan UI jest przywracany do stanu sprzed operacji (rollback w `useTasks`).
    - Na elemencie `TaskItem`, którego dotyczył błąd, można opcjonalnie wyświetlić ikonę błędu.
- **Błędy autoryzacji (`401`, `403`):** Globalny mechanizm obsługi błędów API powinien przekierować użytkownika do strony logowania lub wyświetlić odpowiedni komunikat.
- **Błąd `409 Conflict`:** Wyświetlany jest `Toast` z informacją, że stan zasobu uległ zmianie. Zalecane jest odświeżenie danych w widoku.

## 11. Kroki implementacji
1.  **Struktura plików:** Utworzenie pliku strony `src/pages/projects/[projectId]/tasks/[...taskId].astro`. Utworzenie folderu `src/components/tasks` na komponenty React.
2.  **Strona Astro:** Implementacja logiki pobierania danych po stronie serwera w `ProjectTasksView.astro`. Parsowanie `projectId` i `...taskId` w celu określenia `parentId`.
3.  **Komponenty statyczne:** Stworzenie komponentu `Breadcrumbs` i przekazanie do niego danych z Astro.
4.  **Główny komponent `TaskList`:** Stworzenie szkieletu komponentu `TaskList`, który przyjmuje `initialTasks` i inne propsy z Astro.
5.  **Hook `useTasks`:** Implementacja hooka `useTasks` z podstawową logiką stanu (`tasks`, `isLoading`) i akcją `addTask` z "Optimistic UI".
6.  **Komponent `TaskItem`:** Stworzenie komponentu `TaskItem` renderującego dane z `TaskViewModel`. Implementacja zmiany statusu i edycji tytułu.
7.  **Pozostałe akcje:** Stopniowe dodawanie kolejnych akcji do `useTasks` (`updateTask`, `reorderTasks`, `acceptProposal`, `rejectProposal`) i podłączanie ich do `TaskItem`.
8.  **Drag-and-Drop:** Integracja biblioteki `dnd-kit` w `TaskList` w celu implementacji zmiany kolejności. Dodanie obsługi z klawiatury.
9.  **Komponenty pomocnicze:** Implementacja `ProposalNotification`, `RejectProposalDialog` i `TaskListSkeleton`.
10. **Stylowanie i dostępność:** Dopracowanie stylów za pomocą Tailwind CSS zgodnie z systemem Shadcn/ui. Zapewnienie zgodności z ARIA dla wszystkich interaktywnych elementów.
11. **Obsługa błędów i przypadków brzegowych:** Implementacja wyświetlania `Toast` dla błędów API i obsługa stanów ładowania/błędu w komponentach.
12. **Testowanie:** Ręczne przetestowanie wszystkich historyjek użytkownika (US-006 do US-016) w celu weryfikacji poprawności działania.
