#ifndef AppVersion
#error Supply AppVersion from package.json using npm run package:installer
#endif
#ifndef PackageDir
#error Supply the allowlisted package directory
#endif
#ifndef InstallerAppId
#define InstallerAppId "MapweaverLocal"
#endif
[Setup]
AppId={#InstallerAppId}
AppName=Mapweaver
AppVersion={#AppVersion}
VersionInfoVersion={#AppVersion}
AppVerName=Mapweaver {#AppVersion}
DefaultDirName={localappdata}\Programs\Mapweaver
DefaultGroupName=Mapweaver
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=..\distribution.local
OutputBaseFilename=Mapweaver-Setup-{#AppVersion}
UninstallDisplayIcon={app}\Mapweaver.exe
SetupIconFile=Mapweaver.ico
Compression=lzma2
SolidCompression=yes
CloseApplications=no
RestartApplications=no
WizardStyle=modern
[Languages]
Name: "dutch"; MessagesFile: "compiler:Languages\Dutch.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
[Tasks]
Name: "desktopicon"; Description: "Een snelkoppeling op het bureaublad maken"; Flags: unchecked
[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\Mapweaver"; Filename: "{app}\Mapweaver.exe"
Name: "{group}\Stop Mapweaver"; Filename: "{app}\Mapweaver.exe"; Parameters: "--stop"
Name: "{group}\Installatiehandleiding"; Filename: "{app}\INSTALLATIE.md"
Name: "{userdesktop}\Mapweaver"; Filename: "{app}\Mapweaver.exe"; Tasks: desktopicon
[Run]
Filename: "{app}\Mapweaver.exe"; Description: "Mapweaver starten"; Flags: nowait postinstall skipifsilent
[Code]
function StopSafely(): Boolean;
var ResultCode: Integer;
begin
  Result := True;
  if FileExists(ExpandConstant('{app}\Mapweaver.exe')) then
    Result := Exec(ExpandConstant('{app}\Mapweaver.exe'), '--stop --wait', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if not StopSafely() then
    Result := 'Mapweaver kon niet veilig stoppen. Sla uw werk op, sluit andere Mapweaver-tabbladen en stop Mapweaver via het systeemvak. Probeer daarna opnieuw. Er zijn geen bestanden vervangen.';
end;

function InitializeUninstall(): Boolean;
begin
  Result := StopSafely();
  if not Result then
    MsgBox('Mapweaver heeft geen veilige stop bevestigd. Bewaar uw werk en stop Mapweaver via het systeemvak voordat u opnieuw verwijdert.', mbError, MB_OK);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if (CurUninstallStep = usPostUninstall) and not UninstallSilent then
    MsgBox('Uw kaarten, campagnes, assets en herstelgegevens zijn bewaard. Verwijder deze alleen zelf nadat u een volledige back-up hebt gecontroleerd.', mbInformation, MB_OK);
end;
