' ============================================================
'  QuickNote — live preview autostart
'
'  Placed in the Windows Startup folder so the preview server
'  starts hidden every time you log in.
'
'  To stop it starting at login: delete this file from
'      %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
'  (a copy is kept in the project at scripts\ for reference).
' ============================================================

Set sh = CreateObject("WScript.Shell")
sh.Run "cmd.exe /c ""C:\Users\DELL\Documents\Default Project\scripts\start-live-preview.cmd""", 0, False
