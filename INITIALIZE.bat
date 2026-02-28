@echo off
echo.
echo ========================================
echo   Initializing Multisig DAO
echo ========================================
echo.
echo Wallet: 3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk
echo.

cd /d "%~dp0"
node scripts\init-multisig.js

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS! Multisig initialized.
    echo.
    echo Next step: Run START_APP.bat
) else (
    echo FAILED! Check the error above.
    echo.
    echo Common fixes:
    echo 1. Make sure you have SOL in your wallet
    echo 2. Try: cargo build-sbf
    echo 3. Then run this script again
)
echo ========================================
echo.
pause
