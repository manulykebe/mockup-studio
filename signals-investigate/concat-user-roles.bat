@echo off
REM Concatenates all *-user-roles#*.csv files in %1 (default: current directory) into one CSV,
REM keeping the header row from the first file only and skipping it for the rest.
setlocal enabledelayedexpansion

set "SRC_DIR=%~1"
if "%SRC_DIR%"=="" set "SRC_DIR=."
set "OUT_FILE=%SRC_DIR%\combined-user-roles.csv"

if exist "%OUT_FILE%" del "%OUT_FILE%"

set "FIRST=1"
for %%f in ("%SRC_DIR%\*#user-roles#*.csv") do (
    if !FIRST!==1 (
        type "%%~f" >> "%OUT_FILE%"
        set "FIRST=0"
    ) else (
        more +1 "%%~f" >> "%OUT_FILE%"
    )
)

echo Combined file written to "%OUT_FILE%".
endlocal
