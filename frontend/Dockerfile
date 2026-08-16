# syntax=docker/dockerfile:1

# Stage 1 — quality gate: lint + typecheck + vitest, then the production build
# (build fails if any fail).
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run lint && npx tsc --noEmit && npx vitest run && npm run build

# Stage 2 — runtime: nginx serving the static bundle from the build stage.
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
