#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! .venv/bin/python -c "import fastapi" 2>/dev/null; then
  echo "Пакеты не установлены — запускаю install.sh …"
  bash install.sh
fi

source .venv/bin/activate
python seed.py
echo ""
echo "API:  http://127.0.0.1:8000"
echo "Docs: http://127.0.0.1:8000/docs"
echo ""
exec python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
