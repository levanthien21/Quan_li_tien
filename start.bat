@echo off
echo =========================================
echo       KHOI CHAY TELEGRAM MONEY BOT
echo =========================================

echo.
echo [1/2] Dang kiem tra va cap nhat Database...
call npx prisma db push

echo.
echo [2/2] Dang khoi dong Bot...
call npm run dev

pause
