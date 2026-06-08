import subprocess
import sys
import time
import os
import json

project_dir = "/Users/liboyang/trae/dailyTools/ride-hailing-waste"
venv_python = os.path.join(project_dir, "venv", "bin", "python")
src_dir = os.path.join(project_dir, "src")
log_file = os.path.join(project_dir, "server.log")
result_file = os.path.join(project_dir, "start_result.json")

result = {
    "venv_exists": os.path.exists(venv_python),
    "server_started": False,
    "health_check_passed": False,
    "health_response": None,
    "error": None,
    "server_log": None,
    "server_pid": None
}

try:
    cmd = [
        venv_python, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    ]

    env = os.environ.copy()
    env["PYTHONPATH"] = src_dir

    log_f = open(log_file, "w")
    proc = subprocess.Popen(
        cmd,
        cwd=src_dir,
        stdout=log_f,
        stderr=subprocess.STDOUT,
        env=env
    )
    result["server_pid"] = proc.pid

    time.sleep(5)

    if proc.poll() is not None:
        log_f.close()
        with open(log_file, "r") as f:
            result["server_log"] = f.read()
        result["error"] = "Server exited early"
    else:
        result["server_started"] = True

        import urllib.request
        try:
            req = urllib.request.Request("http://localhost:8000/api/health")
            with urllib.request.urlopen(req, timeout=5) as response:
                body = response.read().decode()
                result["health_check_passed"] = (response.status == 200)
                result["health_response"] = body
        except Exception as e:
            result["error"] = f"Health check failed: {str(e)}"
            log_f.close()
            with open(log_file, "r") as f:
                result["server_log"] = f.read()

except Exception as e:
    result["error"] = str(e)
    import traceback
    result["traceback"] = traceback.format_exc()

with open(result_file, "w") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("Done. Result written to", result_file)
