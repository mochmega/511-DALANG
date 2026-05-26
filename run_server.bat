@echo off
echo Starting 511-DALANG Backend...
call venv\Scripts\activate
waitress-serve --port=5000 --host=0.0.0.0 wsgi:app
pause
