# Etap 1: Builder - kompilacja serwera MCP
ARG NODE_VERSION=22.14.0
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /app

# Instalacja zależności
COPY mcp-server/package.json mcp-server/package-lock.json* ./mcp-server/
RUN cd mcp-server && npm ci

# Kopiowanie kodu źródłowego i kompilacja
COPY mcp-server/ ./mcp-server/
RUN cd mcp-server && npm run build

# Etap 2: Runner - uruchomienie serwera w lekkim środowisku
FROM node:${NODE_VERSION}-slim AS runner

WORKDIR /app

# Utworzenie użytkownika non-root
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Kopiowanie tylko niezbędnych plików z etapu buildera
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
# Kopiowanie plików JSON (nie są kopiowane przez tsc)
RUN mkdir -p ./mcp-server/dist/prompts
COPY --from=builder /app/mcp-server/src/prompts/*.json ./mcp-server/dist/prompts/
COPY --from=builder /app/mcp-server/package.json ./mcp-server/package.json
COPY --from=builder /app/mcp-server/package-lock.json* ./mcp-server/

# Instalacja tylko zależności produkcyjnych
RUN cd mcp-server && npm ci --omit=dev

USER appuser

WORKDIR /app/mcp-server

# Domyślny port dla serwera MCP
ENV PORT=8081

# HEALTHCHECK - sprawdza nowo dodany endpoint /health
# W obrazie slim używamy apt-get do instalacji wget, jeśli nie jest dostępny,
# ale zazwyczaj w slim nie ma wget domyślnie. Zainstalujemy go lub użyjemy node do healthchecka.
# Dla uproszczenia w slim często lepiej użyć prostego skryptu node lub zainstalować wget.
# Zainstalujmy wget w runnerze.
USER root
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --tries=1 --spider http://localhost:${PORT}/health || exit 1

EXPOSE 8081

# Komenda startowa
CMD [ "node", "dist/index.js" ]
