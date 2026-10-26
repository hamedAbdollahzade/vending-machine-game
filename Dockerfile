# Stage 1: run the tests and build the static game with Vite.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN node --test tests/*.test.js && npm run build

# Stage 2: serve dist/ with Caddy, which also obtains and renews the HTTPS certificate.
FROM caddy:2.8.4-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443 443/udp
