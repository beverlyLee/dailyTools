#!/usr/bin/env python3
import subprocess
import sys
import os
import venv
import json
import time

project_dir = "/Users/liboyang/trae/dailyTools/ride-hailing-waste"
venv_dir = os.path.join(project_dir, "venv")
venv_python = os.path.join(venv_dir, "bin", "python")
venv_pip = os.path.join(venv_dir, "bin", "pip")
requirements_file = os.path.join(project_dir, "requirements.txt")
src_dir = os.path.join(project_dir, "src")
log_file = os.path.join(project_dir, "server.log")
result_file = os.path.join(project_dir, "start_result.json")

result = {
    "venv_created": False,
    "dependencies_installed": False,
    "server_started": False,
    "server_pid": None,
    "error": None,
    "traceback": None,
    "server_log": None
}

try:
    if not os.path.exists(venv_python):
        print("Creating virtual environment...")
        builder = venv.EnvBuilder(with_pip=True)
        builder.create(venv_dir)
        result["venv_created"] = True
        print("Virtual environment created successfully.")
    else:
        print("Virtual environment already exists.")
        result["venv_created"] = True

    print("Installing dependencies...")
    install_result = subprocess.run(
        [venv_pip, "install", "-r", requirements_file],
        capture_output=True,
        text=True,
        cwd=project_dir
    )
    if install_result.returncode != 0:
        result["error"] = f"Failed to install dependencies: {install_result.stderr}"
        with open(result_file, "w") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Error: {result['error']}")
        sys.exit(1)
    result["dependencies_installed"] = True
    print("Dependencies installed successfully.")

    print("Starting server...")
    env = os.environ.copy()
    env["PYTHONPATH"] = src_dir

    log_f = open(log_file, "w")
    cmd = [
        venv_python, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    ]
    
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
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read().decode()
                result["health_check_passed"] = (response.status == 200)
                result["health_response"] = body
        except Exception as e:
            result["health_error"] = f"Health check failed: {str(e)}"
            log_f.flush()
            with open(log_file, "r") as f:
                result["server_log"] = f.read()

except Exception as e:
    result["error"] = str(e)
    import traceback
    result["traceback"] = traceback.format_exc()
    print(f"Error: {e}")
    print(traceback.format_exc())

with open(result_file, "w") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"Result written to {result_file}")
print(json.dumps(result, indent=2, ensure_ascii=False))
