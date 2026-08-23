# syntax=docker/dockerfile:1

# Stage 1 — quality gate: lint + typecheck + vitest, then the production build
# (build fails if any fail).
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run lint && npx tsc --noEmit && npx vitest run && npm run build

# Stage 2 — runtime: nginx serving the static bundle over HTTPS (self-signed
# cert generated on first start, see docker-entrypoint.sh). Plain HTTP redirects.
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache openssl

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-check-certificate -qO- https://127.0.0.1/ >/dev/null || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
