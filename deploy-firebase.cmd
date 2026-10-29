@echo off
echo ========================================================
echo   Deploying CMSys Logistics to Firebase Hosting
echo ========================================================
echo.
echo Target Sites:
echo  - https://cmsys-logistics.web.app
echo  - https://logistics.cmsys.site
echo.
node scripts\assemble-dist.js
call npx firebase-tools deploy --only hosting
echo.
echo ========================================================
echo   Deployment complete!
echo ========================================================
echo Main Site:     https://cmsys-logistics.web.app
echo Custom Domain: https://logistics.cmsys.site
echo.
pause
