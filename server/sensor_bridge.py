"""Read the ESP32 on COM5 and serve soil moisture plus the pump state.

GET and POST /api/sensor are the only sensor endpoint. The ESP32 prints
"Moisture: <n>% | Pump: ON|OFF|STANDBY". This process records those lines.
It does not choose when the pump runs.
"""

import base64
import json
import os
import re
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

COM_PORT = "COM5"
BAUD = 115200
HTTP_HOST = "0.0.0.0"
HTTP_PORT = 5001
STALE_SECONDS = 12
MAX_GAP_SECONDS = 15
GRAPH_POINTS = 36
KEEP_SECONDS = 6 * 60 * 60

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
HISTORY_PATH = os.path.join(DATA_DIR, "readings.jsonl")

MOISTURE_RE = re.compile(r"Moisture:\s*(-?\d+)")

state = {
    "moisture": None,
    "updated_at": None,
    "pump": None,
    "motor": None,
    "samples": [],
    "on_count": 0,
    "on_seconds": 0.0,
    "last_on_at": None,
    "last_off_at": None,
    "previous": None,
}
lock = threading.Lock()


def iso(timestamp):
    if timestamp is None:
        return None
    millis = int((timestamp % 1) * 1000)
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(timestamp)) + f".{millis:03d}Z"


def motor_from_pump(pump):
    token = str(pump or "").strip().upper()
    if token == "ON":
        return "ON"
    if token in ("OFF", "STANDBY"):
        return "OFF"
    return None


def reason_for(pump, moisture):
    token = str(pump or "").strip().upper()
    level = "an unread level" if moisture is None else f"{int(moisture)}%"
    if token == "ON":
        return f"The ESP32 turned the pump on. Soil moisture is {level}."
    if token == "STANDBY":
        return f"The ESP32 reports standby, so the pump is off. Soil moisture is {level}."
    if token == "OFF":
        return f"The ESP32 turned the pump off. Soil moisture is {level}."
    return "The ESP32 has not reported a pump state yet."


def remember(now, moisture, motor, pump):
    previous = state["previous"]
    if previous and previous["motor"] == "ON" and motor == "ON":
        gap = now - previous["t"]
        if 0 < gap <= MAX_GAP_SECONDS:
            state["on_seconds"] += gap
    if motor == "ON" and (previous is None or previous["motor"] != "ON"):
        state["on_count"] += 1
        state["last_on_at"] = now
    if motor == "OFF" and previous and previous["motor"] == "ON":
        state["last_off_at"] = now
    sample = {"t": now, "moisture": moisture, "motor": motor, "pump": pump}
    state["samples"].append(sample)
    state["previous"] = sample
    cutoff = now - KEEP_SECONDS
    if len(state["samples"]) > 4000:
        state["samples"] = [item for item in state["samples"] if item["t"] >= cutoff]


def append_sample(sample):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(HISTORY_PATH, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(sample) + "\n")


def load_history():
    if not os.path.exists(HISTORY_PATH):
        return
    kept = []
    cutoff = time.time() - KEEP_SECONDS
    try:
        with open(HISTORY_PATH, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
    except OSError:
        return
    for line in lines:
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        timestamp = item.get("t")
        moisture = item.get("moisture")
        motor = item.get("motor")
        pump = item.get("pump")
        if not isinstance(timestamp, (int, float)) or timestamp < cutoff:
            continue
        if motor not in ("ON", "OFF"):
            continue
        if isinstance(moisture, bool) or not isinstance(moisture, (int, float)):
            continue
        sample = {
            "t": float(timestamp),
            "moisture": max(0, min(100, int(moisture))),
            "motor": motor,
            "pump": pump if isinstance(pump, str) else motor,
        }
        kept.append(sample)
        remember(sample["t"], sample["moisture"], sample["motor"], sample["pump"])
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(HISTORY_PATH, "w", encoding="utf-8") as handle:
            for sample in kept:
                handle.write(json.dumps(sample) + "\n")
    except OSError:
        return


def graph_points(now):
    window = [item for item in state["samples"] if now - item["t"] <= 30 * 60]
    if len(window) <= GRAPH_POINTS:
        chosen = window
    else:
        last = len(window) - 1
        chosen = []
        used = set()
        for index in range(GRAPH_POINTS):
            pick = round(index * last / (GRAPH_POINTS - 1))
            if pick in used:
                continue
            used.add(pick)
            chosen.append(window[pick])
    return [
        {
            "at": iso(item["t"]),
            "moisture": item["moisture"],
            "motor": item["motor"],
        }
        for item in chosen
    ]


def apply_reading(moisture, pump=None):
    value = max(0, min(100, int(moisture)))
    now = time.time()
    motor = motor_from_pump(pump) if pump else None
    sample = None
    with lock:
        changed = state["moisture"] != value or (motor and state["motor"] != motor)
        state["moisture"] = value
        state["updated_at"] = now
        if pump:
            state["pump"] = str(pump).strip().upper()
        if motor:
            state["motor"] = motor
            remember(now, value, motor, state["pump"])
            sample = {"t": now, "moisture": value, "motor": motor, "pump": state["pump"]}
    if sample:
        append_sample(sample)
    if changed:
        label = motor or "unread"
        print(f"moisture {value}% motor {label}", flush=True)


def read_serial():
    import serial

    while True:
        try:
            with serial.Serial(COM_PORT, BAUD, timeout=1) as port:
                print(f"serial open {COM_PORT} {BAUD}", flush=True)
                while True:
                    raw = port.readline()
                    if not raw:
                        continue
                    line = raw.decode("utf-8", errors="ignore").strip()
                    match = MOISTURE_RE.search(line)
                    if not match:
                        continue
                    pump = None
                    if "Pump:" in line:
                        pump = line.split("Pump:", 1)[1].split("|", 1)[0].strip()
                    apply_reading(match.group(1), pump)
        except Exception as error:
            print(f"serial wait {COM_PORT}: {error}", flush=True)
            time.sleep(2)


def payload():
    now = time.time()
    with lock:
        moisture = state["moisture"]
        updated = state["updated_at"]
        pump = state["pump"]
        motor = state["motor"]
        on_seconds = state["on_seconds"]
        previous = state["previous"]
        on_count = state["on_count"]
        last_on_at = state["last_on_at"]
        last_off_at = state["last_off_at"]
        history = graph_points(now)
    live = updated is not None and (now - updated) <= STALE_SECONDS and moisture is not None
    if live and previous and previous["motor"] == "ON" and motor == "ON":
        gap = now - previous["t"]
        if 0 < gap <= MAX_GAP_SECONDS:
            on_seconds += gap
    return {
        "soilMoisture": moisture,
        "moisture": moisture,
        "status": "live" if live else "offline",
        "updatedAt": iso(updated),
        "pump": pump,
        "motorMonitor": {
            "motor": motor,
            "reason": reason_for(pump, moisture),
            "moisture": moisture,
            "status": "live" if live else "offline",
            "statistics": {
                "status": motor,
                "totalOnSeconds": round(on_seconds, 1),
                "onCount": on_count,
                "lastOnAt": iso(last_on_at),
                "lastOffAt": iso(last_off_at),
            },
            "history": history,
        },
    }


predict_lock = threading.Lock()
fertilizer_lock = threading.Lock()
MAX_IMAGE_BYTES = 8 * 1024 * 1024


def run_fertilizer_prediction(features: dict) -> dict:
    from predict_fertilizer import predict_fertilizer

    with fertilizer_lock:
        return predict_fertilizer(features)


def run_prediction(image_bytes):
    from predict_crop import predict_crop

    handle, path = tempfile.mkstemp(suffix=".jpg")
    os.close(handle)
    try:
        with open(path, "wb") as image_file:
            image_file.write(image_bytes)
        with predict_lock:
            return predict_crop(path)
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send(self, body, status=200):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_IMAGE_BYTES:
            return None, "Image is too large."
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return None, "The photo could not be read."
        if not isinstance(body, dict):
            return None, "The photo could not be read."
        return body, None

    def _predict(self):
        body, error = self._read_json()
        if error:
            self._send({"error": error}, 400)
            return
        encoded = body.get("imageBase64") or body.get("image")
        if not isinstance(encoded, str) or not encoded.strip():
            self._send({"error": "Choose a crop photo first."}, 400)
            return
        if "," in encoded and encoded.strip().lower().startswith("data:"):
            encoded = encoded.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(encoded, validate=False)
        except Exception:
            self._send({"error": "The photo data was not valid."}, 400)
            return
        if not image_bytes:
            self._send({"error": "The photo was empty."}, 400)
            return
        try:
            result = run_prediction(image_bytes)
        except Exception as exc:
            self._send({"error": f"Prediction failed. {exc}"}, 500)
            return
        self._send(result)

    def _fertilizer(self):
        body, error = self._read_json()
        if error:
            self._send({"error": error}, 400)
            return
        features = body.get("features")
        if not isinstance(features, dict) or not features:
            self._send({"error": "Send a JSON body with a 'features' key containing soil/crop data."}, 400)
            return
        try:
            result = run_fertilizer_prediction(features)
        except Exception as exc:
            self._send({"error": f"Fertilizer prediction failed: {exc}"}, 500)
            return
        self._send(result)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.split("?", 1)[0] != "/api/sensor":
            self.send_error(404)
            return
        self._send(payload())

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/predict":
            self._predict()
            return
        if path == "/api/fertilizer":
            self._fertilizer()
            return
        if path != "/api/sensor":
            self.send_error(404)
            return
        body, error = self._read_json()
        if error or body is None:
            self._send({"error": error or "Could not read the sensor update."}, 400)
            return
        value = body.get("soilMoisture", body.get("moisture"))
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            apply_reading(value)
        self._send(payload())

    def log_message(self, fmt, *args):
        return


def main():
    load_history()
    threading.Thread(target=read_serial, daemon=True).start()
    server = ThreadingHTTPServer((HTTP_HOST, HTTP_PORT), Handler)
    print(f"sensor api     http://0.0.0.0:{HTTP_PORT}/api/sensor", flush=True)
    print(f"predict api    http://0.0.0.0:{HTTP_PORT}/api/predict", flush=True)
    print(f"fertilizer api http://0.0.0.0:{HTTP_PORT}/api/fertilizer", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
