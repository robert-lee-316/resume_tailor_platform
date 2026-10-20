@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\app\main.py" (
  echo [ERROR] Place start-gurucorp.bat in the project root, next to backend and frontend.
  pause
  exit /b 1
)
if not exist "backend\.venv\Scripts\python.exe" (
  echo [ERROR] Python virtual environment not found at backend\.venv.
  echo Create it, then install requirements.txt before launching.
  pause
  exit /b 1
)
if not exist "frontend\node_modules\.bin\next.cmd" (
  echo [ERROR] Next.js is not installed yet. Run npm install in frontend first.
  pause
  exit /b 1
)

start "GuruCorp - Backend" /D "%~dp0backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
start "GuruCorp - Frontend" /D "%~dp0frontend" cmd /k "npm run dev"
echo Started GuruCorp backend and frontend in separate terminal windows.
echo Open http://localhost:3000 after both servers are ready.
endlocal
