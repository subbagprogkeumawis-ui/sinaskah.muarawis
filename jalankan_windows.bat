@echo off
title SI-NASKAH AI - Kecamatan Muara Wis
cd /d "%~dp0backend"
echo Memeriksa dependensi Python...
python -c "import fastapi, uvicorn, qrcode, docx, PIL" 2>nul
if errorlevel 1 (
    echo Menginstal dependensi pertama kali...
    pip install -r requirements.txt
)
echo.
echo Menjalankan SI-NASKAH AI Kecamatan Muara Wis di http://localhost:8000 ...
start "" http://localhost:8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
