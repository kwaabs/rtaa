# ── Stage 1: pull pre-built dwg2dxf binary from community image ──────────────
# kuzoncby/libredwg contains /usr/local/bin/dwg2dxf compiled from LibreDWG source.
# We only use this stage to copy the binary; we don't run it directly.
FROM kuzoncby/libredwg:latest AS dwg2dxf-source

# ── Stage 2: minimal Python runtime (Alpine — matches musl binary from stage 1) ──
FROM python:3.12-alpine

# libpcre2 is a runtime dependency of dwg2dxf
RUN apk add --no-cache pcre2

COPY --from=dwg2dxf-source /usr/local/bin/dwg2dxf      /usr/local/bin/dwg2dxf
COPY --from=dwg2dxf-source /usr/local/lib/libredwg.so* /usr/local/lib/
RUN ldconfig

# ezdxf is a proper Python DXF parser — handles LibreDWG output correctly
RUN pip install --no-cache-dir ezdxf

WORKDIR /app
COPY server.py .

EXPOSE 9838
CMD ["python3", "server.py"]
