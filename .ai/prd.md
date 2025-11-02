# Dokument wymagań produktu (PRD) - Aplikacja To-Do dla programistów i AI
## 1. Przegląd produktu
Celem projektu jest stworzenie narzędzia webowego do zarządzania zadaniami, które umożliwia efektywną współpracę między programistą (użytkownikiem) a asystentem AI. Aplikacja zapewni prosty system kont użytkowników do przechowywania projektów i list zadań. Kluczową funkcjonalnością będzie możliwość delegowania zadań asystentowi AI, który za pomocą dedykowanego API REST będzie mógł odczytywać delegowane zadania, tworzyć do nich własne pod-zadania i raportować postępy. Interakcja między użytkownikiem a asystentem będzie oparta na systemie propozycji i akceptacji zmian statusu zadań, co zapewni użytkownikowi pełną kontrolę nad procesem.

## 2. Problem użytkownika
Programiści, którzy tworzą własne skrypty automatyzujące lub asystentów AI, nie mają prostego, dedykowanego narzędzia do zarządzania zadaniami i delegowania ich do swoich cyfrowych asystentów. Obecne narzędzia do zarządzania zadaniami nie oferują otwartego API zaprojektowanego specjalnie do współpracy człowiek-maszyna. Brakuje platformy, która pozwoliłaby na łatwe tworzenie hierarchicznych list zadań, delegowanie ich części do wykonania przez kod, a następnie śledzenie i akceptowanie wyników pracy asystenta w ustrukturyzowany sposób.

## 3. Wymagania funkcjonalne
- F-01: System kont użytkowników: Użytkownicy muszą mieć możliwość rejestracji i logowania się do systemu w celu uzyskania dostępu do swoich projektów.
- F-02: Zarządzanie projektami: Użytkownik może tworzyć projekty. Każdy projekt zawiera nazwę, opis i jest przypisany do użytkownika.
- F-03: Klucz API: Dla każdego projektu automatycznie generowany jest unikalny klucz API, służący do uwierzytelniania asystenta AI.
- F-04: Hierarchiczne zadania: Użytkownicy mogą tworzyć zadania i dowolnie je zagnieżdżać, tworząc hierarchiczną strukturę.
- F-05: Delegowanie zadań: Użytkownik może delegować dowolne zadanie asystentowi AI. Delegowanego zadania nie można cofnąć, jeśli asystent rozpoczął nad nim pracę.
- F-06: Cykl życia zadania: Zadania mogą przyjmować następujące stany: "Do zrobienia", "Zrealizowane", "Anulowane", "Zrealizowane, do akceptacji", "Anulowane, do potwierdzenia". Stany "Zrealizowane" i "Anulowane" są ostateczne.
- F-07: Interfejs użytkownika (UI): Interfejs webowy będzie przedstawiał hierarchię zadań w formie "drill-down" (jeden poziom na raz). Zadania zrealizowane i anulowane będą domyślnie ukryte, z możliwością ich pokazania.
- F-08: Ograniczenia modyfikacji: Zadania nie mogą być przenoszone między różnymi rodzicami.
- F-09: Uprawnienia Asystenta AI (przez API):
    - Autoryzacja za pomocą klucza API.
    - Pobieranie całej hierarchii zadań projektu lub tylko zadań delegowanych.
    - Tworzenie pod-zadań wyłącznie do zadań delegowanych (co oznacza maksymalną głębokość 1 poziom).
    - Zmiana statusu własnych pod-zadań na "Zrealizowane" lub "Anulowane".
    - Proponowanie zmiany statusu zadania delegowanego na "Zrealizowane" lub "Anulowane" (wymaga akceptacji użytkownika i dołączenia komentarza).
- F-10: Akceptacja przez użytkownika: Użytkownik musi potwierdzić lub odrzucić (z komentarzem) propozycje asystenta dotyczące zmiany statusu zadania.

## 4. Granice produktu
Następujące funkcje i elementy nie wchodzą w zakres wersji MVP (Minimum Viable Product):
- Współdzielenie projektów i list zadań między różnymi użytkownikami.
- Zaawansowane systemy powiadomień (np. e-mail, push).
- Onboarding i samouczki dla nowych użytkowników.
- Import/eksport zadań z/do innych formatów lub adresów URL.
- Integracje z zewnętrznymi platformami i narzędziami.
- Aplikacje mobilne (projekt jest realizowany wyłącznie jako aplikacja webowa).
- Zaawansowane zarządzanie kluczami API (poza generowaniem jednego klucza na projekt).
- Implementacja resetowania hasła.
- Optymalizacja wydajności dla bardzo głębokich (ponad 10 poziomów) zagnieżdżeń zadań tworzonych przez użytkownika.

## 5. Historyjki użytkowników

### Uwierzytelnianie i Zarządzanie Kontem
- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu adresu e-mail i hasła, aby móc tworzyć i zarządzać swoimi projektami.
- Kryteria akceptacji:
    - Formularz rejestracji zawiera pola na e-mail i hasło.
    - System waliduje poprawność formatu adresu e-mail.
    - Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do panelu głównego.
    - W przypadku błędu (np. zajęty e-mail) wyświetlany jest czytelny komunikat.

- ID: US-002
- Tytuł: Logowanie użytkownika
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich projektów.
- Kryteria akceptacji:
    - Formularz logowania zawiera pola na e-mail i hasło.
    - Po poprawnym wprowadzeniu danych jestem zalogowany i przekierowany do panelu głównego.
    - W przypadku błędnych danych wyświetlany jest czytelny komunikat o nieprawidłowym loginie lub haśle.

### Zarządzanie Projektami
- ID: US-003
- Tytuł: Tworzenie nowego projektu
- Opis: Jako zalogowany użytkownik, chcę móc stworzyć nowy projekt, podając jego nazwę i opis, aby zorganizować w nim swoje zadania.
- Kryteria akceptacji:
    - W panelu głównym znajduje się przycisk "Utwórz nowy projekt".
    - Po kliknięciu pojawia się formularz z polami "Nazwa projektu" i "Opis".
    - Po utworzeniu projektu automatycznie generowany jest dla niego klucz API.
    - Nowo utworzony projekt pojawia się na mojej liście projektów.

- ID: US-004
- Tytuł: Przeglądanie szczegółów projektu i klucza API
- Opis: Jako właściciel projektu, chcę móc wyświetlić jego szczegóły, w tym klucz API, aby móc go użyć do konfiguracji mojego asystenta AI.
- Kryteria akceptacji:
    - Na liście projektów mogę kliknąć w projekt, aby zobaczyć jego szczegóły.
    - Na ekranie szczegółów widoczna jest nazwa, opis klucz API oraz lista zadań projektu.
    - Klucz API jest domyślnie częściowo ukryty, z opcją jego pełnego wyświetlenia.
    - Istnieje przycisk do skopiowania klucza API do schowka.

- ID: US-005
- Tytuł: Unieważnienie i ponowne generowanie klucza API
- Opis: Jako właściciel projektu, chcę mieć możliwość unieważnienia starego klucza API i wygenerowania nowego, aby zapewnić bezpieczeństwo w przypadku jego kompromitacji.
- Kryteria akceptacji:
    - W widoku szczegółów projektu znajduje się przycisk "Generuj nowy klucz".
    - Po kliknięciu i potwierdzeniu operacji, stary klucz API staje się nieważny.
    - Na jego miejsce generowany jest nowy, unikalny klucz API.

### Zarządzanie Zadaniami przez Użytkownika
- ID: US-006
- Tytuł: Tworzenie zadania na najwyższym poziomie
- Opis: Jako użytkownik, chcę móc dodać nowe zadanie do projektu, aby rozpocząć listę zadań do wykonania.
- Kryteria akceptacji:
    - W widoku projektu mogę dodać nowe zadanie.
    - Nowe zadanie domyślnie otrzymuje status "Do zrobienia".
    - Zadanie pojawia się na liście zadań w projekcie.

- ID: US-007
- Tytuł: Tworzenie pod-zadania (zagnieżdżanie)
- Opis: Jako użytkownik, chcę móc podzielić istniejące zadanie na mniejsze, tworząc w nim listę pod-zadań, aby lepiej zorganizować pracę.
- Kryteria akceptacji:
    - Przy każdym zadaniu istnieje opcja "Dodaj pod-zadanie".
    - Nowo utworzone pod-zadanie jest wizualnie zagnieżdżone pod swoim rodzicem.
    - Mogę tworzyć zadania na dowolnym poziomie zagnieżdżenia.

- ID: US-008
- Tytuł: Zmiana statusu zadania na "Zrealizowane"
- Opis: Jako użytkownik, chcę móc oznaczyć zadanie jako "Zrealizowane", aby odnotować jego ukończenie.
- Kryteria akceptacji:
    - Przy każdym zadaniu ze statusem "Do zrobienia" znajduje się opcja (np. checkbox) do oznaczenia go jako "Zrealizowane".
    - Po oznaczeniu, zadanie zmienia status na "Zrealizowane".
    - Zgodnie z ustawieniami widoku, zadanie może zostać ukryte.

- ID: US-009
- Tytuł: Zmiana statusu zadania na "Anulowane"
- Opis: Jako użytkownik, chcę móc oznaczyć zadanie jako "Anulowane", jeśli jego wykonanie nie jest już potrzebne.
- Kryteria akceptacji:
    - W opcjach zadania znajduje się przycisk "Anuluj".
    - Po potwierdzeniu, zadanie zmienia status na "Anulowane".
    - Zgodnie z ustawieniami widoku, zadanie może zostać ukryte.

- ID: US-010
- Tytuł: Zmiana kolejności zadań
- Opis: Jako użytkownik, chcę móc zmieniać kolejność zadań na tym samym poziomie hierarchii, aby priorytetyzować pracę.
- Kryteria akceptacji:
    - Interfejs umożliwia przeciąganie i upuszczanie zadań w obrębie tej samej listy (tego samego rodzica).
    - Zmiana kolejności jest trwale zapisywana.

- ID: US-011
- Tytuł: Delegowanie zadania do asystenta AI
- Opis: Jako użytkownik, chcę móc delegować zadanie do asystenta AI, aby mógł on rozpocząć nad nim pracę.
- Kryteria akceptacji:
    - Przy każdym zadaniu, które nie jest jeszcze delegowane, znajduje się opcja (np. checkbox) "Deleguj do AI".
    - Po delegowaniu, zadanie jest wizualnie oznaczone jako delegowane.
    - Zadanie staje się zablokowane do edycji dla mnie.

- ID: US-012
- Tytuł: Nawigacja po zagnieżdżonych zadaniach
- Opis: Jako użytkownik, chcę móc nawigować po strukturze zadań w trybie "drill-down", aby skupić się na jednym poziomie hierarchii naraz.
- Kryteria akceptacji:
    - Widzę tylko jeden poziom zadań w danym momencie.
    - Kliknięcie na zadanie, które ma pod-zadania, przenosi mnie do widoku tych pod-zadań.
    - Istnieje ścieżka nawigacyjna (breadcrumbs) lub przycisk "Wróć", aby cofnąć się na wyższy poziom.

### Interakcja Użytkownik-Asystent
- ID: US-013
- Tytuł: Akceptacja propozycji zrealizowania zadania
- Opis: Jako użytkownik, chcę widzieć, kiedy asystent AI proponuje zakończenie zadania i móc zaakceptować tę propozycję.
- Kryteria akceptacji:
    - Zadanie ze statusem "Zrealizowane, do akceptacji" jest wyraźnie oznaczone w interfejsie.
    - Widzę komentarz asystenta uzasadniający propozycję.
    - Mam przycisk "Akceptuj", który zmienia status zadania na "Zrealizowane".

- ID: US-014
- Tytuł: Odrzucenie propozycji zrealizowania zadania
- Opis: Jako użytkownik, chcę móc odrzucić propozycję asystenta AI dotyczącą zakończenia zadania i podać powód odrzucenia.
- Kryteria akceptacji:
    - Przy zadaniu ze statusem "Zrealizowane, do akceptacji" mam przycisk "Odrzuć".
    - Po kliknięciu "Odrzuć" pojawia się pole na wpisanie obowiązkowego komentarza.
    - Po zatwierdzeniu, status zadania wraca do "Do zrobienia", a mój komentarz jest zapisany.

- ID: US-015
- Tytuł: Akceptacja propozycji anulowania zadania
- Opis: Jako użytkownik, chcę widzieć, kiedy asystent AI proponuje anulowanie zadania i móc zaakceptować tę propozycję.
- Kryteria akceptacji:
    - Zadanie ze statusem "Anulowane, do potwierdzenia" jest wyraźnie oznaczone.
    - Widzę komentarz asystenta uzasadniający propozycję.
    - Mam przycisk "Akceptuj", który zmienia status zadania na "Anulowane".

- ID: US-016
- Tytuł: Odrzucenie propozycji anulowania zadania
- Opis: Jako użytkownik, chcę móc odrzucić propozycję asystenta AI dotyczącą anulowania zadania i podać powód.
- Kryteria akceptacji:
    - Przy zadaniu ze statusem "Anulowane, do potwierdzenia" mam przycisk "Odrzuć".
    - Po kliknięciu "Odrzuć" pojawia się pole na wpisanie obowiązkowego komentarza.
    - Po zatwierdzeniu, status zadania wraca do "Do zrobienia", a mój komentarz jest zapisany.

### Operacje Asystenta AI (przez API)
- ID: US-017
- Tytuł: Uwierzytelnienie asystenta
- Opis: Jako asystent AI, chcę móc uwierzytelnić się w API za pomocą klucza API projektu, aby uzyskać dostęp do zadań.
- Kryteria akceptacji:
    - API wymaga podania prawidłowego klucza API w nagłówku żądania.
    - Żądania bez klucza lub z nieprawidłowym kluczem są odrzucane z kodem błędu 401 Unauthorized.

- ID: US-018
- Tytuł: Pobranie delegowanych zadań
- Opis: Jako asystent AI, chcę móc wysłać żądanie do API, aby otrzymać listę wszystkich zadań, które zostały mi delegowane w danym projekcie.
- Kryteria akceptacji:
    - Istnieje endpoint API (np. `/api/projects/{id}/delegated-tasks`), który zwraca listę zadań.
    - Odpowiedź zawiera pełną strukturę delegowanych zadań, w tym ich ID, tytuł, opis i status.

- ID: US-019
- Tytuł: Pobranie całej hierarchii zadań
- Opis: Jako asystent AI, chcę mieć możliwość pobrania całej hierarchii zadań w projekcie, z oznaczeniem, które zadania są mi delegowane.
- Kryteria akceptacji:
    - Istnieje endpoint API (np. `/api/projects/{id}/tasks`), który zwraca całe drzewo zadań.
    - Każdy obiekt zadania w odpowiedzi zawiera flagę `isDelegatedToAI`.

- ID: US-020
- Tytuł: Tworzenie pod-zadania przez asystenta
- Opis: Jako asystent AI, chcę móc utworzyć nowe pod-zadanie w ramach zadania, które zostało mi delegowane.
- Kryteria akceptacji:
    - Mogę wysłać żądanie POST do API, aby utworzyć pod-zadanie dla zadania o podanym ID.
    - API zwraca błąd, jeśli próbuję dodać pod-zadanie do zadania, które nie jest mi delegowane.
    - API zwraca błąd, jeśli próbuję utworzyć zagnieżdżone pod-zadanie (na drugim poziomie głębokości).
    - Nowe zadanie jest poprawnie tworzone i przypisane do mnie jako twórcy.

- ID: US-021
- Tytuł: Zmiana statusu własnego pod-zadania
- Opis: Jako asystent AI, chcę móc zmienić status stworzonego przez siebie pod-zadania na "Zrealizowane" lub "Anulowane".
- Kryteria akceptacji:
    - Mogę wysłać żądanie PATCH/PUT do API, aby zaktualizować status mojego pod-zadania.
    - Zmiana statusu jest możliwa tylko dla zadań, których jestem twórcą.
    - API zwraca błąd, jeśli próbuję zmienić status zadania należącego do użytkownika.

- ID: US-022
- Tytuł: Propozycja zrealizowania zadania delegowanego
- Opis: Jako asystent AI, po ukończeniu pracy nad zadaniem delegowanym, chcę móc zaproponować użytkownikowi jego zamknięcie.
- Kryteria akceptacji:
    - Mogę wysłać żądanie do API, aby zmienić status zadania delegowanego na "Zrealizowane, do akceptacji".
    - Żądanie musi zawierać niepusty komentarz z uzasadnieniem.
    - API odrzuca żądanie, jeśli komentarz jest pusty.

- ID: US-023
- Tytuł: Propozycja anulowania zadania delegowanego
- Opis: Jako asystent AI, jeśli wykonanie zadania jest niemożliwe, chcę móc zaproponować użytkownikowi jego anulowanie.
- Kryteria akceptacji:
    - Mogę wysłać żądanie do API, aby zmienić status zadania delegowanego na "Anulowane, do potwierdzenia".
    - Żądanie musi zawierać niepusty komentarz z uzasadnieniem.
    - API odrzuca żądanie, jeśli komentarz jest pusty.

- ID: US-024
- Tytuł: Uszeregowanie własnych pod-zadań
- Opis: Jako asystent AI, chcę móc uszeregować moje pod-zadania "do zrobienia" wg priorytetu realizacji
- Kryteria akceptacji:
    - Mogę wysłać żądanie do API, aby zaproponować uszeregowanie moich pod-zadań.
    - Pod-zadania są szeregowane wg podanej kolejności.

## 6. Metryki sukcesu
Ponieważ jest to projekt o charakterze treningowym, formalne wskaźniki KPI nie są wymagane dla MVP. Sukces zostanie zmierzony w sposób binarny, poprzez weryfikację, czy kluczowe ścieżki użytkownika i asystenta działają bezbłędnie.
Kluczowe kryteria sukcesu dla MVP to:
1. Użytkownik jest w stanie pomyślnie utworzyć konto, zalogować się, stworzyć projekt i uzyskać klucz API.
2. Użytkownik jest w stanie tworzyć zadania, zagnieżdżać je i delegować do asystenta AI.
3. Zdalny asystent (symulowany przez skrypt lub narzędzie API) jest w stanie:
    - Uwierzytelnić się za pomocą klucza API.
    - Pobrać delegowane mu zadanie.
    - Utworzyć do niego listę własnych pod-zadań.
    - Oznaczyć swoje pod-zadania jako zrealizowane.
    - Zaproponować zamknięcie nadrzędnego, delegowanego zadania.
4. Użytkownik jest w stanie zobaczyć propozycję asystenta w interfejsie i ją zaakceptować lub odrzucić.
Pomyślne przejście przez powyższy cykl od początku do końca będzie oznaczać sukces wersji MVP.
