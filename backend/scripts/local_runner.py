import json
import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer


HOST = "127.0.0.1"
PORT = int(os.environ.get("LOCAL_RUNNER_PORT", "5052"))
TIMEOUT_SECONDS = 6
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_DIR = os.path.join(BASE_DIR, "temp", "local-runner")
TOOLS_DIR = os.path.join(BASE_DIR, "tools")


def make_job_dir(prefix: str) -> str:
    os.makedirs(WORK_DIR, exist_ok=True)
    job_dir = os.path.join(WORK_DIR, f"{prefix}_{uuid.uuid4().hex}")
    os.makedirs(job_dir, exist_ok=True)
    return job_dir


def run_python(code: str, user_input: str) -> dict:
    tmpdir = make_job_dir("py")
    try:
        source_path = os.path.join(tmpdir, "main.py")
        with open(source_path, "w", encoding="utf-8") as file:
            file.write(code)

        completed = subprocess.run(
            [sys.executable, source_path],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )
        return {
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def run_cpp(code: str, user_input: str) -> dict:
    compiler = shutil.which("g++")
    if not compiler:
        return {"stdout": "", "stderr": "g++ compiler not found on this machine."}

    tmpdir = make_job_dir("cpp")
    try:
        source_path = os.path.join(tmpdir, "main.cpp")
        output_path = os.path.join(tmpdir, "main.exe")

        with open(source_path, "w", encoding="utf-8") as file:
            file.write(code)

        compile_result = subprocess.run(
            [compiler, source_path, "-o", output_path],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )

        if compile_result.returncode != 0:
            return {
                "stdout": "",
                "stderr": compile_result.stderr or compile_result.stdout or "Compilation failed.",
            }

        completed = subprocess.run(
            [output_path],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )
        return {
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def run_javascript(code: str, user_input: str) -> dict:
    node_path = shutil.which("node")
    if not node_path:
        return {"stdout": "", "stderr": "Node.js runtime not found on this machine."}

    tmpdir = make_job_dir("js")
    try:
        source_path = os.path.join(tmpdir, "main.js")
        with open(source_path, "w", encoding="utf-8") as file:
            file.write(code)

        completed = subprocess.run(
            [node_path, source_path],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )
        return {
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def find_latest_directory(base_path: str) -> str | None:
    if not os.path.isdir(base_path):
        return None

    directories = [entry.path for entry in os.scandir(base_path) if entry.is_dir()]
    if not directories:
        return None

    return sorted(directories)[-1]


def resolve_bundled_tool(executable_name: str) -> str | None:
    file_name = f"{executable_name}.exe" if os.name == "nt" else executable_name
    java_home = os.environ.get("JAVA_HOME")

    candidate_homes = []
    if java_home:
        candidate_homes.append(java_home)

    bundled_jdk_home = os.path.join(TOOLS_DIR, "jdk")
    candidate_homes.append(bundled_jdk_home)

    extracted_jdk_home = find_latest_directory(os.path.join(TOOLS_DIR, "temurin-extract"))
    if extracted_jdk_home:
        candidate_homes.append(extracted_jdk_home)

    for home in candidate_homes:
        tool_path = os.path.join(home, "bin", file_name)
        if os.path.exists(tool_path):
            return tool_path

    return shutil.which(executable_name)


def run_csharp(code: str, user_input: str) -> dict:
    dotnet_path = shutil.which("dotnet")
    if not dotnet_path:
        return {"stdout": "", "stderr": ".NET SDK was not found on this machine."}

    dotnet_root = Path(dotnet_path).resolve().parent
    sdk_dir = find_latest_directory(str(dotnet_root / "sdk"))
    shared_dir = find_latest_directory(str(dotnet_root / "shared" / "Microsoft.NETCore.App"))
    ref_dir = find_latest_directory(str(dotnet_root / "packs" / "Microsoft.NETCore.App.Ref"))

    if not sdk_dir or not shared_dir or not ref_dir:
        return {"stdout": "", "stderr": "The .NET reference packs required for C# execution were not found."}

    csc_path = os.path.join(sdk_dir, "Roslyn", "bincore", "csc.dll")
    target_framework_dir = find_latest_directory(os.path.join(ref_dir, "ref"))
    target_framework = os.path.basename(target_framework_dir) if target_framework_dir else None
    shared_version = os.path.basename(shared_dir)
    net_ref_dir = target_framework_dir

    if not os.path.exists(csc_path) or not target_framework or not os.path.isdir(net_ref_dir):
        return {"stdout": "", "stderr": "The C# compiler files are incomplete on this machine."}

    references = []
    for file_name in os.listdir(net_ref_dir):
        if file_name.endswith(".dll"):
            references.append(f"-r:{os.path.join(net_ref_dir, file_name)}")

    tmpdir = make_job_dir("cs")
    try:
        source_path = os.path.join(tmpdir, "Program.cs")
        assembly_path = os.path.join(tmpdir, "Program.dll")
        runtime_config_path = os.path.join(tmpdir, "Program.runtimeconfig.json")

        with open(source_path, "w", encoding="utf-8") as file:
            file.write(code)

        compile_result = subprocess.run(
            [dotnet_path, csc_path, "-nologo", "-target:exe", f"-out:{assembly_path}", *references, source_path],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )

        if compile_result.returncode != 0:
            return {
                "stdout": "",
                "stderr": compile_result.stderr or compile_result.stdout or "Compilation failed.",
            }

        with open(runtime_config_path, "w", encoding="utf-8") as file:
            json.dump(
                {
                    "runtimeOptions": {
                        "tfm": target_framework,
                        "framework": {
                            "name": "Microsoft.NETCore.App",
                            "version": shared_version,
                        },
                    }
                },
                file,
            )

        completed = subprocess.run(
            [dotnet_path, assembly_path],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )
        return {
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def run_java(code: str, user_input: str) -> dict:
    javac_path = resolve_bundled_tool("javac")
    java_path = resolve_bundled_tool("java")
    if not javac_path or not java_path:
        return {"stdout": "", "stderr": "Java is not installed on this machine. Install JDK to run Java code."}

    tmpdir = make_job_dir("java")
    try:
        source_path = os.path.join(tmpdir, "Main.java")
        with open(source_path, "w", encoding="utf-8") as file:
            file.write(code)

        compile_result = subprocess.run(
            [javac_path, source_path],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )

        if compile_result.returncode != 0:
            return {
                "stdout": "",
                "stderr": compile_result.stderr or compile_result.stdout or "Compilation failed.",
            }

        completed = subprocess.run(
            [java_path, "Main"],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tmpdir,
        )
        return {
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


class LocalRunnerHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/execute":
            self._send_json(404, {"error": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))
            code = payload.get("code", "")
            language = payload.get("language", "")
            user_input = payload.get("input", "")

            if language == "py":
                result = run_python(code, user_input)
            elif language == "cpp":
                result = run_cpp(code, user_input)
            elif language == "js":
                result = run_javascript(code, user_input)
            elif language == "cs":
                result = run_csharp(code, user_input)
            elif language == "java":
                result = run_java(code, user_input)
            else:
                self._send_json(400, {"error": "Unsupported language"})
                return

            self._send_json(200, result)
        except subprocess.TimeoutExpired:
            self._send_json(200, {"stdout": "", "stderr": "Execution timed out after 6 seconds"})
        except Exception as error:
            self._send_json(500, {"error": str(error)})

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
            return

        self._send_json(404, {"error": "Not found"})

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), LocalRunnerHandler)
    server.serve_forever()
