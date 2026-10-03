$packageFolder = $PSScriptRoot
$launcher = Join-Path $packageFolder 'Mapweaver.exe'
if (-not (Test-Path -LiteralPath $launcher)) { throw 'Mapweaver.exe is missing.' }
$shortcutShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath('Desktop')
$openLink = $shortcutShell.CreateShortcut((Join-Path $desktopPath 'Mapweaver.lnk'))
$openLink.TargetPath = $launcher
$openLink.WorkingDirectory = $packageFolder
$openLink.Save()
$stopLink = $shortcutShell.CreateShortcut((Join-Path $desktopPath 'Stop Mapweaver.lnk'))
$stopLink.TargetPath = $launcher
$stopLink.Arguments = '--stop'
$stopLink.WorkingDirectory = $packageFolder
$stopLink.Save()
