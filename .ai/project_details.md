<conversation_summary>
  <decisions>
   1. Główna persona użytkownika: Produkt jest skierowany do programistów, którzy będą tworzyć własne skrypty i asystentów
       AI.
   2. Stany zadań: Zdefiniowano precyzyjny cykl życia zadania, w tym stany Do zrobienia, Zrealizowane, Anulowane,
      Zrealizowane, do akceptacji oraz Anulowane, do potwierdzenia. Każda propozycja zmiany statusu przez asystenta oraz
      odrzucenie przez użytkownika musi zawierać komentarz.
   3. Delegowanie zadań: Użytkownik deleguje zadanie za pomocą checkboxa. Delegowane zadanie jest zablokowane do edycji
      przez użytkownika, a delegacji nie można cofnąć, jeśli asystent rozpoczął pracę (stworzył pod-zadania).
   4. Hierarchia i zagnieżdżanie:
       * Użytkownik może tworzyć zadania o dowolnej głębokości zagnieżdżenia.
       * Asystent AI może tworzyć pod-zadania tylko do zadań mu delegowanych i nie może ich dalej zagnieżdżać (maksymalna
         głębokość dla zadań AI to 1 poziom).
   5. Struktura API:
       * API będzie zwracać całe drzewo zadań w odpowiedzi na zapytanie.
       * Dostępne będą dwa sposoby pobierania zadań przez asystenta: dedykowany endpoint dla zadań delegowanych oraz
         ogólny endpoint zwracający całą hierarchię z odpowiednimi flagami.
   6. Struktura UI: Interfejs użytkownika będzie przedstawiał hierarchię zadań w formie "drill-down" (jeden poziom na raz
      z przyciskami nawigacyjnymi), a nie jako w pełni rozwinięte drzewo. Zadania zrealizowane i anulowane będą domyślnie
      ukryte.
   7. Modyfikacja zadań: Zadania nie mogą być przenoszone między różnymi rodzicami, co eliminuje ryzyko tworzenia
      cyklicznych zależności. Stany Zrealizowane i Anulowane są ostateczne.
   8. Definicja projektu: Projekt składa się z nazwy, opisu, automatycznie generowanego klucza API oraz przypisania do
      właściciela (użytkownika).
   9. Metryki sukcesu: Projekt ma charakter treningowy, więc formalne wskaźniki KPI nie są wymagane dla MVP.
   10. Zakres MVP: Świadomie zrezygnowano z funkcji takich jak onboarding, zaawansowane powiadomienia i współdzielenie
       projektów na rzecz skupienia się na kluczowej pętli interakcji człowiek-AI.
  </decisions>

  <matched_recommendations>
   1. Zdefiniowanie wąskiej grupy docelowej: Użytkownik potwierdził, że idealnym użytkownikiem jest programista, co
      uprościło założenia dotyczące UX/UI.
   2. Precyzyjne zdefiniowanie stanów zadań: Dyskusja doprowadziła do stworzenia szczegółowej maszyny stanów, która
      stała się kluczowym elementem logiki aplikacji.
   3. Uproszczenie zarządzania kluczami API: Przyjęto rekomendację o jednym, unieważnialnym kluczu API na projekt dla
      MVP.
   4. Uproszczenie logiki poprzez stany ostateczne: Zaakceptowano, że stany Zrealizowane i Anulowane są nieodwracalne,
      co znacząco upraszcza logikę.
   5. Zdefiniowanie polityki usuwania danych: Ustalono zasady usuwania projektów i zadań, w tym blokadę usuwania zadań,
      nad którymi pracuje AI.
   6. Klarowny model uprawnień: Przyjęto zasadę, że twórca zadania jest jego właścicielem, ale właściciel projektu ma
      uprawnienia nadrzędne.
   7. Wybór technologii i wzorców: Zaakceptowano użycie standardowych wzorców REST dla API, tokenów JWT do autoryzacji
      oraz zagnieżdżonej struktury JSON do reprezentacji hierarchii.
   8. Minimalistyczny interfejs w MVP: Zgodzono się na użycie prostych wizualnych wskaźników (wcięcia, ikony) zamiast
      zaawansowanych systemów notyfikacji.
  </matched_recommendations>

  <prd_planning_summary>
  Celem projektu jest stworzenie narzędzia webowego do zarządzania zadaniami, które umożliwia efektywną współpracę
  między programistą a asystentem AI. Podsumowanie rozmów doprowadziło do zdefiniowania kluczowych wymagań dla MVP.

  a. Główne wymagania funkcjonalne produktu:
  Produkt umożliwi użytkownikom tworzenie projektów, z których każdy będzie posiadał unikalny klucz API. W ramach
  projektów użytkownicy będą mogli tworzyć hierarchiczne listy zadań. Kluczową funkcją będzie możliwość delegowania
  zadań asystentowi AI, który za pomocą REST API będzie mógł odczytywać delegowane zadania, tworzyć do nich własne
  pod-zadania (z ograniczeniem do jednego poziomu głębokości) i raportować postępy. System będzie obsługiwał
  precyzyjnie zdefiniowany cykl życia zadań, włączając w to stany wymagające akceptacji przez użytkownika (np.
  propozycja zakończenia lub anulowania zadania przez AI), z obowiązkowym polem na komentarz.

  b. Kluczowe historie użytkownika i ścieżki korzystania:
   * Ścieżka delegowania i realizacji: Użytkownik tworzy zadanie (np. "Analiza konkurencji"), deleguje je do AI.
     Asystent pobiera zadanie, dzieli je na pod-zadania (np. "Znajdź firmy X, Y, Z", "Sprawdź ceny"), realizuje je, a
     na końcu proponuje zamknięcie zadania nadrzędnego, co użytkownik akceptuje lub odrzuca z komentarzem.
   * Ścieżka propozycji anulowania: Asystent identyfikuje, że delegowane zadanie jest niemożliwe do wykonania lub
     koliduje z innym. Proponuje jego anulowanie wraz z uzasadnieniem. Użytkownik analizuje powód i podejmuje
     ostateczną decyzję.

  c. Ważne kryteria sukcesu i sposoby ich mierzenia:
  Ponieważ jest to projekt treningowy, formalne metryki nie są priorytetem. Kluczowe kryterium sukcesu dla MVP jest
  binarne: czy platforma umożliwia bezproblemowe przejście przez kluczowe historie użytkownika. Oznacza to, że
  użytkownik musi być w stanie stworzyć projekt i zadania, a zdalny asystent musi być w stanie odczytać delegowane
  zadanie, stworzyć do niego własną listę pod-zadań i zarządzać ich cyklem życia.

  d. Wszelkie nierozwiązane kwestie lub obszary wymagające dalszego wyjaśnienia:
  Wszystkie kluczowe kwestie strategiczne i funkcjonalne zostały rozwiązane. Dalsze wyjaśnienia będą dotyczyć
  szczegółów implementacyjnych.
  </prd_planning_summary>

  <unresolved_issues>
   1. Wydajność API przy głębokich zagnieżdżeniach: Użytkownik zdecydował, że API powinno zwracać całe drzewo zadań.
      Chociaż zdefiniowano ograniczenia dla AI, użytkownik wciąż może tworzyć bardzo głębokie struktury. Należy
      szczegółowo zaprojektować mechanizmy po stronie serwera (np. wydajne zapytania SQL), aby uniknąć problemów z
      wydajnością.
   2. Szczegóły implementacyjne UI: Zdecydowano o nawigacji typu "drill-down", ale dokładny mechanizm "przycisków
      nawigacyjnych" (np. breadcrumbs, historia nawigacji) wymaga dalszego doprecyzowania na etapie projektowania UX/UI.
   3. Szczegóły implementacyjne autoryzacji: Ustalono użycie loginu i hasła, ale konkretna implementacja (np.
      biblioteki, obsługa resetowania hasła) została odłożona na później.
  </unresolved_issues>
  </conversation_summary>