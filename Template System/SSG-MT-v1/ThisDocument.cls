VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisDocument"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Private Sub Document_Close()
    If Not IsSSGReferenceSet Then
        MsgBox "Template Reference Missing", vbApplicationModal + vbCritical, "Error"
        Exit Sub
    End If
    Interceptor.DocumentClose
End Sub

Private Sub Document_Open()
    If Not IsSSGReferenceSet Then
        Debug.Assert False

        MsgBox "Template Reference Missing", vbApplicationModal + vbCritical, "Error"
        Exit Sub
    End If
    
    ' 3. Safely execute the Interceptor payload
    On Error Resume Next
    Interceptor.DocumentOpen
    
    If Err.Number <> 0 Then
        MsgBox "Document cannot be opened properly!" & vbCrLf & "Error: " & Err.Description, _
               vbApplicationModal + vbCritical, "Execution Failure"
    End If
    On Error GoTo 0
End Sub
Private Sub Document_New()
    If Not IsSSGReferenceSet Then
        Debug.Assert False

        MsgBox "Template Reference Missing", vbApplicationModal + vbCritical, "Error"
        Exit Sub
    End If
    Interceptor.DocumentNew
End Sub
Sub FilePrint()
    Interceptor.FilePrint
End Sub


Private Function IsSSGReferenceSet() As Boolean
    Dim ref As Object
    Dim refName As String
    Dim versionPart As String
    Dim dotPos As Long
    
    IsSSGReferenceSet = False
    
    On Error Resume Next
    For Each ref In ThisDocument.VBProject.References
        ' Get the filename (e.g., "SSG-MC-v1.dotm" or "SSG-MC-v999.dotm")
        If ref.Name = "MasterTemplateCode" Then
            IsSSGReferenceSet = True
            Exit Function
        End If
    Next ref
    On Error GoTo 0
End Function

