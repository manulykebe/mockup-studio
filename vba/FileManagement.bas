Attribute VB_Name = "FileManagement"
#If VBA7 Then
    Declare PtrSafe Function MakeSureDirectoryPathExists Lib "imagehlp.dll" (ByVal DirPath As String) As Long
#Else
   Declare Function MakeSureDirectoryPathExists Lib "imagehlp.dll" (ByVal DirPath As String) As Long
#End If


Function KopieerBestand(bronPad As String, targetPath As String) As Boolean
    Dim fso As Object
        
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    If fso.FileExists(bronPad) Then
        If fso.FileExists(targetPath) Then
            MsgBox "Doeltemplate bestaat reeds!" & vbCrLf & bronPad & vbCrLf & targetPath, vbCritical, "Sopra Steria"
            KopieerBestand = False
        Else
            Call MakeSureDirectoryPathExists(targetPath)
            fso.CopyFile bronPad, targetPath, False
            KopieerBestand = True
        End If
    Else
        MsgBox "Brontemplate niet gevonden op het opgegeven pad!", vbCritical, "Sopra Steria"
        KopieerBestand = False
        Exit Function
    End If
    
End Function
Function GetHighestVersionOfFile(targetPath As String, _
                                Optional ByRef bestMatchPath As String, _
                                Optional ByRef allMatchesRecent As Variant) As String
    GetHighestVersionOfFile = 0
    If targetPath = "" Then
        Exit Function
    End If
    Dim fso As Object
    Dim folderPath As String
    Dim fileName As String
    Dim baseName As String
    Dim ext As String
    Dim folder As Object
    Dim file As Object
    
    Dim RegEx As Object
    Dim matches As Object
    Dim currentVersion As Double, thisVersion As Double
    Dim maxVersion As Double
    
    Dim sallMatches As String
    
    Set fso = CreateObject("Scripting.FileSystemObject")
    thisVersion = getCustomDocumentProperty("document_version")
    
    ' 1. Controleer of het initiële bestand bestaat. Zo niet, retourneer het origineel.
    If Not fso.FileExists(targetPath) Then
        GetHighestVersionOfFile = 0
        Exit Function
    End If
    
    ' 2. Haal maplocatie, bestandsnaam en extensie op
    folderPath = fso.GetParentFolderName(targetPath)
    fileName = fso.GetFileName(targetPath)
    ext = fso.GetExtensionName(targetPath)
    
    ' Haal de basisnaam op zonder de versie (bijv. "SSG-SOP")
    ' We nemen aan dat de structuur altijd eindigt op "-vX.ext" of "-vX.Y.ext"
    If InStr(fileName, "-v") > 0 Then
        baseName = Left(fileName, InStrRev(fileName, "-v") - 1)
    Else
        baseName = fso.GetBaseName(targetPath)
    End If
    
    ' 3. Initialiseer RegEx om het versienummer na "-v" te vinden (ondersteunt gehele getallen en decimalen zoals v1 of v1.2)
    Set RegEx = CreateObject("VBScript.RegExp")
    With RegEx
        .Pattern = "^" & regexEscape(baseName) & "-v([0-9]+(?:\.[0-9]+)?)\." & ext & "$"
        .IgnoreCase = True
    End With
    
    Set folder = fso.GetFolder(folderPath)
    maxVersion = -1
    bestMatchPath = targetPath ' Default fallback
    
    ' 4. Loop door alle bestanden in de map
    For Each file In folder.Files
        If RegEx.Test(file.Name) Then
            Set matches = RegEx.Execute(file.Name)
            ' Haal het versienummer op uit de eerste RegEx-groep en converteer naar een getal
            currentVersion = CDbl(matches(0).SubMatches(0))
            If thisVersion < currentVersion Then
                sallMatches = sallMatches + "," + folderPath + "\" + file.Name
            End If
            ' Controleer of dit de hoogste versie tot nu toe is
            If currentVersion > maxVersion Then
                maxVersion = currentVersion
                bestMatchPath = file.Path
            End If
        End If
    Next file
    
    ' Retourneer het pad naar de hoogste versie
    'GetHighestVersionPath = bestMatchPath
    allMatchesRecent = Split(sallMatches, ",")
    GetHighestVersionOfFile = maxVersion
    
End Function

