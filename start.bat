@echo off
title ERP Cesta Basica
echo.
echo  =============================================
echo    ERP Cesta Basica - Iniciando Sistema...
echo  =============================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 1 (
        echo  ERRO: Python nao encontrado.
        echo  Instale Python 3.9+ (marque "Add to PATH") em:
        echo  https://www.python.org/downloads/
        pause & exit /b 1
    )
    set PYTHON=py
) else (
    set PYTHON=python
)

node --version >nul 2>&1
if errorlevel 1 (
    echo  ERRO: Node.js nao encontrado.
    echo  Instale Node.js 18+ em https://nodejs.org
    pause & exit /b 1
)

echo  [1/2] Iniciando Backend (FastAPI)...
start "ERP - Backend" cmd /k "cd /d %~dp0backend && %PYTHON% -m pip install -r requirements.txt -q && echo Backend pronto! && %PYTHON% -m uvicorn main:app --reload --port 8000"

echo  Aguardando backend inicializar...
timeout /t 5 /nobreak >nul

echo  [2/2] Iniciando Frontend (React)...
start "ERP - Frontend" cmd /k "cd /d %~dp0frontend && npm install --silent && npm run dev"

echo.
echo  =============================================
echo    Sistema iniciado com sucesso!
echo.
echo    Acesse: http://localhost:5173
echo    API:    http://localhost:8000/docs
echo  =============================================
echo.
pause
