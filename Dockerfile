# Etap 1: Builder - budowanie aplikacji Astro
ARG NODE_VERSION=22.14.0
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Instalacja zależności
COPY package.json package-lock.json* ./
RUN npm install

# Kopiowanie reszty plików i budowanie aplikacji
COPY . .
RUN npm run build

# Etap 2: Runner - uruchomienie aplikacji w lekkim środowisku
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

# Utworzenie użytkownika non-root do uruchomienia aplikacji
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Kopiowanie zbudowanej aplikacji z etapu buildera
# Adapter @astrojs/node z opcją "standalone" sam pakuje potrzebne node_modules
COPY --from=builder /app/dist ./dist

# Zmienne środowiskowe do konfiguracji serwera
# Aplikacja będzie nasłuchiwać na wszystkich interfejsach
ENV HOST=0.0.0.0
# Port, na którym będzie działać aplikacja wewnątrz kontenera
ENV PORT=8080

# Ustawienie HEALTHCHECK do monitorowania stanu aplikacji
# Sprawdza, czy strona główna odpowiada
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Wystawienie portu na zewnątrz kontenera
EXPOSE 8080

# Komenda startowa dla aplikacji
CMD [ "node", "dist/server/entry.mjs" ]
