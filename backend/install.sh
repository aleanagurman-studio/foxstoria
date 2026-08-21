#!/usr/bin/env bash
# Установка зависимостей backend (запустить один раз или после обновления requirements.txt)
set -e
cd "$(dirname "$0")"

echo "→ Python: $(python3 --version)"
echo "→ Создаю/обновляю .venv …"
python3 -m venv .venv

echo "→ Устанавливаю пакеты …"
.venv/bin/pip install --upgrade pip setuptools wheel
.venv/bin/pip install -r requirements.txt

echo "→ Проверка …"
.venv/bin/python -c "import fastapi, uvicorn, aiosqlite, slugify; print('✓ Все пакеты установлены')"
.venv/bin/python -c "from app.main import app; print('✓ Приложение импортируется')"

echo ""
echo "Готово! Запуск сервера:"
echo "  ./run.sh"
echo "или:"
echo "  source .venv/bin/activate && python start.py"
