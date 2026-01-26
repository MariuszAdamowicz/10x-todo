# Etap 1: Builder - kompilacja serwera MCP
ARG NODE_VERSION=22.14.0
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Instalacja zależności
COPY mcp-server/package.json mcp-server/package-lock.json* ./mcp-server/
RUN cd mcp-server && npm install

# Kopiowanie kodu źródłowego i kompilacja
COPY mcp-server/ ./mcp-server/
RUN cd mcp-server && npm run build

# Etap 2: Runner - uruchomienie serwera w lekkim środowisku
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

# Utworzenie użytkownika non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Kopiowanie tylko niezbędnych plików z etapu buildera
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
COPY --from=builder /app/mcp-server/package.json ./mcp-server/package.json
COPY --from=builder /app/mcp-server/package-lock.json* ./mcp-server/

# Instalacja tylko zależności produkcyjnych
RUN cd mcp-server && npm install --production

USER appuser

WORKDIR /app/mcp-server

# Domyślny port dla serwera MCP
ENV PORT=8081

# HEALTHCHECK - sprawdza nowo dodany endpoint /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --tries=1 --spider http://localhost:${PORT}/health || exit 1

EXPOSE 8081

# Komenda startowa
CMD [ "node", "dist/index.js" ]
