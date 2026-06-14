@echo off
echo Parando servidores ERP...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a /T >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a /T >nul 2>&1
)

echo Pronto. Os servidores foram encerrados.
timeout /t 2 /nobreak >nul
