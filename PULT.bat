@echo off
rem PULT.bat - launcher for the workshop console. ASCII only inside:
rem cmd.exe reads .bat as cp866 and Cyrillic here breaks it.
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py pult\pult.py %*) else (python pult\pult.py %*)
pause
