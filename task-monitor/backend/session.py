#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import sqlite3
import subprocess
import re
import hashlib
import time
import shutil
import tempfile
from datetime import datetime
from typing import List, Dict, Optional

_chat_sessions_cache = None
_chat_sessions_cache_time = 0
CHAT_SESSIONS_CACHE_TTL = 30

_input_history_cache = None
_input_history_cache_time = 0
INPUT_HISTORY_CACHE_TTL = 60

_session_time_range_cache = None
_session_time_range_cache_time = 0
SESSION_TIME_RANGE_CACHE_TTL = 300

_db_copy_cache = {}
_db_copy_cache_time = {}
DB_COPY_CACHE_TTL = 10

_session_detail_cache = {}
_session_detail_cache_time = {}
SESSION_DETAIL_CACHE_TTL = 30


def _get_base_paths():
    paths = []
    solo_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN")
    cn_path = os.path.expanduser("~/Library/Application Support/Trae CN")
    if os.path.exists(solo_path):
        paths.append(("TRAE SOLO", solo_path))
    if os.path.exists(cn_path):
        paths.append(("Trae CN", cn_path))
    return paths


def _get_all_workspace_storage_paths():
    paths = []
    for base_name in ["Trae CN", "TRAE SOLO CN"]:
        base_path = os.path.expanduser(f"~/Library/Application Support/{base_name}/User/workspaceStorage")
        if os.path.exists(base_path):
            for item in os.listdir(base_path):
                item_path = os.path.join(base_path, item, "state.vscdb")
                if os.path.exists(item_path):
                    paths.append((base_name, item_path))
    return paths


def _extract_task_id(text: str) -> str:
    import hashlib
    first_line = text.strip().split('\n')[0].strip()
    return hashlib.md5(first_line.encode()).hexdigest()[:16]


def _extract_timestamp_from_sid(session_id: str) -> Optional[float]:
    if len(session_id) == 24:
        try:
            timestamp_hex = session_id[:8]
            timestamp = int(timestamp_hex, 16)
            if timestamp > 1000000000 and timestamp < 2000000000:
                return float(timestamp)
        except ValueError:
            pass
    return None


def _safe_connect_db(db_path: str) -> Optional[sqlite3.Connection]:
    now = time.time()
    cache_key = db_path

    if cache_key in _db_copy_cache:
        cached_path = _db_copy_cache[cache_key]
        cached_time = _db_copy_cache_time.get(cache_key, 0)
        if (now - cached_time) < DB_COPY_CACHE_TTL and os.path.exists(cached_path):
            try:
                conn = sqlite3.connect(f"file:{cached_path}?mode=ro", uri=True, timeout=2.0)
                conn.execute("PRAGMA query_only = 1")
                return conn
            except Exception:
                pass

    try:
        mtime = os.path.getmtime(db_path)
    except Exception:
        return None

    try:
        tmp_dir = tempfile.gettempdir()
        base_name = os.path.basename(db_path)
        tmp_name = f"task_monitor_{os.path.getsize(db_path)}_{int(mtime)}_{base_name}"
        tmp_path = os.path.join(tmp_dir, tmp_name)

        if not os.path.exists(tmp_path):
            shutil.copy2(db_path, tmp_path)

        _cleanup_old_db_copies(tmp_dir)

        _db_copy_cache[cache_key] = tmp_path
        _db_copy_cache_time[cache_key] = now

        conn = sqlite3.connect(f"file:{tmp_path}?mode=ro", uri=True, timeout=2.0)
        conn.execute("PRAGMA query_only = 1")
        return conn
    except Exception:
        try:
            conn = sqlite3.connect(db_path, timeout=1.0)
            conn.execute("PRAGMA query_only = 1")
            conn.execute("PRAGMA busy_timeout = 1000")
            return conn
        except Exception:
            return None


def _cleanup_old_db_copies(tmp_dir: str):
    try:
        cutoff = time.time() - 3600
        for filename in os.listdir(tmp_dir):
            if filename.startswith("task_monitor_") and filename.endswith(".vscdb"):
                filepath = os.path.join(tmp_dir, filename)
                try:
                    if os.path.getmtime(filepath) < cutoff:
                        os.unlink(filepath)
                except Exception:
                    pass
    except Exception:
        pass


def _extract_project_from_text(text: str) -> str:
    if not text:
        return ""
    patterns = [
        r'/([a-zA-Z0-9_-]+)/\s*目录',
        r'在\s*/([a-zA-Z0-9_-]+)/',
        r'/([a-zA-Z0-9_-]+)/\s*目录下',
        r'在\s*/([a-zA-Z0-9_-]+)\s',
        r'/([a-zA-Z0-9_-]+)/\s',
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            name = m.group(1)
            if name not in ("public", "src", "models", "dist", "build", "node_modules", "lib", "bin"):
                return name
    return ""


def _extract_title_from_text(text: str) -> str:
    if not text:
        return ""
    first_line = text.strip().split("\n")[0].strip()
    if len(first_line) > 60:
        return first_line[:60] + "..."
    return first_line


class Session:
    def __init__(self, session_id: str, name: str = None, created_at: float = None):
        self.session_id = session_id
        self.name = name or session_id
        self.display_name = ""
        self.title = ""
        self.created_at = created_at or 0
        self.workspace = ""
        self.command = ""
        self.is_active = False
        self.source = ""
        self.session_type = "sandbox"

    def _generate_display_name(self):
        if self.title:
            return self.title
        if self.workspace:
            return self.workspace
        if self.command:
            short_cmd = self.command.replace("&&", "|").replace("  ", " ")
            if len(short_cmd) > 40:
                return short_cmd[:40] + "..."
            return short_cmd
        return self.session_id[:16] + "..."

    def to_dict(self) -> Dict:
        return {
            "session_id": self.session_id,
            "name": self.name,
            "display_name": self.display_name or self._generate_display_name(),
            "title": self.title,
            "created_at": self.created_at,
            "created_at_str": datetime.fromtimestamp(self.created_at).strftime("%Y-%m-%d %H:%M:%S") if self.created_at else "Unknown",
            "workspace": self.workspace,
            "command": self.command,
            "is_active": self.is_active,
            "source": self.source,
            "session_type": self.session_type,
        }


def get_active_tasks() -> List[Session]:
    sessions = []
    seen_ids = {}

    try:
        result = subprocess.run(
            ["ps", "-A", "-o", "pid,command"],
            capture_output=True,
            text=True,
            timeout=5,
        )

        for line in result.stdout.splitlines()[1:]:
            if "trae-sandbox" not in line:
                continue

            config_match = re.search(r"--config-name\s+(\S+)", line)
            if not config_match:
                continue

            session_id = config_match.group(1)

            cmd_match = re.search(r"--command-line\s+(.+)", line)
            command = cmd_match.group(1).strip() if cmd_match else ""

            if "import session" in command or "python3 -c" in command or "curl" in command:
                continue

            storage_match = re.search(r"--storage-path\s+(.+?)\s+--", line)
            storage_path = storage_match.group(1).strip() if storage_match else ""

            workspace = ""
            if command:
                cd_match = re.search(r"cd\s+(\S+)", command)
                if cd_match:
                    workspace = os.path.basename(cd_match.group(1))

            source = ""
            if "TRAE SOLO" in storage_path:
                source = "TRAE SOLO"
            elif "Trae CN" in storage_path:
                source = "Trae CN"

            if session_id in seen_ids:
                existing = seen_ids[session_id]
                if command:
                    existing.command = existing.command + " && " + command if existing.command else command
                if not existing.workspace and workspace:
                    existing.workspace = workspace
                continue

            session = Session(
                session_id=session_id,
                name=session_id,
                created_at=0,
            )
            session.workspace = workspace
            session.command = command
            session.is_active = True
            session.source = source
            seen_ids[session_id] = session
            sessions.append(session)

    except Exception:
        pass

    return sessions


_SERVICE_COMMANDS = [
    "flask run",
    "uvicorn",
    "streamlit run",
    "npm run",
    "yarn dev",
    "yarn start",
    "pnpm dev",
    "pnpm start",
    "python app.py",
    "python3 app.py",
    "python src/main.py",
    "python3 src/main.py",
    "python frontend/app.py",
    "python3 frontend/app.py",
    "python main.py",
    "python3 main.py",
    "npm start",
    "serve",
    "python -c",
    "python3 -c",
    "agent-browser",
]

MIN_ACTIVE_CPU = 2.0

def _is_service_command(command: str) -> bool:
    for svc in _SERVICE_COMMANDS:
        if svc in command:
            return True
    return False


def _get_active_workspaces() -> Dict[str, str]:
    active_ws = {}
    try:
        result = subprocess.run(
            ["ps", "-A", "-o", "%cpu,pid,command"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        for line in result.stdout.splitlines()[1:]:
            if "trae-sandbox" not in line:
                continue
            parts = line.strip().split(None, 2)
            if len(parts) < 3:
                continue
            try:
                cpu = float(parts[0])
            except ValueError:
                continue
            cmd_match = re.search(r"--command-line\s+(.+)", parts[2])
            if not cmd_match:
                continue
            command = cmd_match.group(1).strip()
            if "import session" in command or "curl" in command:
                continue
            if cpu < MIN_ACTIVE_CPU:
                continue
            if _is_service_command(command):
                continue
            cd_match = re.search(r"cd\s+(\S+)", command)
            if cd_match:
                ws = os.path.basename(cd_match.group(1))
                if ws and ws not in ("backend", "frontend", "src"):
                    active_ws[ws] = cd_match.group(1)
    except Exception:
        pass
    return active_ws


def get_chat_sessions() -> List[Session]:
    global _chat_sessions_cache, _chat_sessions_cache_time
    now = time.time()
    if _chat_sessions_cache is not None and (now - _chat_sessions_cache_time) < CHAT_SESSIONS_CACHE_TTL:
        active_workspaces = _get_active_workspaces()
        for s in _chat_sessions_cache:
            s.is_active = bool(s.workspace and s.workspace in active_workspaces)
        _chat_sessions_cache.sort(key=lambda s: (0 if s.is_active else 1, -getattr(s, '_history_index', 0)))
        return _chat_sessions_cache

    chat_sessions = []
    active_workspaces = _get_active_workspaces()
    seen_tasks = {}

    main_db = None
    max_history = 0
    for label, db_path in _get_all_workspace_storage_paths():
        try:
            conn = _safe_connect_db(db_path)
            if not conn:
                continue
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
            row = cursor.fetchone()
            if row:
                history = json.loads(row[0])
                if isinstance(history, list) and len(history) > max_history:
                    max_history = len(history)
                    main_db = (label, db_path)
            conn.close()
        except Exception:
            continue

    if not main_db:
        return chat_sessions

    label, db_path = main_db
    try:
        conn = _safe_connect_db(db_path)
        if not conn:
            return chat_sessions
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
        row = cursor.fetchone()
        if not row:
            conn.close()
            return chat_sessions

        history = json.loads(row[0])
        if not isinstance(history, list):
            conn.close()
            return chat_sessions

        total_history = len(history)
        for i, item in enumerate(history):
            if not isinstance(item, dict):
                continue
            text = item.get("inputText", "")
            if not text:
                continue

            first_line = text.strip().split('\n')[0].strip()
            if not first_line:
                continue

            task_id = _extract_task_id(first_line)
            if task_id in seen_tasks:
                continue

            seen_tasks[task_id] = i
            project = _extract_project_from_text(text)
            is_active = project and project in active_workspaces
            title = _extract_title_from_text(text)

            min_ts, max_ts = _get_session_time_range()
            if total_history > 1:
                ratio = i / (total_history - 1)
                approx_timestamp = min_ts + ratio * (max_ts - min_ts)
            else:
                approx_timestamp = max_ts

            session = Session(
                session_id=task_id,
                name=project or task_id,
                created_at=approx_timestamp,
            )
            session.session_type = "chat"
            session.title = title
            session.display_name = title
            session.workspace = project
            session.is_active = is_active
            session.source = label
            session._history_index = i

            if is_active and project:
                session.command = f"cd {active_workspaces[project]}"

            chat_sessions.append(session)

        conn.close()
    except Exception:
        pass

    chat_sessions.sort(key=lambda s: (0 if s.is_active else 1, -getattr(s, '_history_index', 0)))
    _chat_sessions_cache = chat_sessions
    _chat_sessions_cache_time = time.time()
    return chat_sessions


def get_all_sessions() -> List[Session]:
    active_sessions = get_active_tasks()
    active_ids = {s.session_id for s in active_sessions}

    all_sessions_map = {s.session_id: s for s in active_sessions}

    for label, base_path in _get_base_paths():
        sandbox_path = os.path.join(base_path, "ModularData", "ai-agent", "sandbox")
        if not os.path.exists(sandbox_path):
            continue

        for filename in os.listdir(sandbox_path):
            if not filename.endswith(".json") or filename.endswith("-hooks.json"):
                continue

            session_id = filename.replace(".json", "")
            if session_id in active_ids:
                s = all_sessions_map[session_id]
                if not s.created_at:
                    filepath = os.path.join(sandbox_path, filename)
                    s.created_at = os.path.getctime(filepath)
                    s.source = s.source or label
                continue

            filepath = os.path.join(sandbox_path, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)

                created_at = os.path.getctime(filepath)
                session = Session(session_id, session_id, created_at)
                session.source = label

                permissions = data.get("permission", [])
                for perm in permissions:
                    if isinstance(perm, dict):
                        for key, value in perm.items():
                            if "file_inherit_user" in key and value:
                                if ".trae-cn/memory" not in value and "TRAE SOLO" not in value and "Trae CN" not in value:
                                    session.workspace = os.path.basename(value)
                                    break
                        if session.workspace:
                            break

                all_sessions_map[session_id] = session
            except Exception:
                session = Session(session_id, session_id, os.path.getctime(filepath))
                session.source = label
                all_sessions_map[session_id] = session

    sessions = list(all_sessions_map.values())
    sessions.sort(key=lambda s: (0 if s.is_active else 1, s.created_at), reverse=True)
    return sessions


def get_session_by_id(session_id: str) -> Optional[Session]:
    for session in get_all_sessions():
        if session.session_id == session_id:
            return session

    chat_sessions = get_chat_sessions()
    for session in chat_sessions:
        if session.session_id == session_id:
            return session

    ai_agent_session = _get_ai_agent_session(session_id)
    if ai_agent_session:
        return ai_agent_session

    chat_store_session = _get_chat_store_session(session_id)
    if chat_store_session:
        return chat_store_session

    return None


def _get_ai_agent_session(session_id: str) -> Optional[Session]:
    for label, db_path in _get_all_workspace_storage_paths():
        try:
            conn = _safe_connect_db(db_path)
            if not conn:
                continue
            cursor = conn.cursor()

            cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
            row = cursor.fetchone()
            if not row:
                conn.close()
                continue

            session_map = json.loads(row[0])
            if session_id not in session_map:
                conn.close()
                continue

            agent_type = session_map[session_id]
            ts = _extract_timestamp_from_sid(session_id) or time.time()
            session = Session(session_id, session_id, ts)
            session.session_type = "chat"
            session.source = label
            session.display_name = f"AI Agent Session ({agent_type})"
            session.title = ""

            cursor.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
            row = cursor.fetchone()
            if row:
                try:
                    storage = json.loads(row[0])
                    slist = storage.get('list', [])
                    for s in slist:
                        if s.get('sessionId') == session_id:
                            if s.get('isCurrent'):
                                session.is_active = True
                            break
                except Exception:
                    pass

            conn.close()
            return session
        except Exception:
            continue

    return None


def _get_chat_store_session(session_id: str) -> Optional[Session]:
    for label, db_path in _get_all_workspace_storage_paths():
        try:
            conn = _safe_connect_db(db_path)
            if not conn:
                continue
            cursor = conn.cursor()

            cursor.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
            row = cursor.fetchone()
            if not row:
                conn.close()
                continue

            chat_store = json.loads(row[0])
            turns_height = chat_store.get('state', {}).get('turnsHeight', {})

            has_session = False
            max_turn = 0
            for key in turns_height.keys():
                if key.startswith(session_id + '-'):
                    has_session = True
                    parts = key.rsplit('-', 1)
                    if len(parts) == 2:
                        turn_num = int(parts[1])
                        if turn_num > max_turn:
                            max_turn = turn_num

            if not has_session:
                conn.close()
                continue

            ts = _extract_timestamp_from_sid(session_id) or time.time()
            session = Session(session_id, session_id, ts)
            session.session_type = "chat"
            session.source = label
            session.display_name = f"Chat Session ({max_turn} turns)"
            session.title = ""
            session._turn_count = max_turn

            conn.close()
            return session
        except Exception:
            continue

    return None


def is_trae_running() -> bool:
    return len(get_trae_processes()) > 0 or len(get_active_tasks()) > 0


def is_session_process_active(session_id: str, workspace: str = "") -> bool:
    active_workspaces = _get_active_workspaces()
    if workspace and workspace in active_workspaces:
        return True
    if session_id in active_workspaces:
        return True

    try:
        result = subprocess.run(
            ["ps", "-A", "-o", "pid,command"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        for line in result.stdout.splitlines()[1:]:
            if "trae-sandbox" not in line:
                continue
            if f"--config-name {session_id}" not in line:
                continue
            if workspace and workspace in line:
                return True
            cmd_match = re.search(r"--command-line\s+(.+)", line)
            command = cmd_match.group(1).strip() if cmd_match else ""
            if "import session" in command or "python3 -c" in command or "curl" in command:
                continue
            return True
        return False
    except Exception:
        return False


def get_active_process_cpu(session_id: str, workspace: str = "") -> float:
    active_workspaces = _get_active_workspaces()
    if workspace and workspace in active_workspaces:
        ws_path = active_workspaces[workspace]
        try:
            result = subprocess.run(
                ["ps", "-A", "-o", "%cpu,pid,command"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            total_cpu = 0.0
            for line in result.stdout.splitlines()[1:]:
                if "trae-sandbox" not in line:
                    continue
                if ws_path not in line:
                    continue
                parts = line.strip().split(None, 2)
                if len(parts) >= 3:
                    try:
                        total_cpu += float(parts[0])
                    except ValueError:
                        pass
            if total_cpu > 0:
                return total_cpu
        except Exception:
            pass

    if session_id in active_workspaces:
        ws_path = active_workspaces[session_id]
        try:
            result = subprocess.run(
                ["ps", "-A", "-o", "%cpu,pid,command"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            total_cpu = 0.0
            for line in result.stdout.splitlines()[1:]:
                if "trae-sandbox" not in line:
                    continue
                if ws_path not in line:
                    continue
                parts = line.strip().split(None, 2)
                if len(parts) >= 3:
                    try:
                        total_cpu += float(parts[0])
                    except ValueError:
                        pass
            if total_cpu > 0:
                return total_cpu
        except Exception:
            pass

    try:
        result = subprocess.run(
            ["ps", "-A", "-o", "%cpu,pid,command"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        total_cpu = 0.0
        for line in result.stdout.splitlines()[1:]:
            if "trae-sandbox" not in line:
                continue
            if f"--config-name {session_id}" not in line:
                continue
            if workspace and workspace not in line:
                continue
            cmd_match = re.search(r"--command-line\s+(.+)", line)
            command = cmd_match.group(1).strip() if cmd_match else ""
            if "import session" in command or "python3 -c" in command or "curl" in command:
                continue
            parts = line.strip().split(None, 2)
            if len(parts) >= 3:
                try:
                    total_cpu += float(parts[0])
                except ValueError:
                    pass
        return total_cpu
    except Exception:
        return 0.0


def get_trae_processes() -> List[Dict]:
    processes = []
    try:
        result = subprocess.run(
            ["ps", "-A", "-o", "%cpu,pid,command"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        for line in result.stdout.splitlines()[1:]:
            line_lower = line.lower()
            if "trae" in line_lower and "solo" in line_lower:
                parts = line.strip().split(None, 2)
                if len(parts) >= 3:
                    try:
                        processes.append({
                            "cpu": float(parts[0]),
                            "pid": int(parts[1]),
                            "command": parts[2]
                        })
                    except (ValueError, IndexError):
                        pass
    except Exception:
        pass
    return processes


def get_avg_cpu() -> float:
    processes = get_trae_processes()
    if not processes:
        return 0
    return sum(p["cpu"] for p in processes) / len(processes)


def _get_main_input_history_db():
    main_db = None
    max_history = 0
    for label, db_path in _get_all_workspace_storage_paths():
        try:
            conn = _safe_connect_db(db_path)
            if not conn:
                continue
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
            row = cursor.fetchone()
            if row:
                history = json.loads(row[0])
                if isinstance(history, list) and len(history) > max_history:
                    max_history = len(history)
                    main_db = (label, db_path)
            conn.close()
        except Exception:
            continue
    return main_db


def _get_input_history_cached():
    global _input_history_cache, _input_history_cache_time
    now = time.time()
    if _input_history_cache is not None and (now - _input_history_cache_time) < INPUT_HISTORY_CACHE_TTL:
        return _input_history_cache

    main_db = _get_main_input_history_db()
    if not main_db:
        return []

    label, db_path = main_db
    try:
        conn = _safe_connect_db(db_path)
        if not conn:
            return []
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
        row = cursor.fetchone()
        if row:
            history = json.loads(row[0])
            if isinstance(history, list):
                _input_history_cache = history
                _input_history_cache_time = now
                conn.close()
                return history
        conn.close()
    except Exception:
        pass

    return []


def _get_session_time_range():
    global _session_time_range_cache, _session_time_range_cache_time
    now = time.time()
    if _session_time_range_cache is not None and (now - _session_time_range_cache_time) < SESSION_TIME_RANGE_CACHE_TTL:
        return _session_time_range_cache

    min_ts = None
    max_ts = None

    for label, db_path in _get_all_workspace_storage_paths():
        try:
            conn = _safe_connect_db(db_path)
            if not conn:
                continue
            cursor = conn.cursor()

            cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
            row = cursor.fetchone()
            if row:
                session_map = json.loads(row[0])
                for sid in session_map.keys():
                    ts = _extract_timestamp_from_sid(sid)
                    if ts:
                        if min_ts is None or ts < min_ts:
                            min_ts = ts
                        if max_ts is None or ts > max_ts:
                            max_ts = ts

            cursor.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
            row = cursor.fetchone()
            if row:
                chat_store = json.loads(row[0])
                turns_height = chat_store.get('state', {}).get('turnsHeight', {})
                seen_sids = set()
                for key in turns_height.keys():
                    sid = key.rsplit('-', 1)[0] if '-' in key else key
                    if sid not in seen_sids:
                        seen_sids.add(sid)
                        ts = _extract_timestamp_from_sid(sid)
                        if ts:
                            if min_ts is None or ts < min_ts:
                                min_ts = ts
                            if max_ts is None or ts > max_ts:
                                    max_ts = ts

            conn.close()
        except Exception:
            continue

    if min_ts is None:
        min_ts = time.time() - 86400 * 30
    if max_ts is None:
        max_ts = time.time()

    _session_time_range_cache = (min_ts, max_ts)
    _session_time_range_cache_time = now
    return (min_ts, max_ts)


def _find_prompt_by_timestamp(session_id: str) -> str:
    ts = _extract_timestamp_from_sid(session_id)
    if not ts:
        return ""

    history = _get_input_history_cached()
    if not history:
        return ""

    min_ts, max_ts = _get_session_time_range()
    total = len(history)

    if max_ts <= min_ts or total == 0:
        return ""

    ratio = (ts - min_ts) / (max_ts - min_ts)
    ratio = max(0.0, min(1.0, ratio))
    index = int(ratio * (total - 1))

    index = max(0, min(total - 1, index))

    for i in range(max(0, index - 2), min(total, index + 3)):
        item = history[i]
        if isinstance(item, dict):
            text = item.get("inputText", "")
            if text:
                return text

    return ""


def get_session_detail(session_id: str) -> Optional[Dict]:
    global _session_detail_cache, _session_detail_cache_time
    now = time.time()

    if session_id in _session_detail_cache:
        cached_time = _session_detail_cache_time.get(session_id, 0)
        if (now - cached_time) < SESSION_DETAIL_CACHE_TTL:
            return _session_detail_cache[session_id]

    session = get_session_by_id(session_id)
    if not session:
        return None

    result = session.to_dict()
    result["prompt"] = ""
    result["output"] = ""
    result["output_available"] = False

    history = _get_input_history_cached()
    if history:
        if session.session_type == "chat":
            for item in history:
                if isinstance(item, dict):
                    text = item.get("inputText", "")
                    if text:
                        first_line = text.strip().split('\n')[0].strip()
                        task_id = _extract_task_id(first_line)
                        if task_id == session_id:
                            result["prompt"] = text
                            break
        else:
            ws = session.workspace or ""
            for item in history:
                if isinstance(item, dict):
                    text = item.get("inputText", "")
                    if not text:
                        continue
                    if ws and ws in text:
                        result["prompt"] = text
                        break
                    if session.session_id in text:
                        result["prompt"] = text
                        break

    if not result["prompt"]:
        ts_prompt = _find_prompt_by_timestamp(session_id)
        if ts_prompt:
            result["prompt"] = ts_prompt

    _session_detail_cache[session_id] = result
    _session_detail_cache_time[session_id] = now

    return result
