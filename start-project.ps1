# Start Frontend
Start-Process powershell -ArgumentList '-NoExit -Command "Set-Location ''C:\Users\ayush\collage project\Frontend''; npm run dev"'

# Start Backend API Server
Start-Process powershell -ArgumentList '-NoExit -Command "& ''C:\Users\ayush\collage project\.venv\Scripts\Activate.ps1''; Set-Location ''C:\Users\ayush\collage project\Backend\Elon - Copy''; python server.py"'

Write-Host "Frontend running at: http://localhost:5173/"
Write-Host "Backend API running at: http://localhost:5000/"