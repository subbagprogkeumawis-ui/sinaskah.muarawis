#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
python3 -c "import fastapi, uvicorn, qrcode, docx, PIL" 2>/dev/null || pip3 install --quiet fastapi uvicorn "qrcode[pil]" python-docx pillow httpx
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
