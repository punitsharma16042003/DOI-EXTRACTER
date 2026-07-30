Set WshShell = CreateObject("WScript.Shell")
strPath = WScript.ScriptFullName
strDir = Left(strPath, InStrRev(strPath, "\"))
strUrl = "file:///" & Replace(strDir & "index.html", "\", "/")
WshShell.Run "msedge --app=""" & strUrl & """ --window-size=1280,850", 0, False
