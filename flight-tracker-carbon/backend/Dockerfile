FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=1
ENV GOOS=linux
ENV GOARCH=amd64

RUN go build -a -ldflags '-extldflags "-static"' -o flight-tracker-server .

FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/flight-tracker-server .

RUN chmod +x flight-tracker-server

EXPOSE 8080

CMD ["./flight-tracker-server"]
