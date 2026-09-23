#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nokta Academy — Start_Program
Graphical launcher to start/stop backend + frontend and open the home page.
Works fully offline once Node/MongoDB/Python are installed locally.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path
from typing import Any

try:
    import tkinter as tk
    from tkinter import messagebox, scrolledtext
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "tkinter is required. Install Python with Tcl/Tk support, then run Start_Program again."
    ) from exc


# ---------------------------------------------------------------------------
# Paths & constants
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
RUNTIME_DIR = ROOT / ".start-program-runtime"
STATE_FILE = RUNTIME_DIR / "state.json"
LOGO_SVG = FRONTEND_DIR / "public" / "academy-logo.svg"
LOGO_ASSET = RUNTIME_DIR / "nokta-logo.png"

DEFAULT_BACKEND_PORT = 8081
DEFAULT_FRONTEND_PORT = 5173
HEALTH_TIMEOUT_SEC = 120
POLL_INTERVAL_SEC = 0.5
MONGO_SERVICE_NAMES = ("MongoDB", "MongoDB Server", "mongodb")

# Brand colors (Nokta Academy)
COLOR_BG = "#0b1220"
COLOR_PANEL = "#111827"
COLOR_BORDER = "#1e293b"
COLOR_TEXT = "#e2e8f0"
COLOR_MUTED = "#94a3b8"
COLOR_CYAN = "#22d3ee"
COLOR_SKY = "#0ea5e9"
COLOR_GREEN = "#22c55e"
COLOR_ROSE = "#f43f5e"
COLOR_AMBER = "#f59e0b"


def ensure_runtime_dir() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)


def read_backend_port() -> int:
    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        return DEFAULT_BACKEND_PORT
    try:
        text = env_path.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r"^PORT\s*=\s*(\d+)\s*$", text, flags=re.MULTILINE)
        if match:
            return int(match.group(1))
    except OSError:
        pass
    return DEFAULT_BACKEND_PORT


def which_npm() -> str | None:
    for name in ("npm.cmd", "npm"):
        found = shutil.which(name)
        if found:
            return found
    return None


def which_node() -> str | None:
    for name in ("node.exe", "node"):
        found = shutil.which(name)
        if found:
            return found
    return None


def port_open(host: str, port: int, timeout: float = 0.6) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def wait_for_port(port: int, timeout_sec: float = HEALTH_TIMEOUT_SEC) -> bool:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        if port_open("127.0.0.1", port):
            return True
        time.sleep(POLL_INTERVAL_SEC)
    return False


def http_health_ok(port: int) -> bool:
    try:
        import urllib.request

        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=4) as response:
            body = response.read().decode("utf-8", errors="ignore")
            return response.status == 200 and ("ok" in body.lower() or '"success"' in body.lower() or body.strip() != "")
    except Exception:
        return False


def load_state() -> dict[str, Any]:
    ensure_runtime_dir()
    if not STATE_FILE.exists():
        return {"pids": [], "backend_port": DEFAULT_BACKEND_PORT, "frontend_port": DEFAULT_FRONTEND_PORT}
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"pids": []}
        data.setdefault("pids", [])
        return data
    except (OSError, json.JSONDecodeError):
        return {"pids": []}


def save_state(state: dict[str, Any]) -> None:
    ensure_runtime_dir()
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def ensure_backend_env() -> None:
    env_path = BACKEND_DIR / ".env"
    example = BACKEND_DIR / ".env.example"
    if env_path.exists():
        return
    if example.exists():
        shutil.copy2(example, env_path)


def creation_flags() -> int:
    flags = 0
    if os.name == "nt":
        flags |= getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        flags |= getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
    return flags


def run_hidden(command: list[str], cwd: Path | None = None, timeout: float | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        timeout=timeout,
        creationflags=creation_flags() if os.name == "nt" else 0,
    )


def try_start_mongodb(log) -> None:
    if port_open("127.0.0.1", 27017):
        log("MongoDB already listening on 27017.")
        return
    if os.name != "nt":
        log("MongoDB is not running. Start it manually, then Activate again.")
        return

    log("Trying to start MongoDB Windows service...")
    for service_name in MONGO_SERVICE_NAMES:
        try:
            completed = run_hidden(
                [
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    f"Start-Service -Name '{service_name}' -ErrorAction SilentlyContinue",
                ],
                timeout=30,
            )
            time.sleep(1.2)
            if port_open("127.0.0.1", 27017):
                log(f"MongoDB service started ({service_name}).")
                return
            if completed.stderr and "cannot find" not in completed.stderr.lower():
                log(completed.stderr.strip()[:200])
        except Exception as exc:
            log(f"MongoDB service '{service_name}' skipped: {exc}")

    # Last resort: mongod on PATH
    mongod = shutil.which("mongod") or shutil.which("mongod.exe")
    if mongod:
        data_dir = RUNTIME_DIR / "mongodb-data"
        data_dir.mkdir(parents=True, exist_ok=True)
        log("Starting local mongod from PATH...")
        try:
            process = subprocess.Popen(
                [mongod, "--dbpath", str(data_dir), "--bind_ip", "127.0.0.1", "--port", "27017"],
                cwd=str(RUNTIME_DIR),
                stdout=open(RUNTIME_DIR / "mongodb.log", "a", encoding="utf-8", errors="replace"),
                stderr=subprocess.STDOUT,
                creationflags=creation_flags(),
            )
            save_state({**load_state(), "mongodb_pid": process.pid})
            for _ in range(20):
                if port_open("127.0.0.1", 27017):
                    log(f"Local mongod started (PID {process.pid}).")
                    return
                time.sleep(0.5)
        except Exception as exc:
            log(f"mongod start failed: {exc}")

    log("MongoDB did not start automatically. Start MongoDB manually if the API fails.")


def ensure_npm_dependencies(workdir: Path, name: str, log) -> None:
    modules = workdir / "node_modules"
    if modules.is_dir() and any(modules.iterdir()):
        return

    npm = which_npm()
    if not npm:
        raise RuntimeError("npm was not found. Install Node.js 18+ and reopen Start_Program.")

    package_lock = workdir / "package-lock.json"
    install_args = ["ci"] if package_lock.exists() else ["install"]
    log(f"{name}/node_modules missing — running npm {' '.join(install_args)} (one-time, may take a few minutes)...")

    # Prefer offline cache when packages were installed before.
    command = [npm, *install_args, "--prefer-offline", "--no-audit", "--no-fund"]
    if os.name == "nt":
        command = ["cmd.exe", "/d", "/c", *command]

    completed = subprocess.run(
        command,
        cwd=str(workdir),
        capture_output=True,
        text=True,
        timeout=900,
        creationflags=creation_flags() if os.name == "nt" else 0,
    )
    if completed.returncode != 0:
        tail = ((completed.stdout or "") + "\n" + (completed.stderr or "")).strip()[-800:]
        raise RuntimeError(f"Failed to install {name} dependencies.\n{tail}")

    if not modules.is_dir():
        raise RuntimeError(f"{name}/node_modules still missing after npm install.")
    log(f"{name} dependencies installed.")


def start_npm_process(name: str, workdir: Path, args: list[str], log_file: Path) -> int:
    npm = which_npm()
    if not npm:
        raise RuntimeError("npm was not found. Install Node.js 18+ and reopen Start_Program.")

    ensure_runtime_dir()
    log_file.parent.mkdir(parents=True, exist_ok=True)
    stdout = open(log_file, "a", encoding="utf-8", errors="replace")
    stderr = stdout

    env = os.environ.copy()
    env["FORCE_COLOR"] = "0"
    env["NPM_CONFIG_UPDATE_NOTIFIER"] = "false"
    # Prefer local tooling; no network required at runtime once deps exist.
    env.setdefault("npm_config_prefer_offline", "true")

    if os.name == "nt":
        command = ["cmd.exe", "/d", "/c", npm, *args]
    else:
        command = [npm, *args]

    process = subprocess.Popen(
        command,
        cwd=str(workdir),
        stdout=stdout,
        stderr=stderr,
        env=env,
        creationflags=creation_flags(),
        close_fds=False,
    )
    return int(process.pid)


def pids_listening_on_port(port: int) -> list[int]:
    if os.name != "nt":
        return []
    try:
        completed = run_hidden(["netstat", "-ano", "-p", "tcp"], timeout=15)
    except Exception:
        return []

    found: set[int] = set()
    pattern = re.compile(rf":{port}\s+.*LISTENING\s+(\d+)\s*$", re.IGNORECASE)
    for line in completed.stdout.splitlines():
        match = pattern.search(line.strip())
        if match:
            pid = int(match.group(1))
            if pid > 0:
                found.add(pid)
    return sorted(found)


def kill_pid_tree(pid: int) -> None:
    if pid <= 0:
        return
    if os.name == "nt":
        run_hidden(["taskkill", "/PID", str(pid), "/T", "/F"], timeout=30)
    else:
        try:
            os.kill(pid, 15)
        except OSError:
            pass


def kill_ports(ports: list[int], log) -> None:
    killed: set[int] = set()
    for port in ports:
        for pid in pids_listening_on_port(port):
            if pid in killed:
                continue
            log(f"Stopping process PID {pid} on port {port}...")
            kill_pid_tree(pid)
            killed.add(pid)
    time.sleep(0.6)


def prepare_logo_png() -> Path | None:
    """Create a simple PNG logo matching Nokta brand (stdlib only)."""
    ensure_runtime_dir()
    if LOGO_ASSET.exists() and LOGO_ASSET.stat().st_size > 0:
        return LOGO_ASSET

    try:
        import struct
        import zlib

        width = height = 64
        pixels = bytearray()
        for y in range(height):
            pixels.append(0)
            for x in range(width):
                r, g, b = 15, 23, 42
                if x < 2 or y < 2 or x >= width - 2 or y >= height - 2:
                    r, g, b = 30, 41, 59
                if 14 <= x <= 22 and 12 <= y <= 52:
                    r, g, b = 56, 189, 248
                if 42 <= x <= 50 and 12 <= y <= 52:
                    r, g, b = 34, 197, 94
                if 18 <= x <= 46:
                    diag_y = int(14 + (x - 18) * (36 / 28))
                    if abs(y - diag_y) <= 4:
                        r, g, b = 99, 102, 241
                pixels.extend((r, g, b, 255))

        def chunk(tag: bytes, data: bytes) -> bytes:
            return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

        raw = bytes(pixels)
        png = b"".join(
            [
                b"\x89PNG\r\n\x1a\n",
                chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
                chunk(b"IDAT", zlib.compress(raw, 9)),
                chunk(b"IEND", b""),
            ]
        )
        LOGO_ASSET.write_bytes(png)
        return LOGO_ASSET
    except Exception:
        return None


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------


class StartProgramApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Nokta Academy — Start Program")
        self.root.geometry("580x680")
        self.root.minsize(540, 620)
        self.root.configure(bg=COLOR_BG)
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

        self.backend_port = read_backend_port()
        self.frontend_port = DEFAULT_FRONTEND_PORT
        self.busy = False
        self.running = False
        self._lock = threading.Lock()

        self._build_ui()
        self._refresh_status_from_ports()
        self.root.after(2000, self._poll_status)

    def _build_ui(self) -> None:
        header = tk.Frame(self.root, bg=COLOR_BG)
        header.pack(fill="x", padx=24, pady=(22, 8))

        logo_path = prepare_logo_png()
        self.logo_image = None
        if logo_path and logo_path.exists():
            try:
                self.logo_image = tk.PhotoImage(file=str(logo_path))
                if self.logo_image.width() > 72:
                    self.logo_image = self.logo_image.subsample(
                        max(1, self.logo_image.width() // 64),
                        max(1, self.logo_image.height() // 64),
                    )
                tk.Label(header, image=self.logo_image, bg=COLOR_BG).pack(side="left", padx=(0, 14))
            except tk.TclError:
                self._draw_fallback_logo(header)
        else:
            self._draw_fallback_logo(header)

        titles = tk.Frame(header, bg=COLOR_BG)
        titles.pack(side="left", fill="x", expand=True)
        tk.Label(
            titles,
            text="Nokta Academy",
            font=("Segoe UI Semibold", 18),
            fg=COLOR_TEXT,
            bg=COLOR_BG,
        ).pack(anchor="w")
        tk.Label(
            titles,
            text="Start / Stop — Backend & Frontend (offline-ready)",
            font=("Segoe UI", 10),
            fg=COLOR_MUTED,
            bg=COLOR_BG,
        ).pack(anchor="w", pady=(2, 0))

        card = tk.Frame(self.root, bg=COLOR_PANEL, highlightbackground=COLOR_BORDER, highlightthickness=1)
        card.pack(fill="x", padx=24, pady=10)

        self.status_var = tk.StringVar(value="Stopped")
        self.detail_var = tk.StringVar(value="Press Activate to start all project servers.")

        tk.Label(card, text="Status", font=("Segoe UI", 9), fg=COLOR_MUTED, bg=COLOR_PANEL).pack(
            anchor="w", padx=16, pady=(14, 0)
        )
        self.status_label = tk.Label(
            card,
            textvariable=self.status_var,
            font=("Segoe UI Semibold", 14),
            fg=COLOR_AMBER,
            bg=COLOR_PANEL,
        )
        self.status_label.pack(anchor="w", padx=16, pady=(2, 0))
        tk.Label(
            card,
            textvariable=self.detail_var,
            font=("Segoe UI", 10),
            fg=COLOR_MUTED,
            bg=COLOR_PANEL,
            wraplength=500,
            justify="left",
        ).pack(anchor="w", padx=16, pady=(4, 16))

        ports = tk.Frame(self.root, bg=COLOR_BG)
        ports.pack(fill="x", padx=24, pady=(0, 8))
        self.ports_var = tk.StringVar(
            value=f"API: 127.0.0.1:{self.backend_port}   ·   App: 127.0.0.1:{self.frontend_port}"
        )
        tk.Label(ports, textvariable=self.ports_var, font=("Segoe UI", 9), fg=COLOR_CYAN, bg=COLOR_BG).pack(anchor="w")

        buttons = tk.Frame(self.root, bg=COLOR_BG)
        buttons.pack(fill="x", padx=24, pady=8)

        self.btn_start = tk.Button(
            buttons,
            text="▶  Activate System",
            command=self.on_start,
            font=("Segoe UI Semibold", 11),
            fg="#041016",
            bg=COLOR_GREEN,
            activebackground="#16a34a",
            activeforeground="#041016",
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=10,
        )
        self.btn_start.pack(fill="x", pady=(0, 8))

        self.btn_stop = tk.Button(
            buttons,
            text="■  Stop Program",
            command=self.on_stop,
            font=("Segoe UI Semibold", 11),
            fg="#fff1f2",
            bg=COLOR_ROSE,
            activebackground="#e11d48",
            activeforeground="#fff1f2",
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=10,
            state="disabled",
        )
        self.btn_stop.pack(fill="x", pady=(0, 8))

        self.btn_open = tk.Button(
            buttons,
            text="🌐  Open Home Page in Browser",
            command=self.on_open_browser,
            font=("Segoe UI Semibold", 11),
            fg="#041016",
            bg=COLOR_SKY,
            activebackground="#0284c7",
            activeforeground="#041016",
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=10,
            state="disabled",
        )
        self.btn_open.pack(fill="x")

        tk.Label(
            self.root,
            text="Activity log",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED,
            bg=COLOR_BG,
        ).pack(anchor="w", padx=24, pady=(14, 4))

        self.log_box = scrolledtext.ScrolledText(
            self.root,
            height=12,
            font=("Consolas", 9),
            bg="#020617",
            fg=COLOR_TEXT,
            insertbackground=COLOR_TEXT,
            relief="flat",
            highlightthickness=1,
            highlightbackground=COLOR_BORDER,
        )
        self.log_box.pack(fill="both", expand=True, padx=24, pady=(0, 20))
        self.log_box.configure(state="disabled")

        self.log("Ready. Project root: " + str(ROOT))
        self.log("Tip: Activate starts servers. Stop closes them. Closing this window can also stop servers.")

    def _draw_fallback_logo(self, parent: tk.Widget) -> None:
        canvas = tk.Canvas(parent, width=64, height=64, bg=COLOR_BG, highlightthickness=0)
        canvas.pack(side="left", padx=(0, 14))
        canvas.create_rectangle(2, 2, 62, 62, fill="#0f172a", outline="#334155", width=2)
        canvas.create_text(32, 32, text="N", fill=COLOR_CYAN, font=("Segoe UI Black", 28))

    def log(self, message: str) -> None:
        stamp = time.strftime("%H:%M:%S")
        line = f"[{stamp}] {message}\n"

        def append() -> None:
            self.log_box.configure(state="normal")
            self.log_box.insert("end", line)
            self.log_box.see("end")
            self.log_box.configure(state="disabled")

        self.root.after(0, append)

    def set_status(self, title: str, detail: str, color: str) -> None:
        def apply() -> None:
            self.status_var.set(title)
            self.detail_var.set(detail)
            self.status_label.configure(fg=color)

        self.root.after(0, apply)

    def set_buttons(self, *, start: bool, stop: bool, open_page: bool) -> None:
        def apply() -> None:
            self.btn_start.configure(state="normal" if start and not self.busy else "disabled")
            self.btn_stop.configure(state="normal" if stop and not self.busy else "disabled")
            self.btn_open.configure(state="normal" if open_page else "disabled")
            if self.busy:
                self.btn_start.configure(state="disabled")
                self.btn_stop.configure(state="disabled")

        self.root.after(0, apply)

    def home_url(self) -> str:
        return f"http://127.0.0.1:{self.frontend_port}/"

    def _refresh_status_from_ports(self) -> None:
        backend_up = port_open("127.0.0.1", self.backend_port)
        frontend_up = port_open("127.0.0.1", self.frontend_port)
        self.running = backend_up and frontend_up
        self.ports_var.set(
            f"API: 127.0.0.1:{self.backend_port}   ·   App: 127.0.0.1:{self.frontend_port}"
        )
        if self.running:
            self.set_status("Running", f"Servers are online. Open {self.home_url()}", COLOR_GREEN)
            self.set_buttons(start=False, stop=True, open_page=True)
        elif backend_up or frontend_up:
            self.set_status(
                "Partial",
                f"Backend={'UP' if backend_up else 'DOWN'} · Frontend={'UP' if frontend_up else 'DOWN'}",
                COLOR_AMBER,
            )
            self.set_buttons(start=True, stop=True, open_page=frontend_up)
        else:
            self.set_status("Stopped", "Press Activate to start all project servers.", COLOR_AMBER)
            self.set_buttons(start=True, stop=False, open_page=False)

    def _poll_status(self) -> None:
        if not self.busy:
            self._refresh_status_from_ports()
        self.root.after(2500, self._poll_status)

    def on_start(self) -> None:
        if self.busy:
            return
        threading.Thread(target=self._start_worker, daemon=True).start()

    def on_stop(self) -> None:
        if self.busy:
            return
        threading.Thread(target=self._stop_worker, daemon=True).start()

    def on_open_browser(self) -> None:
        url = self.home_url()
        if not port_open("127.0.0.1", self.frontend_port):
            messagebox.showwarning("Not ready", "Frontend is not running yet. Activate the system first.")
            return
        self.log(f"Opening browser: {url}")
        webbrowser.open(url)

    def _start_worker(self) -> None:
        with self._lock:
            if self.busy:
                return
            self.busy = True

        try:
            self.set_buttons(start=False, stop=False, open_page=False)
            self.set_status("Starting…", "Preparing backend and frontend services.", COLOR_CYAN)
            self.log("Activate requested.")

            if not BACKEND_DIR.is_dir() or not FRONTEND_DIR.is_dir():
                raise RuntimeError("backend/ or frontend/ folder not found next to Start_Program.py")

            if not which_node() or not which_npm():
                raise RuntimeError("Node.js / npm not found. Install Node.js 18+ and try again.")

            ensure_backend_env()
            ensure_npm_dependencies(BACKEND_DIR, "backend", self.log)
            ensure_npm_dependencies(FRONTEND_DIR, "frontend", self.log)

            self.backend_port = read_backend_port()
            self.frontend_port = DEFAULT_FRONTEND_PORT
            self.root.after(
                0,
                lambda: self.ports_var.set(
                    f"API: 127.0.0.1:{self.backend_port}   ·   App: 127.0.0.1:{self.frontend_port}"
                ),
            )

            try_start_mongodb(self.log)

            if port_open("127.0.0.1", self.backend_port) and port_open("127.0.0.1", self.frontend_port):
                self.log("Servers were already running.")
                self.running = True
                self.set_status("Running", f"Already online — {self.home_url()}", COLOR_GREEN)
                self.set_buttons(start=False, stop=True, open_page=True)
                return

            state = load_state()
            pids: list[int] = list(state.get("pids") or [])

            if not port_open("127.0.0.1", self.backend_port):
                self.log(f"Starting backend (npm run dev) on port {self.backend_port}...")
                backend_pid = start_npm_process(
                    "backend",
                    BACKEND_DIR,
                    ["run", "dev"],
                    RUNTIME_DIR / "backend.log",
                )
                pids.append(backend_pid)
                self.log(f"Backend process started (PID {backend_pid}).")
            else:
                self.log(f"Backend already listening on {self.backend_port}.")

            self.log("Waiting for backend health...")
            if not wait_for_port(self.backend_port):
                raise RuntimeError(
                    f"Backend did not open port {self.backend_port}. See .start-program-runtime/backend.log"
                )

            for _ in range(30):
                if http_health_ok(self.backend_port) or port_open("127.0.0.1", self.backend_port):
                    break
                time.sleep(0.4)
            self.log("Backend is ready.")

            if not port_open("127.0.0.1", self.frontend_port):
                self.log(f"Starting frontend (npm run dev) on port {self.frontend_port}...")
                frontend_pid = start_npm_process(
                    "frontend",
                    FRONTEND_DIR,
                    ["run", "dev", "--", "--host", "127.0.0.1", "--port", str(self.frontend_port)],
                    RUNTIME_DIR / "frontend.log",
                )
                pids.append(frontend_pid)
                self.log(f"Frontend process started (PID {frontend_pid}).")
            else:
                self.log(f"Frontend already listening on {self.frontend_port}.")

            self.log("Waiting for frontend...")
            if not wait_for_port(self.frontend_port):
                raise RuntimeError(
                    f"Frontend did not open port {self.frontend_port}. See .start-program-runtime/frontend.log"
                )

            save_state(
                {
                    "pids": sorted(set(pids)),
                    "backend_port": self.backend_port,
                    "frontend_port": self.frontend_port,
                    "home_url": self.home_url(),
                    "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

            self.running = True
            self.log(f"System ready: {self.home_url()}")
            self.set_status("Running", f"Click Open Home Page — {self.home_url()}", COLOR_GREEN)
            self.set_buttons(start=False, stop=True, open_page=True)

            # Auto-open browser once when freshly started.
            self.root.after(400, self.on_open_browser)
        except Exception as exc:
            self.log(f"ERROR: {exc}")
            self.set_status("Failed", str(exc), COLOR_ROSE)
            self._refresh_status_from_ports()
            self.root.after(0, lambda: messagebox.showerror("Start failed", str(exc)))
        finally:
            self.busy = False
            self.root.after(0, self._refresh_status_from_ports)

    def _stop_worker(self) -> None:
        with self._lock:
            if self.busy:
                return
            self.busy = True

        try:
            self.set_buttons(start=False, stop=False, open_page=False)
            self.set_status("Stopping…", "Closing project servers on this computer.", COLOR_AMBER)
            self.log("Stop requested.")

            state = load_state()
            for pid in list(state.get("pids") or []):
                self.log(f"Stopping tracked PID {pid}...")
                kill_pid_tree(int(pid))

            mongo_pid = state.get("mongodb_pid")
            if mongo_pid:
                self.log(f"Stopping local mongod PID {mongo_pid}...")
                kill_pid_tree(int(mongo_pid))

            kill_ports([self.backend_port, self.frontend_port], self.log)
            time.sleep(0.5)
            kill_ports([self.backend_port, self.frontend_port], self.log)

            save_state(
                {
                    "pids": [],
                    "backend_port": self.backend_port,
                    "frontend_port": self.frontend_port,
                    "stopped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

            self.running = False
            self.log("All project services stopped.")
            self.set_status("Stopped", "All project servers for this app were stopped.", COLOR_AMBER)
            self.set_buttons(start=True, stop=False, open_page=False)
        except Exception as exc:
            self.log(f"ERROR while stopping: {exc}")
            self.set_status("Stop error", str(exc), COLOR_ROSE)
            self.root.after(0, lambda: messagebox.showerror("Stop failed", str(exc)))
        finally:
            self.busy = False
            self.root.after(0, self._refresh_status_from_ports)

    def on_close(self) -> None:
        if self.busy:
            messagebox.showinfo("Please wait", "A start/stop operation is still running.")
            return

        backend_up = port_open("127.0.0.1", self.backend_port)
        frontend_up = port_open("127.0.0.1", self.frontend_port)
        if backend_up or frontend_up:
            answer = messagebox.askyesnocancel(
                "Stop servers?",
                "Servers are still running.\n\n"
                "Yes = stop servers and exit\n"
                "No = keep servers running and exit\n"
                "Cancel = stay in Start Program",
            )
            if answer is None:
                return
            if answer:
                self._stop_worker()
                # Give stop a moment on the UI thread via short wait loop
                deadline = time.time() + 25
                while self.busy and time.time() < deadline:
                    self.root.update()
                    time.sleep(0.1)

        self.root.destroy()


def main() -> None:
    ensure_runtime_dir()
    root = tk.Tk()
    logo = prepare_logo_png()
    if logo and logo.exists():
        try:
            icon = tk.PhotoImage(file=str(logo))
            root.iconphoto(True, icon)
            root._nokta_icon = icon  # keep reference
        except Exception:
            pass
    StartProgramApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
