Attribute VB_Name = "DocumentBeheer"

Sub ListAllCustomProperties(Optional whichDocument As Document)
    Dim prop As DocumentProperty
    If whichDocument Is Nothing Then
        Set whichDocument = ActiveDocument
    End If
    ' Controleer of er überhaupt aangepaste eigenschappen zijn
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
    If CStr(getCustomDocumentProperty("document_status", targetDoc)) = "Draft" Then Exit Sub
    ' Check if already protected to avoid errors
    If targetDoc.ProtectionType = wdNoProtection Then
        ' Enforces read-only mode, bypassing field updates and general editing
        targetDoc.Protect Type:=wdAllowOnlyReading, _
                    NoReset:=False, _
                    Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc)), _
                    EnforceStyleLock:=True
        'MsgBox "Document is now locked.", vbInformation
    Else
        'MsgBox "Document is already protected.", vbExclamation
    End If
End Sub
Sub LockDocumentSections(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    ' Check if already protected to avoid errors
    If targetDoc.ProtectionType <> wdAllowOnlyFormFields Then
        targetDoc.Unprotect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc))
        ' Enforces read-only mode, bypassing field updates and general editing
        targetDoc.Protect Type:=wdAllowOnlyFormFields, _
                    NoReset:=False, _
                    Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc)), _
                    EnforceStyleLock:=True
        MsgBox "Styles are now locked.", vbInformation
    End If
End Sub
Sub UnLockDocument(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    ' EnforceStyleLock-only protection still reports wdNoProtection, so always attempt to unprotect
    On Error Resume Next
    targetDoc.Unprotect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc))
    On Error GoTo 0
    targetDoc.Protect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc)), Type:=wdNoProtection, EnforceStyleLock:=True
End Sub
Sub Unprotect(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    ' EnforceStyleLock-only protection still reports wdNoProtection, so always attempt to unprotect
    On Error Resume Next
    targetDoc.Unprotect Password:=CStr(getCustomDocumentProperty("document_guid", targetDoc))
    On Error GoTo 0
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


