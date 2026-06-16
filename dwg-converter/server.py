#!/usr/bin/env python3
"""
DWG converter sidecar.

Endpoints
---------
GET  /health              → {"status":"ok"}
POST /convert             → raw DXF text  (DWG bytes in body)
POST /convert-geojson     → GeoJSON FeatureCollection (DWG bytes in body)
"""

import http.server
import json
import math
import os
import subprocess
import tempfile
import threading

import ezdxf  # imported at startup so it's cached for all requests


# ── GeoJSON conversion using ezdxf ────────────────────────────────────────────

def dxf_to_geojson(dxf_path: str) -> dict:
    try:
        doc = ezdxf.readfile(dxf_path)
    except Exception as e:
        raise RuntimeError(f"ezdxf could not read DXF: {e}")

    msp = doc.modelspace()
    features = []
    layers: set[str] = set()

    def add(feat):
        if feat:
            layer = feat["properties"].get("_dxf_layer", "0")
            if layer:
                layers.add(layer)
            features.append(feat)

    def props(entity):
        return {
            "_dxf_type":   entity.dxftype(),
            "_dxf_layer":  entity.dxf.get("layer", "0"),
        }

    def xy(v) -> list:
        return [v.x, v.y]

    for e in msp:
        t = e.dxftype()
        try:
            if t == "LINE":
                add({"type": "Feature",
                     "geometry": {"type": "LineString",
                                  "coordinates": [xy(e.dxf.start), xy(e.dxf.end)]},
                     "properties": props(e)})

            elif t == "LWPOLYLINE":
                pts = [[p[0], p[1]] for p in e.get_points()]
                if len(pts) < 2:
                    continue
                if e.closed and len(pts) >= 3:
                    pts.append(pts[0])
                    add({"type": "Feature",
                         "geometry": {"type": "Polygon", "coordinates": [pts]},
                         "properties": props(e)})
                else:
                    add({"type": "Feature",
                         "geometry": {"type": "LineString", "coordinates": pts},
                         "properties": props(e)})

            elif t == "POLYLINE":
                verts = [xy(v.dxf.location) for v in e.vertices]
                if len(verts) < 2:
                    continue
                closed = getattr(e, "is_closed", False)
                if closed and len(verts) >= 3:
                    verts.append(verts[0])
                    add({"type": "Feature",
                         "geometry": {"type": "Polygon", "coordinates": [verts]},
                         "properties": props(e)})
                else:
                    add({"type": "Feature",
                         "geometry": {"type": "LineString", "coordinates": verts},
                         "properties": props(e)})

            elif t == "POINT":
                add({"type": "Feature",
                     "geometry": {"type": "Point", "coordinates": xy(e.dxf.location)},
                     "properties": props(e)})

            elif t == "CIRCLE":
                c, r = e.dxf.center, e.dxf.radius
                steps = 64
                ring = [
                    [c.x + math.cos(2*math.pi*i/steps)*r,
                     c.y + math.sin(2*math.pi*i/steps)*r]
                    for i in range(steps+1)
                ]
                ring[-1] = ring[0]
                add({"type": "Feature",
                     "geometry": {"type": "Polygon", "coordinates": [ring]},
                     "properties": {**props(e), "_radius": r}})

            elif t == "ARC":
                c, r = e.dxf.center, e.dxf.radius
                sa = math.radians(e.dxf.start_angle)
                ea = math.radians(e.dxf.end_angle)
                if ea <= sa:
                    ea += 2*math.pi
                steps = max(12, int((ea-sa)/math.pi*32))
                coords = [
                    [c.x + math.cos(sa + i*(ea-sa)/steps)*r,
                     c.y + math.sin(sa + i*(ea-sa)/steps)*r]
                    for i in range(steps+1)
                ]
                add({"type": "Feature",
                     "geometry": {"type": "LineString", "coordinates": coords},
                     "properties": props(e)})

            elif t == "SPLINE":
                cpts = list(e.control_points)
                if len(cpts) < 2:
                    continue
                add({"type": "Feature",
                     "geometry": {"type": "LineString",
                                  "coordinates": [[p.x, p.y] for p in cpts]},
                     "properties": props(e)})

            elif t in ("TEXT", "ATTDEF", "ATTRIB"):
                ins = e.dxf.get("insert", None) or e.dxf.get("start_point", None)
                if not ins:
                    continue
                add({"type": "Feature",
                     "geometry": {"type": "Point", "coordinates": xy(ins)},
                     "properties": {**props(e), "label": e.dxf.get("text", "")}})

            elif t == "MTEXT":
                ins = e.dxf.get("insert", None)
                if not ins:
                    continue
                add({"type": "Feature",
                     "geometry": {"type": "Point", "coordinates": xy(ins)},
                     "properties": {**props(e), "label": e.text}})

        except Exception:
            pass

    return {
        "type": "FeatureCollection",
        "features": features,
        "layerNames": sorted(layers),
    }


def dwg_bytes_to_dxf(dwg_data: bytes, tmp: str) -> str:
    """Convert DWG bytes → DXF path using dwg2dxf."""
    dwg_path = os.path.join(tmp, "input.dwg")
    dxf_path = os.path.join(tmp, "input.dxf")
    with open(dwg_path, "wb") as f:
        f.write(dwg_data)

    # No --as flag: output native DXF version (faster, avoids lossy downconversion)
    result = subprocess.run(
        ["dwg2dxf", "-y", dwg_path],
        capture_output=True,
        cwd=tmp,
        timeout=60,
    )

    if result.returncode != 0 or not os.path.exists(dxf_path):
        stderr = result.stderr.decode(errors="replace").strip()
        stdout = result.stdout.decode(errors="replace").strip()
        detail = stderr or stdout or f"dwg2dxf exited {result.returncode}"
        print(f"[dwg-converter] dwg2dxf failed: {detail}", flush=True)
        raise RuntimeError(detail)

    return dxf_path


def run_with_timeout(fn, timeout_s: int):
    """Run fn() in a thread; raise TimeoutError if it exceeds timeout_s."""
    result = [None]
    error  = [None]

    def worker():
        try:
            result[0] = fn()
        except Exception as e:
            error[0] = e

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    t.join(timeout_s)
    if t.is_alive():
        raise TimeoutError(f"operation timed out after {timeout_s}s")
    if error[0]:
        raise error[0]
    return result[0]


# ── Multi-threaded HTTP server ─────────────────────────────────────────────────

class ThreadedHTTPServer(http.server.ThreadingHTTPServer):
    pass


class Handler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"status": "ok"})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path not in ("/convert", "/convert-geojson"):
            self._json(404, {"error": "not found"})
            return

        dwg_data = self._read_body()
        if dwg_data is None:
            return

        try:
            with tempfile.TemporaryDirectory() as tmp:
                # dwg2dxf step (60 s max)
                dxf_path = run_with_timeout(
                    lambda: dwg_bytes_to_dxf(dwg_data, tmp),
                    timeout_s=60,
                )

                if self.path == "/convert":
                    with open(dxf_path, "rb") as f:
                        dxf_bytes = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.send_header("Content-Length", str(len(dxf_bytes)))
                    self.end_headers()
                    self.wfile.write(dxf_bytes)
                else:
                    # ezdxf parse step (90 s max)
                    geojson = run_with_timeout(
                        lambda: dxf_to_geojson(dxf_path),
                        timeout_s=90,
                    )
                    data = json.dumps(geojson).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)

        except TimeoutError as exc:
            print(f"[dwg-converter] timeout: {exc}", flush=True)
            self._json(504, {"error": str(exc)})
        except Exception as exc:
            print(f"[dwg-converter] error: {exc}", flush=True)
            self._json(500, {"error": str(exc)})

    def _read_body(self) -> bytes | None:
        cl_hdr = self.headers.get("Content-Length")
        if cl_hdr is not None:
            cl = int(cl_hdr)
            if cl == 0:
                self._json(400, {"error": "empty body"})
                return None
            if cl > 100 * 1024 * 1024:
                self._json(413, {"error": "file too large (max 100 MB)"})
                return None
            return self.rfile.read(cl)
        data = self.rfile.read()
        if not data:
            self._json(400, {"error": "empty body"})
            return None
        return data

    def _json(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print(f"[dwg-converter] {fmt % args}", flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9838))
    print(f"[dwg-converter] pre-warming ezdxf {ezdxf.__version__}…", flush=True)
    server = ThreadedHTTPServer(("0.0.0.0", port), Handler)
    print(f"[dwg-converter] listening on :{port} (threaded)", flush=True)
    server.serve_forever()
