Attribute VB_Name = "DocumentBeheer"
Sub ListAllCustomProperties(Optional whichDocument As Document)
    Dim prop As DocumentProperty
    If whichDocument Is Nothing Then
        Set whichDocument = ActiveDocument
    End If
    ' Controleer of er �berhaupt aangepaste eigenschappen zijn
    If whichDocument.CustomDocumentProperties.Count = 0 Then
        MsgBox "Dit document bevat geen aangepaste eigenschappen.", vbInformation
        Exit Sub
    End If
    
    ' Loop door alle eigenschappen en print de naam en waarde
    For Each prop In whichDocument.CustomDocumentProperties
        On Error Resume Next ' Voorkomt fouten als een eigenschap leeg is
'        Debug.Print "Naam: " & prop.Name & " | Waarde: " & prop.Value
        Debug.Print prop.Name
        On Error GoTo 0
    Next
End Sub
Sub setGuid()
    ActiveDocument.CustomDocumentProperties.Item("document_guid").Value = GeneratePureGuid
End Sub

Sub LockDocument(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    ' ProtectionType reports wdNoProtection even when a style-only (EnforceStyleLock) password
    ' protection is active, so it can't be used to detect an already-protected document.
    ' Always attempt to remove any existing protection first; a harmless error is raised
    ' (and ignored) if the document wasn't protected at all.
    On Error Resume Next
    targetDoc.Unprotect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc))
    On Error GoTo 0
    ' Enforces read-only mode, bypassing field updates and general editing
    targetDoc.Protect Type:=wdAllowOnlyReading, _
                NoReset:=False, _
                Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc)), _
                EnforceStyleLock:=True
End Sub
Sub LockDocumentSections(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    On Error Resume Next
    targetDoc.Unprotect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc))
    On Error GoTo 0
    ' Enforces read-only mode, bypassing field updates and general editing
    targetDoc.Protect Type:=wdAllowOnlyFormFields, _
                NoReset:=False, _
                Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc)), _
                EnforceStyleLock:=True
End Sub
Sub UnLockDocument(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    On Error Resume Next
    targetDoc.Unprotect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc))
    On Error GoTo 0
    ' Content stays editable, but formatting/styles remain enforced and password-locked
    targetDoc.Protect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc)), Type:=wdNoProtection, EnforceStyleLock:=True
End Sub

' Regenerates document_guid and keeps the document's protection password in sync with it.
' Must be used instead of setting document_guid directly on a document that may be protected -
' otherwise the saved protection password (the OLD guid) permanently desyncs from the stored
' document_guid property (the NEW guid), causing "password is invalid" on the next open.
Sub RegenerateDocumentGuid(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    Dim oldGuid As String
    oldGuid = CStr(getCustomDocumentProperty("document_guid", targetDoc))

    On Error Resume Next
    targetDoc.Unprotect Password:=oldGuid
    On Error GoTo 0

    targetDoc.CustomDocumentProperties.Item("document_guid").Value = GeneratePureGuid

    targetDoc.Protect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc)), Type:=wdNoProtection, EnforceStyleLock:=True
End Sub
Sub UpdateAllFields(Optional ByRef targetDoc As Document)
    Dim storyRange As Range
    Dim toc As TableOfContents
    
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    
    ' Voorkom flikkeren van het scherm tijdens het bijwerken
    Application.ScreenUpdating = False
    
    ' Loop door alle mogelijke lagen van het document (hoofdtekst, koptekst, voettekst, voetnoten)
    For Each storyRange In targetDoc.StoryRanges
        Do
            storyRange.Fields.Update
            
            ' Controleer of er gekoppelde verhalen zijn (bijvoorbeeld opeenvolgende tekstvakken)
            Set storyRange = storyRange.NextStoryRange
        Loop Until storyRange Is Nothing
    Next storyRange
    
    ' Werk specifiek alle Inhoudsopgaven (TOC's) bij indien aanwezig
    For Each toc In targetDoc.TablesOfContents
        On Error Resume Next
        toc.Update
        On Error GoTo 0
    Next toc
    
    targetDoc.BuiltInDocumentProperties(wdPropertyTitle) = getCustomDocumentProperty("document_title", targetDoc)
    
    ' Zet schermvernieuwing weer aan
    Application.ScreenUpdating = True
End Sub


Sub CreateVersion(Optional control As IRibbonControl)
    With frmDocumentManagement
        .txtMode = "Create new version"
        .Show
    End With
    Call UpdateRibbon
End Sub

Function thisIsAQualityDocument() As Boolean
    Dim bFoundCustomDocumentProperty As Boolean
    bFoundCustomDocumentProperty = findCustomDocumentProperty("document_guid")
    thisIsAQualityDocument = bFoundCustomDocumentProperty
End Function
