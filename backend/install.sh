#!/usr/bin/env bash
# Установка зависимостей backend (запустить один раз или после обновления requirements.txt)
set -e
cd "$(dirname "$0")"

PY="${PYTHON:-python3.12}"
if ! command -v "$PY" >/dev/null 2>&1; then
  PY=python3
fi

echo "→ Python: $($PY --version)"
echo "→ Создаю/обновляю .venv …"
"$PY" -m venv --clear .venv

echo "→ Устанавливаю пакеты …"
.venv/bin/pip install --upgrade pip setuptools wheel
.venv/bin/pip install -r requirements.txt

echo "→ Проверка …"
.venv/bin/python -c "import fastapi, uvicorn, aiosqlite, slugify; print('✓ Все пакеты установлены')"
.venv/bin/python -c "from app.main import app; print('✓ Приложение импортируется')"

echo ""
echo "Готово! Запуск сервера:"
echo "  ./run.sh"
echo "Сайт и API: http://127.0.0.1:8000/"
