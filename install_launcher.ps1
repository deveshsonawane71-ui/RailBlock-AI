# Installer script to configure permanent launch function for RailBlock AI
$ErrorActionPreference = 'Stop'

$projectDir = "c:\Users\DEVESH SONAWANE\Downloads\railway project"
$launchBat = Join-Path $projectDir "launch.bat"
$stopBat = Join-Path $projectDir "stop.bat"

Write-Host "=== Setting up RailBlock AI Permanent Launcher ===" -ForegroundColor Cyan

# 1. Create Desktop Shortcut
try {
    $wshShell = New-Object -ComObject WScript.Shell
    $desktopFolders = @(
        [Environment]::GetFolderPath('Desktop'),
        (Join-Path $env:USERPROFILE "Desktop"),
        (Join-Path $env:USERPROFILE "OneDrive\Desktop")
    ) | Where-Object { Test-Path $_ } | Select-Object -Unique

    foreach ($desktop in $desktopFolders) {
        $shortcutPath = Join-Path $desktop "RailBlock AI.lnk"
        $shortcut = $wshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $launchBat
        $shortcut.WorkingDirectory = $projectDir
        $shortcut.Description = "Launch RailBlock AI - Indian Railways Maintenance Optimization"
        $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
        $shortcut.Save()
        Write-Host "[+] Created Desktop Shortcut at: $shortcutPath" -ForegroundColor Green

        $tunnelShortcutPath = Join-Path $desktop "RailBlock AI (Public Link).lnk"
        $tunnelBat = Join-Path $projectDir "launch-with-tunnel.bat"
        $tunnelShortcut = $wshShell.CreateShortcut($tunnelShortcutPath)
        $tunnelShortcut.TargetPath = $tunnelBat
        $tunnelShortcut.WorkingDirectory = $projectDir
        $tunnelShortcut.Description = "Launch RailBlock AI with Public Shareable HTTPS URL"
        $tunnelShortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,14"
        $tunnelShortcut.Save()
        $pushShortcutPath = Join-Path $desktop "Push to GitHub.lnk"
        $pushBat = Join-Path $projectDir "push_to_github.bat"
        $pushShortcut = $wshShell.CreateShortcut($pushShortcutPath)
        $pushShortcut.TargetPath = $pushBat
        $pushShortcut.WorkingDirectory = $projectDir
        $pushShortcut.Description = "Upload RailBlock AI to GitHub"
        $pushShortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
        $pushShortcut.Save()
        Write-Host "[+] Created Push to GitHub Shortcut at: $pushShortcutPath" -ForegroundColor Green
    }
} catch {
    Write-Warning "Could not create desktop shortcut: $_"
}

# 2. Add global 'railblock' command to user PATH
$pythonScriptsDir = Join-Path $env:LOCALAPPDATA "Programs\Python\Python314\Scripts"
if (Test-Path $pythonScriptsDir) {
    $globalCmd = Join-Path $pythonScriptsDir "railblock.bat"
    $cmdContent = "@echo off`r`ncall `"$launchBat`""
    Set-Content -Path $globalCmd -Value $cmdContent -Force
    Write-Host "[+] Created global command 'railblock' in: $pythonScriptsDir" -ForegroundColor Green
    Write-Host "    You can now open any terminal and just type: railblock" -ForegroundColor Yellow
} else {
    # If python scripts dir is different or not found, register in user bin or profile
    $userBin = Join-Path $env:USERPROFILE "bin"
    if (-not (Test-Path $userBin)) {
        New-Item -ItemType Directory -Path $userBin -Force | Out-Null
    }
    $globalCmd = Join-Path $userBin "railblock.bat"
    $cmdContent = "@echo off`r`ncall `"$launchBat`""
    Set-Content -Path $globalCmd -Value $cmdContent -Force
    Write-Host "[+] Created launcher script in: $globalCmd" -ForegroundColor Green
}

# 3. Add global 'railblock-stop' command
if (Test-Path $pythonScriptsDir) {
    $stopCmd = Join-Path $pythonScriptsDir "railblock-stop.bat"
    $stopContent = "@echo off`r`ncall `"$stopBat`""
    Set-Content -Path $stopCmd -Value $stopContent -Force
    Write-Host "[+] Created global stop command 'railblock-stop' in: $pythonScriptsDir" -ForegroundColor Green
}

Write-Host "`n[SUCCESS] RailBlock AI is now permanently installed as a launcher on your computer!" -ForegroundColor Green
