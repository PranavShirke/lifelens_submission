@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"

echo ========================================
echo    LifeLens Complete Startup
echo ========================================
echo.
echo Starting backend API, Next.js frontend, and medication scheduler...
echo.
echo Backend API:       http://localhost:8000
echo Frontend UI:       http://localhost:3000
echo Medication alerts:  background service
echo.
echo Close the service windows to stop the project.
echo.

if not exist "%BACKEND_DIR%\bootstrap_env.bat" (
	echo [ERROR] backend\bootstrap_env.bat was not found.
	pause
	exit /b 1
)

call "%BACKEND_DIR%\bootstrap_env.bat"
if %errorlevel% neq 0 (
	echo.
	echo [ERROR] Backend bootstrap failed.
	pause
	exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
	echo Installing frontend dependencies...
	call npm install --prefix "%FRONTEND_DIR%"
	if %errorlevel% neq 0 (
		echo.
		echo [ERROR] Frontend dependency installation failed.
		pause
		exit /b 1
	)
)

echo Starting backend API...
start "LifeLens API" cmd /k cd /d "%BACKEND_DIR%" ^&^& "%BACKEND_PYTHON%" -m uvicorn lifelens.api.main:app --host 0.0.0.0 --port 8000 --reload

timeout /t 3 /nobreak > nul

echo Starting Next.js frontend...
start "LifeLens Frontend" cmd /k cd /d "%FRONTEND_DIR%" ^&^& npm run dev

timeout /t 3 /nobreak > nul

echo Starting medication scheduler...
start "LifeLens Scheduler" cmd /k cd /d "%BACKEND_DIR%" ^&^& "%BACKEND_PYTHON%" lifelens\scripts\medication_scheduler_service.py

echo.
echo All services are starting.
echo.
echo Open http://localhost:3000 after the frontend finishes compiling.
echo.
start http://localhost:3000
pause