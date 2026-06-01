from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .websocket import CopilotSession
from .config import settings

app = FastAPI(
    title="Sales Copilot Realtime",
    description="实时销售话术辅助系统",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "name": "Sales Copilot Realtime API",
        "version": "1.0.0",
        "status": "running",
        "debug": settings.DEBUG,
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    session = CopilotSession(websocket)
    await session.start()
