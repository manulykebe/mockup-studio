@echo off
setlocal enabledelayedexpansion

:: ANSI Escape Codes for color (within Windows 10/11)
set "ESC="
for /f %%A in ('echo prompt $E ^| cmd') do set "ESC=%%A"
set "YELLOW=%ESC%[33m"
set "RESET=%ESC%[0m"

:: Display the current user
echo Current user: %USERNAME%

:: Define paths
set "PARENT_DIR=c:\Sopra Steria"
set "LINK_PATH=c:\Sopra Steria\Q-Regulate"
set "TARGET_DOCS=C:\Users\%USERNAME%\Sopra Steria\Q-Regulate - Q-Documents"
set "TARGET_DEV=C:\Sopra Steria\Q-Regulate (dev)"


:: Check if the directory exists
if not exist "%TARGET_DOCS%" goto :ERROR_EXIT

:MENU
cls
set "JUNCTION_PATH="

:: Look for the line containing <JUNCTION> and parse the text inside the brackets [ ]
for /f "tokens=2 delims=[" %%A in ('dir "%PARENT_DIR%" 2^>nul ^| findstr /C:"<JUNCTION>" ^| findstr /C:"Q-Regulate"') do (
    set "FULL_LINE=%%A"
    :: Remove the closing bracket "]" at the end
    set "JUNCTION_PATH=!FULL_LINE:~0,-1!"
)

:: Display current path in yellow if active
if defined JUNCTION_PATH (
    echo.
) else (
    echo No active junction for Q-Regulate.
)


:: Determine labels for menu options based on the current active junction
set "DOCS_LABEL=%TARGET_DOCS%"
set "DEV_LABEL=%TARGET_DEV%"

if /i "!JUNCTION_PATH!"=="%TARGET_DOCS%" set "DOCS_LABEL=%YELLOW%%TARGET_DOCS%%RESET%"
if /i "!JUNCTION_PATH!"=="%TARGET_DEV%" set "DEV_LABEL=%YELLOW%%TARGET_DEV%%RESET%"

echo Select the desired location for Q-Regulate quality documents:
echo.
echo [0]                Remove junction
echo [1] (Production)   !DOCS_LABEL!
echo [2] (Development)  !DEV_LABEL!
echo.

:: Explicitly clear the variable before prompt input
set "keuze="
set /p "keuze=Type your choice (0, 1 or 2) or press Enter to stop: "

:: Exit immediately if input is empty
if "%keuze%"=="" exit /b

:: Modify the junction based on choice and restart the loop
if "%keuze%"=="0" (
    if exist "%LINK_PATH%" rmdir "%LINK_PATH%"
    echo.
    echo Junction successfully removed.
    goto :MENU
) else if "%keuze%"=="1" (
    if exist "%LINK_PATH%" rmdir "%LINK_PATH%"
    mklink /j "%LINK_PATH%" "%TARGET_DOCS%"
    echo.
    echo Status successfully changed to: Q-Documents
    goto :MENU
) else if "%keuze%"=="2" (
    if exist "%LINK_PATH%" rmdir "%LINK_PATH%"
    mklink /j "%LINK_PATH%" "%TARGET_DEV%"
    echo.
    echo Status successfully changed to: Q-Regulate (dev)
    goto :MENU
) else (
    echo.
    echo Invalid choice. Please try again.
    timeout /t 2 >nul
    goto :MENU
)

goto :EOF

:ERROR_EXIT
echo [ERROR] Folder not found: "%TARGET_DOCS%"
exit /b 1

:EOF

