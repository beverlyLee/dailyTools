.PHONY: install backend page-designer schema-manager dev build clean

install:
	cd backend && go mod tidy
	cd page-designer && npm install
	cd schema-manager && npm install

backend:
	cd backend && go run cmd/main.go

page-designer:
	cd page-designer && npm run dev

schema-manager:
	cd schema-manager && npm run dev

dev-backend:
	cd backend && go run cmd/main.go

dev-page-designer:
	cd page-designer && npm run dev

dev-schema-manager:
	cd schema-manager && npm run dev

build:
	cd page-designer && npm run build
	cd schema-manager && npm run build

clean:
	rm -rf page-designer/node_modules
	rm -rf schema-manager/node_modules
	rm -rf page-designer/dist
	rm -rf schema-manager/dist
