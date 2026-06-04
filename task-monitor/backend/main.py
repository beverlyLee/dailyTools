#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import time
from typing import List, Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from session import get_all_sessions, get_session_by_id, get_avg_cpu, is_trae_running, get_chat_sessions
from monitor import get_global_monitor, MonitorStatus

monitor = get_global_monitor()
sse_clients: List[asyncio.Queue] = []

HEARTBEAT_INTERVAL = 15


async def monitor_loop():
    while True:
        try:
            for session_id, m in list(monitor.monitors.items()):
                if m.is_monitoring:
                    monitor._check_once(m)
                    if m.last_completed:
                        await notify_sse_clients({
                            "type": "completed",
                            "session_id": session_id,
                            "data": m.to_dict()
                        })

            await notify_sse_clients({
                "type": "status_update",
                "data": monitor.get_all_status()
            })
        except Exception as e:
            print(f"[Monitor] Error in loop: {e}")

        await asyncio.sleep(monitor.check_interval)


async def notify_sse_clients(message: Dict):
    data = f"data: {json.dumps(message, ensure_ascii=False)}\n\n"
    dead_clients = []
    for queue in sse_clients:
        try:
            queue.put_nowait(data)
        except asyncio.QueueFull:
            dead_clients.append(queue)
        except Exception:
            dead_clients.append(queue)
    for q in dead_clients:
        if q in sse_clients:
            sse_clients.remove(q)


async def heartbeat_sender(queue: asyncio.Queue):
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        try:
            queue.put_nowait(": heartbeat\n\n")
        except asyncio.QueueFull:
            break
        except Exception:
            break


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(monitor_loop())
    yield
    monitor.stop()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartMonitorRequest(BaseModel):
    session_id: str


class StopMonitorRequest(BaseModel):
    session_id: str


@app.get("/api/health")
async def health():
    return {"status": "ok", "trae_running": is_trae_running()}


@app.get("/api/system/cpu")
async def get_cpu():
    return {"avg_cpu": get_avg_cpu(), "trae_running": is_trae_running()}


@app.get("/api/sessions")
async def list_sessions():
    sessions = get_all_sessions()
    return {"sessions": [s.to_dict() for s in sessions]}


@app.get("/api/chat-sessions")
async def list_chat_sessions():
    sessions = get_chat_sessions()
    return {"sessions": [s.to_dict() for s in sessions]}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.to_dict()


@app.get("/api/monitor/status")
async def get_monitor_status():
    return {"monitors": monitor.get_all_status()}


@app.get("/api/monitor/status/{session_id}")
async def get_session_monitor_status(session_id: str):
    status = monitor.get_status(session_id)
    if not status:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return status.to_dict()


@app.post("/api/monitor/start")
async def start_monitoring(req: StartMonitorRequest):
    success = monitor.start_monitor(req.session_id)
    status = monitor.get_status(req.session_id)
    return {
        "success": success,
        "session_id": req.session_id,
        "status": status.to_dict() if status else None
    }


@app.post("/api/monitor/stop")
async def stop_monitoring(req: StopMonitorRequest):
    success = monitor.stop_monitor(req.session_id)
    status = monitor.get_status(req.session_id)
    return {
        "success": success,
        "session_id": req.session_id,
        "status": status.to_dict() if status else None
    }


@app.post("/api/monitor/remove")
async def remove_monitor(req: StopMonitorRequest):
    success = monitor.remove_monitor(req.session_id)
    return {
        "success": success,
        "session_id": req.session_id
    }


@app.post("/api/monitor/mark-completed")
async def mark_completed(req: StopMonitorRequest):
    success = monitor.mark_completed(req.session_id)
    status = monitor.get_status(req.session_id)
    return {
        "success": success,
        "session_id": req.session_id,
        "status": status.to_dict() if status else None
    }


@app.get("/api/monitor/stream")
async def stream():
    queue = asyncio.Queue(maxsize=100)
    sse_clients.append(queue)

    async def event_generator():
        heartbeat_task = asyncio.create_task(heartbeat_sender(queue))
        try:
            initial_data = {
                "type": "init",
                "data": {
                    "monitors": monitor.get_all_status(),
                    "sessions": [s.to_dict() for s in get_all_sessions()]
                }
            }
            yield f"data: {json.dumps(initial_data, ensure_ascii=False)}\n\n"

            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield data
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[SSE] Generator error: {e}")
        finally:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
            if queue in sse_clients:
                sse_clients.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8999)
