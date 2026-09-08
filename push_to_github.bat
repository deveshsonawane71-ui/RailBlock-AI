@echo off
title Push RailBlock AI to GitHub
cls
echo ======================================================================
echo             UPLOADING RAILBLOCK AI TO GITHUB
echo ======================================================================
echo.
echo Target Repository: https://github.com/deveshsonawane71-ui/RailBlock-AI.git
echo Branch:            main
echo.
echo [*] Pushing 47 files to GitHub...
echo.
echo Note: If a browser window or popup appears asking you to "Sign in to GitHub",
echo       please click "Sign in with your browser" to authorize Git.
echo.
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ======================================================================
    echo  [SUCCESS] Successfully uploaded to GitHub!
    echo  View your code at: https://github.com/deveshsonawane71-ui/RailBlock-AI
    echo ======================================================================
) else (
    echo ======================================================================
    echo  [!] Push encountered an issue. Please verify your GitHub login above.
    echo ======================================================================
)
echo.
pause
