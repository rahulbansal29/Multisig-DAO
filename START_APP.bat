@echo off
echo.
echo ========================================
echo   Starting DAO Treasury Web App
echo ========================================
echo.
echo The app will open at: http://localhost:5173/
echo.
echo Make sure Phantom wallet is:
echo  - Installed in your browser
echo  - Set to DEVNET network
echo  - Using wallet: 3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0\web"
npm run dev
