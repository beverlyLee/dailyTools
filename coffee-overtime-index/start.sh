#!/bin/bash
cd "$(dirname "$0")"
source .env 2>/dev/null || true
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
