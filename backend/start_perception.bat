@echo off
REM =========================================================
REM  LifeLens Perception Engine — Quick Start
REM =========================================================
REM  This script activates the Python venv and launches the
REM  real-time perception HUD (face recognition + YOLO).
REM
REM  Usage:  Double-click or run from terminal.
REM  Exit:   Press 'q' in the video window.
REM =========================================================

cd /d "%~dp0"

echo.
echo  ========================================
echo   LifeLens Perception Engine
echo  ========================================
echo.

REM Activate virtual environment
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    echo  [OK] Virtual environment activated.
) else (
    echo  [WARN] No .venv found — using system Python.
)

echo.
echo  Starting perception engine...
echo  Press 'q' in the video window to quit.
echo.

python -m lifelens.perception.main --known-faces ./known_faces

echo.
echo  Perception engine stopped.
pause
