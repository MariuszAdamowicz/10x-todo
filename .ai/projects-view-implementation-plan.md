# Plan implementacji widoku: Moje Projekty

## 1. Przegląd
Widok "Moje Projekty" jest głównym ekranem po zalogowaniu, który umożliwia użytkownikom przeglądanie listy swoich projektów oraz tworzenie nowych. Widok ten jest kluczowy dla nawigacji i zarządzania pracą w aplikacji. Implementacja obejmie wyświetlanie danych, obsługę stanu ładowania, stanu pustego oraz formularza do tworzenia nowego projektu w modalu.

## 2. Routing widoku
- **Ścieżka:** `/projects`
- **Dostęp:** Widok powinien być dostępny tylko dla zalogowanych użytkowników. Niezalogowani użytkownicy powinni być przekierowywani na stronę logowania.

## 3. Struktura komponentów
Widok zostanie zaimplementowany jako strona Astro (`.astro`), która renderuje główny komponent kliencki React (`.tsx`).

```
/src/pages/projects.astro
└── /src/components/views/ProjectsView.tsx
    ├── Button (z shadcn/ui, do otwierania modalu)
    ├── CreateProjectModal.tsx (komponent React)
    │   └── ProjectForm.tsx (formularz z walidacją)
    └── (Logika warunkowa)
        ├── if (isLoading) => ProjectListSkeleton.tsx
        ├── if (error) => ErrorDisplay.tsx
        ├── if (projects.length === 0) => EmptyState.tsx
        └── if (projects.length > 0) => ProjectList.tsx
                                         └── ProjectCard.tsx (mapowany)
```

## 4. Szczegóły komponentów

### `ProjectsView.tsx`
- **Opis:** Główny komponent React, który orkiestruje cały widok. Zarządza stanem (lista projektów, ładowanie, błędy), obsługuje logikę pobierania danych i renderuje odpowiednie komponenty podrzędne.
- **Główne elementy:** Komponent `Button` do tworzenia projektu, `CreateProjectModal` oraz komponenty do wyświetlania stanu (ładowanie, błąd, pusty, lista).
- **Obsługiwane interakcje:** Otwarcie modalu tworzenia projektu.
- **Typy:** `ProjectViewModel[]`
- **Propsy:** Brak.

### `ProjectList.tsx`
- **Opis:** Komponent odpowiedzialny za renderowanie listy projektów. Iteruje po tablicy projektów i renderuje dla każdego z nich komponent `ProjectCard`.
- **Główne elementy:** Kontener `div` lub `ul`, w którym mapowane są komponenty `ProjectCard`.
- **Obsługiwane interakcje:** Brak.
- **Typy:** `ProjectViewModel[]`
- **Propsy:** `projects: ProjectViewModel[]`

### `ProjectCard.tsx`
- **Opis:** Karta reprezentująca pojedynczy projekt. Wyświetla jego nazwę i opis. Cała karta jest klikalnym linkiem prowadzącym do szczegółów projektu. Zbudowana przy użyciu komponentu `Card` z `shadcn/ui`.
- **Główne elementy:** `Card`, `CardHeader`, `CardTitle`, `CardDescription` z `shadcn/ui`. Całość owinięta w tag `<a>`.
- **Obsługiwane interakcje:** Kliknięcie nawiguje do `/projects/[id]`.
- **Typy:** `ProjectViewModel`
- **Propsy:** `project: ProjectViewModel`

### `CreateProjectModal.tsx`
- **Opis:** Modal (dialog) zawierający formularz do tworzenia nowego projektu. Używa komponentu `Dialog` z `shadcn/ui`.
- **Główne elementy:** `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` oraz osadzony `ProjectForm`.
- **Obsługiwane interakcje:** Otwieranie/zamykanie modalu, przesyłanie formularza.
- **Typy:** `ProjectCreateCommand`
- **Propsy:** `isOpen: boolean`, `onOpenChange: (isOpen: boolean) => void`, `onSubmit: (data: ProjectCreateCommand) => Promise<void>`.

### `ProjectForm.tsx`
- **Opis:** Formularz do tworzenia projektu, używany wewnątrz `CreateProjectModal`. Wykorzystuje `react-hook-form` i `zod` do walidacji.
- **Główne elementy:** `form`, `Input` (dla nazwy), `Textarea` (dla opisu), `Button` (do wysłania).
- **Obsługiwana walidacja:**
    - `name`: Pole wymagane, nie może być puste. Komunikat: "Nazwa projektu jest wymagana."
    - `description`: Pole opcjonalne.
- **Typy:** `ProjectCreateCommand`
- **Propsy:** `onSubmit: (data: ProjectCreateCommand) => Promise<void>`, `isSubmitting: boolean`.

### `ProjectListSkeleton.tsx`
- **Opis:** Komponent wyświetlany podczas ładowania danych. Pokazuje kilka szarych "szkieletów" kart, aby zasygnalizować użytkownikowi, że dane są w drodze.
- **Główne elementy:** Kilka komponentów `Skeleton` z `shadcn/ui` ułożonych w layout kart.
- **Propsy:** Brak.

## 5. Typy

### DTO (Data Transfer Objects) - zgodne z API
```typescript
// DTO dla odpowiedzi z GET /projects
interface ProjectGetDto {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

// DTO dla ciała żądania POST /projects
interface ProjectCreateCommand {
  name: string;
  description: string | null;
}

// DTO dla odpowiedzi z POST /projects
interface ProjectCreateResultDto {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  api_key: string;
  created_at: string;
}
```

### ViewModel (dla UI)
```typescript
// Model widoku używany do renderowania w komponentach React
interface ProjectViewModel {
  id: string;
  name: string;
  description: string | null;
  href: string; // np. /projects/uuid-1234
}
```

## 6. Zarządzanie stanem
Zarządzanie stanem zostanie scentralizowane w niestandardowym hooku `useProjects`, który będzie używany w komponencie `ProjectsView`.

### `useProjects()`
- **Cel:** Abstrakcja logiki pobierania, tworzenia i cachowania projektów.
- **Zarządzany stan:**
    - `projects: ProjectViewModel[]`
    - `isLoading: boolean`
    - `error: Error | null`
- **Eksponowane funkcje:**
    - `createProject(data: ProjectCreateCommand): Promise<void>`: Wywołuje API `POST /projects` i aktualizuje lokalny stan `projects` bez potrzeby ponownego pobierania całej listy.
    - `refetch(): void`: Funkcja do manualnego ponownego pobrania projektów.

## 7. Integracja API
- **Pobieranie listy projektów:**
    - **Endpoint:** `GET /api/projects`
    - **Akcja:** Wywoływane przy pierwszym renderowaniu komponentu `ProjectsView` przez hook `useProjects`.
    - **Typ odpowiedzi:** `ProjectGetDto[]`
- **Tworzenie nowego projektu:**
    - **Endpoint:** `POST /api/projects`
    - **Akcja:** Wywoływane po pomyślnej walidacji i wysłaniu formularza w `CreateProjectModal`.
    - **Typ żądania:** `ProjectCreateCommand`
    - **Typ odpowiedzi:** `ProjectCreateResultDto`

## 8. Interakcje użytkownika
1.  **Wejście na stronę `/projects`**: Użytkownik widzi animację ładowania (`ProjectListSkeleton`), a następnie listę projektów lub komunikat o jej braku (`EmptyState`).
2.  **Kliknięcie "Utwórz nowy projekt"**: Otwiera się modal `CreateProjectModal`.
3.  **Wypełnienie i wysłanie formularza**:
    - **Poprawne dane**: Wywoływane jest API, przycisk "Zapisz" jest nieaktywny. Po sukcesie modal się zamyka, a nowy projekt pojawia się na górze listy.
    - **Niepoprawne dane**: Pod polem `name` pojawia się komunikat o błędzie walidacji.
4.  **Kliknięcie karty projektu**: Użytkownik jest przenoszony na stronę szczegółów projektu (`/projects/[id]`).

## 9. Warunki i walidacja
- **Walidacja formularza (klient):** W komponencie `ProjectForm` za pomocą `react-hook-form` i `zod`.
    - `name`: Musi być stringiem o długości co najmniej 1.
- **Stan interfejsu:**
    - Przycisk "Zapisz" w formularzu jest nieaktywny, jeśli nazwa jest pusta lub formularz jest w trakcie wysyłania.
    - Widok listy projektów jest zastępowany przez `ProjectListSkeleton` gdy `isLoading` jest `true`.
    - Komunikat o błędzie jest wyświetlany, gdy `error` nie jest `null`.

## 10. Obsługa błędów
- **Błąd pobierania projektów (`GET /api/projects`)**: W głównym widoku zostanie wyświetlony komunikat o błędzie, np. "Nie udało się załadować projektów", z opcjonalnym przyciskiem "Spróbuj ponownie", który wywoła funkcję `refetch`.
- **Błąd tworzenia projektu (`POST /api/projects`)**: Błąd zostanie wyświetlony wewnątrz modalu `CreateProjectModal`, np. nad przyciskiem "Zapisz". Formularz nie zostanie zamknięty, a przycisk "Zapisz" zostanie ponownie aktywowany.
- **Brak autoryzacji (401)**: Obsługa na poziomie globalnym (middleware lub layout), przekierowanie na stronę logowania.

## 11. Kroki implementacji
1.  **Stworzenie plików:** Utwórz pliki dla wszystkich zdefiniowanych komponentów: `projects.astro`, `ProjectsView.tsx`, `ProjectList.tsx`, `ProjectCard.tsx`, `CreateProjectModal.tsx`, `ProjectForm.tsx`, `ProjectListSkeleton.tsx`, `EmptyState.tsx`.
2.  **Zdefiniowanie typów:** W pliku `src/types.ts` dodaj definicje `ProjectViewModel`.
3.  **Implementacja hooka `useProjects`:** Stwórz logikę do pobierania i tworzenia projektów, zarządzania stanem `isLoading` i `error`.
4.  **Implementacja komponentu `ProjectsView`:** Zintegruj hook `useProjects` i zaimplementuj logikę warunkowego renderowania dla stanu ładowania, błędu, pustej listy i listy projektów. Dodaj przycisk otwierający modal.
5.  **Implementacja `ProjectList` i `ProjectCard`:** Stwórz komponenty do wyświetlania danych. Upewnij się, że `ProjectCard` jest linkiem do `/projects/[id]`.
6.  **Implementacja `CreateProjectModal` i `ProjectForm`:** Zbuduj formularz z użyciem `shadcn/ui`, `react-hook-form` i `zod` do walidacji po stronie klienta. Podłącz logikę przesyłania do funkcji `createProject` z hooka.
7.  **Implementacja `ProjectListSkeleton` i `EmptyState`:** Stwórz komponenty wizualne dla stanów ładowania i pustego.
8.  **Stworzenie strony `projects.astro`:** Utwórz stronę, która importuje i renderuje komponent `<ProjectsView client:load />`.
9.  **Stylowanie:** Użyj Tailwind CSS, aby dopracować wygląd wszystkich komponentów zgodnie z designem.
10. **Testowanie manualne:** Przetestuj wszystkie interakcje użytkownika, walidację formularza i obsługę błędów.
