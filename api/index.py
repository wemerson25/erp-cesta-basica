import sys
import os

# Adiciona o diretório backend ao path do Python
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from main import app  # noqa: F401 — Vercel detecta o app FastAPI/ASGI automaticamente
