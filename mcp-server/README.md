# 10x-Todo MCP Server

Ten serwer jest komponentem protokołu MCP (Model-Context-Protocol) dla aplikacji 10x-Todo. Działa jako usługa HTTP i udostępnia narzędzia, zasoby i prompty, które pozwalają asystentom AI na interakcję z API aplikacji 10x-Todo.

## Architektura

Serwer jest zbudowany przy użyciu `Express.js` i działa jako bezstanowa (stateless) usługa. Cała konfiguracja potrzebna do przetworzenia zapytania jest dynamicznie przekazywana w adresie URL.

## Uruchamianie

### Uruchamianie lokalne (zalecane)

Serwer jest częścią konfiguracji Docker Compose w głównym katalogu projektu. Aby go uruchomić razem z resztą aplikacji, wykonaj:

```bash
# W głównym katalogu projektu
docker-compose up -d
```

Serwer będzie dostępny pod adresem `http://localhost:8081`.

## API

Serwer udostępnia dwa główne endpointy.

### 1. Endpoint MCP

Główny endpoint do komunikacji z protokołem MCP.

- **URL:** `/:apiKey/:encodedApiUrl/mcp`
- **Metoda:** `POST`
- **Ciało Zapytania:** Obiekt JSON zgodny ze specyfikacją `McpRequest`.

**Parametry w ścieżce:**

- `apiKey` (string): Klucz API wygenerowany dla projektu w aplikacji 10x-Todo.
- `encodedApiUrl` (string): Adres URL głównego API 10x-Todo, **zakodowany w Base64**.

**Przykład użycia z `curl`:**

Załóżmy, że:
- `API_KEY` to `d1a2b3c4-e5f6-a7b8-c9d0-e1f2a3b4c5d6`
- `API_URL` to `http://host.docker.internal:8080/api`

Najpierw kodujemy URL:
```bash
 echo -n "http://host.docker.internal:8080/api" | base64
# Wynik: aHR0cDovL2hvc3QuZG9ja2VyLmludGVybmFsOjgwODAvYXBp
```

Teraz wysyłamy zapytanie (przykładowe ciało `McpRequest`):
```bash
curl -X POST \
  http://localhost:8081/d1a2b3c4-e5f6-a7b8-c9d0-e1f2a3b4c5d6/aHR0cDovL2hvc3QuZG9ja2VyLmludGVybmFsOjgwODAvYXBp/mcp \
  -H "Content-Type: application/json" \
  -d '{
        "id": "1",
        "jsonrpc": "2.0",
        "method": "list_tools"
      }'
```

### 2. Endpoint Health Check

Prosty endpoint do monitorowania stanu usługi.

- **URL:** `/health`
- **Metoda:** `GET`
- **Odpowiedź:** Status `200` z treścią `OK`.

## Testowanie

Aby uruchomić testy jednostkowe i integracyjne dla serwera, przejdź do katalogu `mcp-server` i wykonaj:

```bash
npm test
```
