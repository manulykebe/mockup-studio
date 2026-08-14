Attribute VB_Name = "Interceptor"
Option Explicit
Public TargetLocalPath As String
Sub DocumentNew()
    If Not thisIsAQualityDocument Then Exit Sub
    If ActiveDocument.Path = "" Then
        FileSave
    Else
        MsgBox "Dead end?"
    End If
End Sub
Sub DocumentOpen()
    Application.ScreenUpdating = False
    If Not thisIsAQualityDocument Then Exit Sub
    
    Dim doc As Document
    Set doc = ActiveDocument
    
    Dim docPath As String, bestMatchPath As String
    docPath = doc.FullName
    Dim highVersion As Integer
    'Check for latest approved version
    highVersion = FileManagement.GetHighestVersionOfFile(docPath, bestMatchPath:=bestMatchPath)
    If CInt(highVersion) > CInt(getCustomDocumentProperty("document_version")) Then
            MsgBox "Use the most recent version!" & vbCrLf & bestMatchPath
    End If
    Application.ScreenUpdating = False

    If InStr(1, docPath, "://steria.sharepoint.com", vbTextCompare) > 0 Then
        Dim localPath As String
        localPath = ConvertSharePointToLocal(docPath)
        
        Dim tempPath As String
        Dim separator As String
            
        separator = "\"
        tempPath = Options.DefaultFilePath(wdTempFilePath) & separator & "Temp_" & doc.Name
        
        ' 2. Wijzig de naam in het geheugen via SaveAs2 (Mac ondersteunt SaveAs2 in recente versies)
        doc.SaveAs2 fileName:=tempPath
        
        ' 3. Open het lokale bestand
        Documents.Open fileName:=localPath
        
        ' 4. Sluit het tijdelijke bestand en verwijder het veilig
        doc.Close SaveChanges:=wdDoNotSaveChanges
        
        ' Kill werkt op Mac mits de schrijfrechten in de temp-map gelden
        On Error Resume Next
        Kill tempPath
        On Error GoTo 0
        Exit Sub
    End If

    If LCase(getCustomDocumentProperty("document_status")) = "draft" Then
        UnLockDocument ActiveDocument
    Else
        LockDocument ActiveDocument
    End If
End Sub


Function ConvertSharePointToLocal(ByVal sharePointUrl As String) As String
    ' Replace forward slashes with backslashes
    Dim convertedPath As String
    convertedPath = Replace(sharePointUrl, "/", "\")
    
    ' Target prefix for your local cache
    Dim localPrefix As String
    localPrefix = "C:\Sopra Steria\Q-Regulate\"
    
    ' Find where the document library folder structure begins
    Dim searchString As String
    searchString = "sites\Qregulate\QDocuments\"
    
    Dim startPos As Long
    startPos = InStr(1, convertedPath, searchString, vbTextCompare)
    
    If startPos > 0 Then
        ' Extract everything after "QDocuments\"
        Dim relativePath As String
        relativePath = Mid(convertedPath, startPos + Len(searchString))
        
        ' Decode URL characters like %20 to spaces
        relativePath = URLDecode(relativePath)
        
        ' Combine prefix and relative path
        ConvertSharePointToLocal = localPrefix & relativePath
    Else
        ' Fallback if URL structure changes
        ConvertSharePointToLocal = sharePointUrl
    End If
End Function

Function URLDecode(ByVal txt As String) As String
    ' Simple helper to convert %20 back to spaces
    URLDecode = Replace(txt, "%20", " ")
End Function

Sub DocumentClose()
    If Not thisIsAQualityDocument Then Exit Sub

    ' A closed file must always be password protected; Draft documents keep the
    ' style-only lock (still editable next time), anything else is locked read-only.
    If LCase(getCustomDocumentProperty("document_status")) = "draft" Then
        UnLockDocument ActiveDocument
    Else
        LockDocument ActiveDocument
    End If
    ActiveDocument.Save
End Sub
Sub FilePrint()
    Options.UpdateFieldsAtPrint = True
    Options.PrintHiddenText = False
    Dialogs(wdDialogFilePrint).Show
End Sub

Sub FilePrintDefault()
    Options.UpdateFieldsAtPrint = True
    Options.PrintHiddenText = False
    ActiveDocument.PrintOut
End Sub
' Intercepts the standard Save command (Ctrl+S or the Save icon)
Sub FileSave()
    Dim document_status As DocumentProperty
    If Not thisIsAQualityDocument Then
        On Error Resume Next
        ActiveDocument.Save
        On Error GoTo 0
        Exit Sub
    End If
    If ActiveDocument.Path = "" Then
        'first time save
        If getCustomDocumentProperty("document_status") <> "Approved" Then
            MsgBox "You can't create a document from a non-approved template." & vbCrLf & "This document will close..", vbCritical, gTemplateSystemName
            ActiveDocument.Close SaveChanges:=False
            Exit Sub
        End If
        If InStr(LCase(ActiveDocument.AttachedTemplate.FullName), LCase("\Master Template\")) > 0 Then
            MsgBox "You can't create a document from a master template." & vbCrLf & "This document will close..", vbCritical, gTemplateSystemName
            ActiveDocument.Close SaveChanges:=False
            Exit Sub
        End If
        Call CreateVersion
    Else
        If DocumentProperties.findCustomDocumentProperty("document_status", document_status) Then
            If LCase(document_status.Value) = LCase("Approved") Then
                MsgBox "Approved documents can't be saved.", vbCritical, gTemplateSystemName
                Exit Sub
            End If
        End If
        ActiveDocument.Save
        Exit Sub
    End If
End Sub

' Intercepts the Save As command (F12 or File > Save As)
Sub FileSaveAs()
    If Not thisIsAQualityDocument Then
        On Error Resume Next
        ' Bring up the built-in Save As dialog box to let the user finish
        Dim dlg As Dialog
        Set dlg = Dialogs(wdDialogFileSaveAs)
        dlg.Show
        On Error GoTo 0
        Exit Sub
    End If
    
    
    If ActiveDocument.Path = "" Then
        'first time save
        FileSave
    Else
        On Error Resume Next
        ActiveDocument.Save
        On Error GoTo 0
        Exit Sub
    End If

End Sub
