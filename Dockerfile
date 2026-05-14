# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY .env.production ./.env.production
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001 -G nodejs \
  && mkdir -p /data \
  && chown nodejs:nodejs /data
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY server ./server
# Usuario no-root no puede escribir bajo /app/server; datos en /data (montar disco en Render si quieres persistencia).
ENV DATA_FILE=/data/data.json
USER nodejs
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/health >/dev/null || exit 1
CMD ["node", "server/index.mjs"]
