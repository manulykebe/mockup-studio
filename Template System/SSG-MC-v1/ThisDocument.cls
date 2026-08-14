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
    Interceptor.DocumentClose
End Sub

Private Sub Document_Open()
    On Error Resume Next
    Interceptor.DocumentOpen
    
    If Err.Number <> 0 Then
        MsgBox "Document cannot be opened properly!" & vbCrLf & "Error: " & Err.Description, _
               vbApplicationModal + vbCritical, "Execution Failure"
    End If
    On Error GoTo 0
End Sub
Private Sub Document_New()
    Interceptor.DocumentNew
End Sub
Sub FilePrint()
    Interceptor.FilePrint
End Sub



