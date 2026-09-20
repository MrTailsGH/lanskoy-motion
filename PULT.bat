@echo off
rem PULT.bat - launcher for the workshop console. ASCII only inside:
rem cmd.exe reads .bat as cp866 and Cyrillic here breaks it.
chcp 65001 >nul
cd /d "%~dp0"

rem Fresh code on every launch. --ff-only refuses instead of merging
rem behind your back; a failed pull must never block the console.
where git >nul 2>nul && (
  echo Obnovlenie iz GitHub...
  git pull --ff-only
  if errorlevel 1 echo Obnovit ne vyshlo - zapuskayu to, chto est.
)

where py >nul 2>nul
if %errorlevel%==0 (py pult\pult.py %*) else (python pult\pult.py %*)
pause
