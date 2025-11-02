### Główny problem
Narzędzie do tworzenia list zadań to-do, z udostępnionym protokołem REST do współpracy z asystentem.

### Najmniejszy zestaw funkcjonalności
- Prosty system kont użytkowników do przechowywania list projektów
- Uzytkownik może:
-- Tworzyć projekt. Automatycznie w tym projekcie tworzy się główna lista zadań. Tworzy się też klucz dostępu dla asystenta
-- Dodawać zadanie do listy. Każde zadanie domyślnie zyskuje status "do zrobienia". 
-- Szeregować swoje zadania
-- Oznaczać swoje zadania jako zrealizowane
-- Potwierdzić wykonanie zadania przez asystenta lub wyrzić sprzeciw (wtedy zadanie ponownie staje się "do zrobienia" dla asystenta)
-- Anulować swoje zadania
-- Może podzielić zadanie poprzez stworzenie wewnątrz nowej listy zadań.
-- Może przeglądać listę zadań utworzoną przez asystenta wewnątrz zadania
- Asystent za pomocą protokołu REST może:
-- Otrzymać hierarchię zadań do projektu z podziałem na zadania użytkownika i asystenta
-- Oznaczyć zadanie użytkownika jako zrealizowane lub anulowane (wymaga potwierdzenia przez użytkownika)
-- Utworzyć swoją listę zadań do jakiegoś innego zadania
-- Uszeregować zadania na swojej liście zadań
-- Oznaczyć swoje zadanie jako zrealizowane lub anulowane


### Co NIE wchodzi w zakres MVP
- Import logów/list/zadań z adresu url
- Współdzielenie list zadań między użytkownikami
- Integracje z innymi platformami edukacyjnymi
- Aplikacje mobilne (na początek tylko web)

### Kryteria sukcesu
- Użytkownik tworzy nowy projekt i tworzy kilka zadań do realizacji
- Zdalny asystent jest w stanie stworzyć własną listę do jednego z zadań, dodawać do niej zadania, szeregować je, oznaczać ich wykonanie
