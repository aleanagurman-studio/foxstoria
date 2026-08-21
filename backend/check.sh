#!/usr/bin/env bash
echo "=== FoxStoria backend check ==="
echo ""

cd "$(dirname "$0")"

echo "1. Python:"
python3 --version 2>&1 || echo "   ✗ python3 не найден"
echo ""

echo "2. Папка backend:"
if [ -f "app/main.py" ]; then echo "   ✓ app/main.py"; else echo "   ✗ запустите из папки backend"; fi
echo ""

echo "3. Virtualenv:"
if [ -d ".venv" ]; then echo "   ✓ .venv есть"; else echo "   ✗ нет .venv — выполните: ./install.sh"; fi
echo ""

echo "4. Зависимости:"
if [ -x ".venv/bin/python" ]; then
  if .venv/bin/python -c "import fastapi, uvicorn, aiosqlite, slugify" 2>/dev/null; then
    echo "   ✓ пакеты установлены"
  else
    echo "   ✗ пакеты НЕ установлены"
    echo ""
    echo "   Исправление — выполните:"
    echo "   cd ~/Projects/foxstoria/backend"
    echo "   chmod +x install.sh && ./install.sh"
  fi
else
  echo "   ✗ .venv/bin/python не найден — выполните: ./install.sh"
fi
echo ""

echo "5. Импорт приложения:"
if [ -x ".venv/bin/python" ]; then
  if .venv/bin/python -c "from app.main import app" 2>/dev/null; then
    echo "   ✓ app импортируется"
  else
    echo "   ✗ ошибка импорта — сначала ./install.sh"
  fi
fi
echo ""

echo "6. Порт 8000:"
if curl -sf http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
  echo "   ✓ сервер работает"
  curl -s http://127.0.0.1:8000/api/health
  echo ""
else
  echo "   ✗ сервер не запущен"
  echo ""
  echo "   Запуск (в отдельном терминале, не закрывать):"
  echo "   cd ~/Projects/foxstoria/backend && ./run.sh"
fi
echo ""
echo "=== Готово ==="
