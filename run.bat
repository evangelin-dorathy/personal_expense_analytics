@echo off
echo ==============================================
echo AeroFinance Expense Analyzer Startup Script
echo ==============================================
echo.
echo Step 1: Installing/checking python dependencies...
pip install -r requirements.txt
echo.
echo Step 2: Starting Flask web server...
python app.py
echo.
echo Server closed.
pause
