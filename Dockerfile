# Stage 1: run the tests and build the static game with Vite.
FROM node:22-alpine AS build
WORKDIR /app
# Override with a reachable mirror where registry.npmjs.org is blocked (docker compose passes NPM_REGISTRY).
ARG NPM_REGISTRY=https://registry.npmjs.org/
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --registry="$NPM_REGISTRY" --fetch-retries=3 --fetch-timeout=60000
COPY . .
RUN node --test tests/*.test.js && npm run build

# Stage 2: serve dist/ with Caddy, which also obtains and renews the HTTPS certificate.
FROM caddy:2.8.4-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443 443/udp
