FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./

RUN npm ci --registry=https://registry.npmmirror.com

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve --registry=https://registry.npmmirror.com

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
