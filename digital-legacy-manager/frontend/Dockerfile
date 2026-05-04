FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./

RUN npm ci

COPY quasar.config.js ./
COPY src/ ./src/
COPY src-electron/ ./src-electron/

ENV API_URL=http://localhost:3000/api

RUN npm run build

FROM nginx:alpine

COPY --from=builder /build/dist/spa /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
