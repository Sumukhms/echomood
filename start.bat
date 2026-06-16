@echo off
echo Starting EchoMood Servers...

echo [1/2] Starting Python Backend Server...
cd ai-models
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Installing requirements...
pip install -r requirements.txt
start "EchoMood Backend" cmd /k "python ai_server.py"

cd ..

echo [2/2] Starting Vite Frontend Server...
cd frontend
if not exist "node_modules" (
    echo Installing node modules...
    call npm install
)
start "EchoMood Frontend" cmd /k "npm run dev"

echo Both servers are starting in new windows!
pause
