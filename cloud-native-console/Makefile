.PHONY: all backend frontend install clean dev

all: backend frontend

install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing backend dependencies..."
	cd backend && go mod download

backend:
	@echo "Building backend..."
	cd backend && go build -o ../dist/cnc-backend .

frontend:
	@echo "Building frontend..."
	cd frontend && npm run build

frontend-electron:
	@echo "Building Electron app..."
	cd frontend && npm run electron:build

dev-backend:
	@echo "Starting backend in development mode..."
	cd backend && DEBUG=true go run .

dev-frontend:
	@echo "Starting frontend in development mode..."
	cd frontend && npm run dev

dev:
	@echo "Starting both services in development mode..."
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:5173"
	@$(MAKE) -j2 dev-backend dev-frontend

clean:
	@echo "Cleaning up..."
	rm -rf dist
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/cloud-native-console
	cd backend && go clean

test-frontend:
	cd frontend && npm run test

test-backend:
	cd backend && go test -v ./...

lint-frontend:
	cd frontend && npm run lint

lint-backend:
	cd backend && go vet ./...
