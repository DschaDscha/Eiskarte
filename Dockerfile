# --- Client bauen ---
FROM node:22-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Server-Laufzeit ---
FROM node:22-slim AS server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY --from=client-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

VOLUME ["/app/server/data", "/app/server/uploads"]

CMD ["node", "src/index.js"]
