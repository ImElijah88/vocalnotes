@echo off
echo Building Molecular Notes...
call npm run build

echo Deploying to Firebase...
call firebase deploy --only hosting:vocalnotes

echo Deployment complete!
pause
