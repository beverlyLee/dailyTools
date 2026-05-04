FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/

FROM node:20-alpine

RUN apk add --no-cache sqlite-libs

WORKDIR /app

COPY --from=builder /build/package*.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/src ./src

RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/status || exit 1

CMD ["node", "src/index.js"]
