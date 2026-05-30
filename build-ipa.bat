@echo off
setlocal
title Xe Cleaner - Build New IPA
cd /d "%~dp0"

echo.
echo ==================================================
echo   Xe Cleaner - Push to GitHub - Trigger IPA build
echo ==================================================
echo.

REM --- Sanity check: must be a git repo ---
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo *** ERROR ***  This folder is not a git repository.
    echo.
    pause
    exit /b 1
)

REM --- Show what is about to be pushed ---
echo Changes detected:
git status --short
echo.

REM --- Stage everything respecting .gitignore ---
echo [1/3] Staging changes...
git add .
echo.

REM --- Commit with a timestamp; ok if nothing new ---
echo [2/3] Committing...
set "STAMP=%DATE% %TIME%"
git commit -m "Build: %STAMP%" >nul 2>&1
if errorlevel 1 (
    echo       No new changes - will just push existing commits.
) else (
    echo       Committed.
)
echo.

REM --- Push to the main branch - this triggers the IPA workflow ---
echo [3/3] Pushing to origin/main...
git push origin main
if errorlevel 1 (
    echo.
    echo *** PUSH FAILED ***
    echo Check your internet connection and GitHub credentials.
    echo If GitHub asks for a password, run a manual push once
    echo to set up Git Credential Manager.
    echo.
    pause
    exit /b 1
)

echo.
echo ==================================================
echo   DONE - IPA build is running on GitHub Actions
echo ==================================================
echo.
echo Opening the Actions page in your browser...
start "" "https://github.com/Xenon54-Dev/Xe-Cleaner/actions"
echo.
echo Build takes ~15-25 minutes.
echo When the run goes GREEN, scroll to the bottom of
echo the run page, find Artifacts, and download
echo "XeCleaner-ipa" to get your new .ipa file.
echo.
echo Then drag that .ipa into Sideloadly to install
echo it on your iPhone (re-sign weekly).
echo.
pause
endlocal
