Dim fso, ws, dir
Set fso = CreateObject("Scripting.FileSystemObject")
Set ws  = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = dir
' Roda node launch.js sem mostrar nenhuma janela (0 = oculto)
ws.Run "cmd /c node """ & dir & "\launch.js""", 0, False
