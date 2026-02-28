@echo off
echo ==========================================
echo   DAO Treasury - Windows Quick Start
echo ==========================================
echo.

echo Step 1: Checking web server...
echo.

REM Check if web server is running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Web server is running
) else (
    echo Starting web server...
    start /B cmd /c "cd web && npm run dev"
    timeout /t 3 >nul
)

echo.
echo Step 2: Fund wallet for deployment
echo.
echo Your wallet address: 3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk
echo.
echo Get FREE devnet SOL from:
echo    https://faucet.solana.com
echo.
echo [!] You need ~0.5 SOL for deployment
echo.

choice /C YN /M "Have you funded your wallet"
if errorlevel 2 goto :nofunds
if errorlevel 1 goto :deploy

:nofunds
echo.
echo Please fund your wallet first, then run this script again.
echo Opening faucet in browser...
start https://faucet.solana.com
pause
exit /b

:deploy
echo.
echo Step 3: Deploying to Solana devnet...
echo.

wsl bash -c "export PATH=\"$HOME/.local/share/solana/install/active_release/bin:$PATH\" && cd '/mnt/c/Users/RAHUL BANSAL/Desktop/solanaproject' && solana program deploy target/deploy/multisig_dao.so --program-id target/deploy/multisig_dao-keypair.json"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Deployment failed!
    echo.
    echo Common issues:
    echo  - Insufficient funds ^(need ~0.5 SOL^)
    echo  - Network connection issues
    echo.
    echo Check balance: wsl bash -c "~/.local/share/solana/install/active_release/bin/solana balance"
    pause
    exit /b 1
)

echo.
echo Step 4: Initializing multisig...
echo.

npx ts-node scripts/deploy-and-initialize.ts

echo.
echo ==========================================
echo   SUCCESS! Your DAO is ready!
echo ==========================================
echo.
echo Web App: http://localhost:5173
echo Explorer: https://explorer.solana.com/address/Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS?cluster=devnet
echo.
echo Opening web app...
timeout /t 2 >nul
start http://localhost:5173

pause
