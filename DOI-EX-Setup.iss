; Script generated for Inno Setup Compiler
#define MyAppName "DOI EX - Bibliography DOI Extractor"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "DOI EX Team"
#define MyAppExeName "DOI-EX.exe"

[Setup]
AppId={{0FC1E014-4263-4E2C-90B6-F2BEEB3F1A67}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\DOI EX
DisableProgramGroupPage=yes
OutputBaseFilename=DOI-EX-Installer-Inno
SetupIconFile=assets\app_icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "DOI-EX.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "style.css"; DestDir: "{app}"; Flags: ignoreversion
Source: "app.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\app_icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
