.PHONY: all build build-backend build-frontend run-dev run-prod import-data clean help

all: build

help:
	@echo "高铁优化器 - 项目管理命令"
	@echo ""
	@echo "可用命令:"
	@echo "  make build        - 编译后端和前端"
	@echo "  make build-backend - 仅编译后端"
	@echo "  make build-frontend - 仅编译前端"
	@echo "  make run-dev      - 启动开发环境"
	@echo "  make run-prod     - 启动生产环境"
	@echo "  make import-data  - 从12306导入数据"
	@echo "  make clean        - 清理构建文件"

build: build-backend build-frontend

build-backend:
	@echo "编译后端..."
	go build -o bin/server cmd/main.go

build-frontend:
	@echo "编译前端..."
	cd web && npm run build

run-dev:
	@echo "启动开发环境..."
	./start-dev.sh

run-prod:
	@echo "启动生产环境..."
	./start-prod.sh

import-data:
	@echo "导入数据..."
	./import-data.sh

clean:
	@echo "清理构建文件..."
	rm -rf bin/ web/dist/
