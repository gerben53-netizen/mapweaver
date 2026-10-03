$target = Join-Path (Split-Path $PSScriptRoot) 'launcher.local'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$compiler = Join-Path $env:SystemRoot 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:winexe "/win32icon:$PSScriptRoot\Mapweaver.ico" /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Web.Extensions.dll "/out:$target\Mapweaver.exe" "$PSScriptRoot\Mapweaver.cs"
exit $LASTEXITCODE
