.PHONY: all build-frontend build-backend run-frontend run-backend docker-up docker-down test-backend clean

all: docker-up

build-frontend:
	cd frontend && npm install && npm run build

build-backend:
	cd backend && go mod download && go build -o bin/flight-tracker-server .

run-frontend:
	cd frontend && npm install && npm run dev

run-backend:
	cd backend && go run .

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

test-backend:
	cd backend && go test -v ./internal/carbon/...

test-backend-coverage:
	cd backend && go test -coverprofile=coverage.out ./internal/carbon/... && go tool cover -html=coverage.out

clean:
	rm -rf frontend/dist
	rm -rf backend/bin
	rm -rf backend/coverage.out

help:
	@echo "Available targets:"
	@echo "  build-frontend  - Build frontend production bundle"
	@echo "  build-backend   - Build backend binary"
	@echo "  run-frontend    - Run frontend in development mode"
	@echo "  run-backend     - Run backend in development mode"
	@echo "  docker-up       - Start all services with Docker Compose"
	@echo "  docker-down     - Stop all services"
	@echo "  docker-logs     - View logs from all services"
	@echo "  test-backend    - Run backend unit tests"
	@echo "  clean           - Remove build artifacts"
