#define AppVersion "1.0.0"
#ifndef PackageDir
#define PackageDir "..\distribution.local\Mapweaver-20260926"
#endif
[Setup]
AppId=MapweaverLocal
AppName=Mapweaver
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\Mapweaver
DefaultGroupName=Mapweaver
PrivilegesRequired=lowest
OutputDir=..\distribution.local
OutputBaseFilename=Mapweaver-Setup
UninstallDisplayIcon={app}\Mapweaver.exe
Compression=lzma2
SolidCompression=yes
[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\Mapweaver"; Filename: "{app}\Mapweaver.exe"
Name: "{group}\Stop Mapweaver"; Filename: "{app}\Mapweaver.exe"; Parameters: "--stop"
Name: "{userdesktop}\Mapweaver"; Filename: "{app}\Mapweaver.exe"
[Code]
function InitializeUninstall(): Boolean;
var ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{app}\Mapweaver.exe'), '--stop --wait', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
  if not Result then
    MsgBox('Mapweaver has not confirmed a safe stop. Keep the program installed, resolve active work using its tray menu, then retry uninstall.', mbError, MB_OK);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    MsgBox('Your Mapweaver projects, assets and recovery points have been kept. Remove them separately only after verifying a full backup.', mbInformation, MB_OK);
end;
