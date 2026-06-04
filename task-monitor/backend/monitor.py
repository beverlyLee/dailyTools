#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field, asdict

from session import get_avg_cpu, is_trae_running, get_session_by_id, is_session_process_active, get_active_process_cpu

HIGH_CPU_THRESHOLD = 15.0
IDLE_CPU_THRESHOLD = 8.0
REQUIRED_IDLE_COUNT = 3


@dataclass
class MonitorStatus:
    session_id: str
    display_name: str = ""
    title: str = ""
    workspace: str = ""
    is_monitoring: bool = False
    status: str = "unknown"
    cpu_history: List[float] = field(default_factory=list)
    start_time: Optional[float] = None
    task_start_time: Optional[float] = None
    last_update_time: Optional[float] = None
    idle_count: int = 0
    in_progress: bool = False
    last_completed: bool = False
    process_was_active: bool = False

    def to_dict(self) -> Dict:
        data = asdict(self)
        data["elapsed_time"] = self.elapsed_time()
        data["avg_cpu"] = self.avg_cpu()
        data["status_text"] = self.status_text()
        return data

    def elapsed_time(self) -> float:
        if self.task_start_time:
            return time.time() - self.task_start_time
        if self.start_time:
            return time.time() - self.start_time
        return 0

    def avg_cpu(self) -> float:
        if not self.cpu_history:
            return 0
        return sum(self.cpu_history) / len(self.cpu_history)

    def status_text(self) -> str:
        if self.status == "completed":
            return "已完成"
        elif self.status == "running":
            return "运行中"
        elif self.status == "idle":
            return "空闲"
        elif self.status == "error":
            return "错误"
        else:
            return "未知"


class TaskMonitor:
    def __init__(self):
        self.monitors: Dict[str, MonitorStatus] = {}
        self.check_interval = 3
        self._running = False
        self._callbacks: List[Callable] = []

    def add_listener(self, callback: Callable):
        self._callbacks.append(callback)

    def _notify_listeners(self, session_id: str, status: MonitorStatus):
        for cb in self._callbacks:
            try:
                cb(session_id, status)
            except Exception:
                pass

    def start_monitor(self, session_id: str) -> bool:
        if session_id in self.monitors and self.monitors[session_id].is_monitoring:
            return False

        if session_id not in self.monitors:
            self.monitors[session_id] = MonitorStatus(session_id=session_id)

        m = self.monitors[session_id]
        m.is_monitoring = True
        m.start_time = time.time()
        m.cpu_history = []
        m.idle_count = 0
        m.in_progress = False
        m.last_completed = False
        m.process_was_active = False

        session = get_session_by_id(session_id)
        if session:
            session_dict = session.to_dict()
            m.display_name = session_dict.get("display_name", "")
            m.title = session_dict.get("title", "")
            m.workspace = session_dict.get("workspace", "")

        currently_active = is_session_process_active(session_id, m.workspace)
        if currently_active:
            m.process_was_active = True
            m.task_start_time = time.time()
            m.status = "running"
            m.in_progress = True
        else:
            m.status = "idle"

        return True

    def stop_monitor(self, session_id: str) -> bool:
        if session_id not in self.monitors:
            return False
        self.monitors[session_id].is_monitoring = False
        return True

    def mark_completed(self, session_id: str) -> bool:
        if session_id not in self.monitors:
            return False
        m = self.monitors[session_id]
        m.status = "completed"
        m.in_progress = False
        m.last_completed = True
        m.is_monitoring = False
        self._notify_listeners(session_id, m)
        return True

    def remove_monitor(self, session_id: str) -> bool:
        if session_id in self.monitors:
            del self.monitors[session_id]
            return True
        return False

    def get_status(self, session_id: str) -> Optional[MonitorStatus]:
        return self.monitors.get(session_id)

    def get_all_status(self) -> List[Dict]:
        return [m.to_dict() for m in self.monitors.values()]

    def _check_once(self, m: MonitorStatus):
        if not m.is_monitoring:
            return

        process_active = is_session_process_active(m.session_id, m.workspace)
        session_cpu = get_active_process_cpu(m.session_id, m.workspace)
        global_cpu = get_avg_cpu()
        combined_cpu = max(session_cpu, global_cpu)

        m.cpu_history.append(combined_cpu)
        if len(m.cpu_history) > 10:
            m.cpu_history.pop(0)

        avg_cpu = m.avg_cpu()
        m.last_update_time = time.time()

        if m.process_was_active and not process_active:
            m.status = "completed"
            m.in_progress = False
            m.last_completed = True
            m.is_monitoring = False
            self._notify_listeners(m.session_id, m)
            return

        if process_active:
            if not m.process_was_active:
                m.process_was_active = True
                m.task_start_time = time.time()
            m.in_progress = True
            m.status = "running"
            m.idle_count = 0
            m.last_completed = False

            if avg_cpu < IDLE_CPU_THRESHOLD:
                m.idle_count += 1
                if m.idle_count >= REQUIRED_IDLE_COUNT:
                    pass
            else:
                m.idle_count = 0
        else:
            if not m.process_was_active:
                if combined_cpu > HIGH_CPU_THRESHOLD:
                    m.in_progress = True
                    m.task_start_time = time.time()
                    m.process_was_active = True
                    m.status = "running"
                    m.last_completed = False
                else:
                    m.status = "idle"

    async def run_async(self):
        self._running = True
        while self._running:
            for session_id, m in list(self.monitors.items()):
                if m.is_monitoring:
                    self._check_once(m)
            await asyncio.sleep(self.check_interval)

    def run_sync(self):
        self._running = True
        while self._running:
            for session_id, m in list(self.monitors.items()):
                if m.is_monitoring:
                    self._check_once(m)
            time.sleep(self.check_interval)

    def stop(self):
        self._running = False


_global_monitor: Optional[TaskMonitor] = None


def get_global_monitor() -> TaskMonitor:
    global _global_monitor
    if _global_monitor is None:
        _global_monitor = TaskMonitor()
    return _global_monitor
