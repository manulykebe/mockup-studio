VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} frmDocumentManagement 
   Caption         =   "Document Management"
   ClientHeight    =   4770
   ClientLeft      =   70
   ClientTop       =   300
   ClientWidth     =   8010
   OleObjectBlob   =   "frmDocumentManagement.frx":0000
   StartUpPosition =   1  'CenterOwner
End
Attribute VB_Name = "frmDocumentManagement"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False


Private Sub cbSave_Click()
    Dim mapPad As String, bronPad As String, targetPath As String
    Dim targetDoc As Document
    If Not DocumentBeheer.thisIsAQualityDocument Then Exit Sub
    
    Select Case Me.txtMode
        Case "Create new template"
            currentTemplate = Split(ActiveDocument.AttachedTemplate, ".")(0)
            mapPad = folderQRegulate & "Templates\" & Me.txtCompanyCode.text & "-" & Me.txtTypeCode.text & "\"
            bronPad = ActiveDocument.FullName
            targetPath = Me.txtTargetFullPath.text
            If KopieerBestand(bronPad, targetPath) = False Then
                Exit Sub
            End If
        
            Set targetDoc = Documents.Open(fileName:=targetPath, Visible:=True)
            DocumentBeheer.RegenerateDocumentGuid targetDoc
            With targetDoc.BuiltInDocumentProperties
                .Item("Title").Value = Me.txtTitle.text
            End With
            With targetDoc.CustomDocumentProperties
                .Item("document_number").Value = Me.txtNumber.text
                .Item("document_status").Value = Me.cbStatus.text
                .Item("document_title").Value = Me.txtTitle.text
                .Item("document_type").Value = Me.txtType.text
                .Item("document_type_code").Value = Me.txtTypeCode.text
                .Item("document_type_sequence").Value = Me.txtSequence.text
                .Item("document_version").Value = Me.txtVersion.text
                .Item("document_template").Value = currentTemplate
            End With
            With targetDoc.CustomDocumentProperties
                 .Item("document_owner").Value = textIfEnabled(Me.txtOwner.text, CBool(Me.cbOwner.Value))
                 .Item("document_author").Value = textIfEnabled(Me.txtAuthor.text, CBool(Me.cbAuthor.Value))
                 .Item("document_reviewer").Value = textIfEnabled(Me.txtReviewer.text, CBool(Me.cbReviewer.Value))
                 .Item("document_approver").Value = textIfEnabled(Me.txtApprover.text, CBool(Me.cbApprover.Value))
                 .Item("document_managementapprover").Value = textIfEnabled(Me.txtManagementApprover.text, CBool(Me.cbManagementApprover.Value))
            End With
            Call UpdateAllFields(targetDoc)
            
            Call text.ReplaceSection( _
                    "Use this template as starting point to create a new template:", _
                    "")
            targetDoc.Save
            
            Unload Me
            
            Application.Documents(bronPad).Close SaveChanges:=False
            
        Case "Create new version"
            If ActiveDocument.CustomDocumentProperties.Item("document_status").Value <> "Approved" Then
                MsgBox "Only approved documents can be increased.", vbApplicationModal + vbCritical
                Exit Sub
            End If
            bIsWordTemplate = InStr(ActiveDocument.FullName, ".dot") > 0
            If bIsWordTemplate Then
            
                targetPath = Me.txtTargetFullPath.text
                'Call MakeSureDirectoryPathExists(targetPath)
                If Dir(targetPath) = "" Then
                    On Error Resume Next
                    ActiveDocument.SaveAs2 targetPath
                    If Err.Number Then
                        Debug.Print Err.Description
                        Debug.Assert False
                    End If
                    On Error GoTo 0
                Else
                    MsgBox "This document already exists!", vbCritical, gTemplateSystemName
                    Exit Sub
                End If
                
                Set targetDoc = Documents(targetPath)
                targetDoc.Activate
                DocumentBeheer.RegenerateDocumentGuid targetDoc

                With targetDoc.BuiltInDocumentProperties
                    .Item("title").Value = Me.txtTitle.text
                End With
                With targetDoc.CustomDocumentProperties
                    .Item("document_number").Value = Me.txtNumber.text
                    .Item("document_status").Value = Me.cbStatus.text
                    .Item("document_title").Value = Me.txtTitle.text
                    .Item("document_type_sequence").Value = Me.txtSequence.text
                    .Item("document_version").Value = Me.txtVersion.text
                End With
                With targetDoc.CustomDocumentProperties
                     .Item("document_owner").Value = textIfEnabled(Me.txtOwner.text, CBool(Me.cbOwner.Value))
                     .Item("document_author").Value = textIfEnabled(Me.txtAuthor.text, CBool(Me.cbAuthor.Value))
                     .Item("document_reviewer").Value = textIfEnabled(Me.txtReviewer.text, CBool(Me.cbReviewer.Value))
                     .Item("document_approver").Value = textIfEnabled(Me.txtApprover.text, CBool(Me.cbApprover.Value))
                     .Item("document_managementapprover").Value = textIfEnabled(Me.txtManagementApprover.text, CBool(Me.cbManagementApprover.Value))
                End With
                
                Unload Me
                
                Call UpdateAllFields(targetDoc)

                Exit Sub
            End If
            
            ' Every new document (including the very first save of a brand-new document,
            ' which routes here via FileSave -> CreateVersion) must get its own unique
            ' guid/password; RegenerateDocumentGuid rotates both in sync.
            DocumentBeheer.RegenerateDocumentGuid ActiveDocument
            With ActiveDocument.BuiltInDocumentProperties
                .Item("title").Value = Me.txtTitle.text
            End With
            With ActiveDocument.CustomDocumentProperties
                .Item("document_number").Value = Me.txtNumber.text
                .Item("document_status").Value = Me.cbStatus.text
                .Item("document_title").Value = Me.txtTitle.text
                .Item("document_type_sequence").Value = Me.txtSequence.text
                .Item("document_version").Value = Me.txtVersion.text
                .Item("document_template").Value = Split(ActiveDocument.AttachedTemplate, ".")(0)
            End With
            With ActiveDocument.CustomDocumentProperties
                 .Item("document_owner").Value = textIfEnabled(Me.txtOwner.text, CBool(Me.cbOwner.Value))
                 .Item("document_author").Value = textIfEnabled(Me.txtAuthor.text, CBool(Me.cbAuthor.Value))
                 .Item("document_reviewer").Value = textIfEnabled(Me.txtReviewer.text, CBool(Me.cbReviewer.Value))
                 .Item("document_approver").Value = textIfEnabled(Me.txtApprover.text, CBool(Me.cbApprover.Value))
                 .Item("document_managementapprover").Value = textIfEnabled(Me.txtManagementApprover.text, CBool(Me.cbManagementApprover.Value))
            End With
            Call UpdateAllFields(targetDoc)
            
                
            targetPath = Me.txtTargetFullPath.text
            If Dir(targetPath) = "" Then
                Call MakeSureDirectoryPathExists(targetPath)
                ActiveDocument.SaveAs2 targetPath
            Else
                MsgBox "This document already exists!", vbCritical, gTemplateSystemName
            End If

            Unload Me
            
        Case "Update metadata"
            Call setCustomDocumentProperty("document_owner", textIfEnabled(Me.txtOwner.text, CBool(Me.cbOwner.Value)))
            Call setCustomDocumentProperty("document_author", textIfEnabled(Me.txtAuthor.text, CBool(Me.cbAuthor.Value)))
            Call setCustomDocumentProperty("document_reviewer", textIfEnabled(Me.txtReviewer.text, CBool(Me.cbReviewer.Value)))
            Call setCustomDocumentProperty("document_approver", textIfEnabled(Me.txtApprover.text, CBool(Me.cbApprover.Value)))
            Call setCustomDocumentProperty("document_managementapprover", textIfEnabled(Me.txtManagementApprover.text, CBool(Me.cbManagementApprover.Value)))
            Call UpdateAllFields(targetDoc)
            
            Unload Me
        
    End Select
End Sub
Function textIfEnabled(text As String, enabled As Boolean)
    textIfEnabled = ""
    If enabled Then
    textIfEnabled = text
    End If
End Function

Private Sub txtNumber_Change()
    Dim targetPath As String
    Me.txtTargetFullPath.text = ""
    Select Case Me.txtMode
    Case "Create new template"
        mapPad = folderQRegulate & "Templates\" & Me.txtCompanyCode.text & "-" & Me.txtTypeCode.text & "\"
        targetPath = mapPad & Me.txtNumber.text & "-v" & Me.txtVersion & ".dotm"
    Case "Create new version"
        bIsWordTemplate = InStr(ActiveDocument.FullName, ".dot") > 0
        If bIsWordTemplate Then
            mapPad = ActiveDocument.AttachedTemplate.Path & "\"
            targetPath = mapPad & Me.txtNumber.text & "-v" & Me.txtVersion.text & ".dotm"
        Else
            If ActiveDocument.Path = "" Then
                mapPad = folderQRegulate & Me.txtCompanyCode.text & "-" & Me.txtTypeCode & "\" & Me.txtNumber.text & "\"
                targetPath = mapPad & Me.txtNumber.text & "-v" & Me.txtVersion.text & ".docx"
            Else
                mapPad = folderQRegulate & Me.txtCompanyCode.text & "-" & Me.txtTypeCode & "\" & Me.txtNumber.text & "\"
                targetPath = mapPad & Me.txtNumber.text & "-v" & Me.txtVersion.text & ".docx"
            End If
        End If
    End Select
    Me.txtTargetFullPath.text = targetPath
    
    '
    'targetPath looks like "C:\Sopra Steria\Q-Regulate\Templates\SSG-SOP\SSG-SOP-v1.dotm",where -v is the version.
    'if targetPath exists, find the highest version in the parent folder
    If targetPath <> "" And Dir(PathName:=targetPath) <> "" Then
        Me.txtVersion.text = CDbl(FileManagement.GetHighestVersionOfFile(targetPath)) + 1
    End If
End Sub

Private Sub txtSequence_Change()
    bIsWordTemplate = InStr(ActiveDocument.FullName, ".dot") > 0
    If Not bIsWordTemplate Then
        Me.txtNumber.text = Me.txtCompanyCode.text & "-" & Me.txtTypeCode.text & "-" & Right("000" & Trim(Me.txtSequence.text), 3)
    End If
End Sub

Private Sub txtType_Change()
    Me.txtTitle.text = "Word template for a " & Me.txtType.text
End Sub
Private Sub txtTypeCode_Change()
    bIsWordTemplate = InStr(ActiveDocument.FullName, ".dot") > 0
    If bIsWordTemplate Then
        Me.txtNumber.text = Me.txtCompanyCode.text & "-" & Me.txtTypeCode.text
    End If
    If InStr(LCase(ActiveDocument.AttachedTemplate.FullName), LCase("\Master Template\")) = 0 Then
        If LCase(Me.txtTypeCode.text) = LCase("MT") Or LCase(Me.txtTypeCode.text) = LCase("MC") Then
            MsgBox "MT and MC are reserved for Master Template and Master Code Template", vbCritical, gTemplateSystemName
            Me.cbSave.enabled = False
        Else
            
            Me.cbSave.enabled = True
        End If
    End If
End Sub
Private Sub txtTypeCode_KeyPress(ByVal KeyAscii As MSForms.ReturnInteger)
    ForceAlphaNumericUpper KeyAscii
End Sub
Private Sub txtVersion_Change()
    Call txtTypeCode_Change
    Call txtNumber_Change
End Sub

Private Sub UserForm_Activate()
    Dim bIsNewDocument As Boolean
    Dim targetPath As String
    bIsNewDocument = ActiveDocument.Path = ""
    bIsWordTemplate = InStr(ActiveDocument.FullName, ".dot") > 0
    With Me
        With .txtGuid
            .text = getCustomDocumentProperty("document_guid")
        End With
        With .txtCompany
            .text = getCustomDocumentProperty("document_company")
        End With
        With .txtCompanyCode
            .text = getCustomDocumentProperty("document_company_code")
        End With
        With .txtType
            .text = getCustomDocumentProperty("document_type")
        End With
        With .txtTypeCode
            .text = getCustomDocumentProperty("document_type_code")
        End With
    End With
    With Me
        With .txtOwner
            .BackStyle = fmBackStyleOpaque
            .text = getCustomDocumentProperty("document_owner")
            .enabled = True
        End With
        With .txtAuthor
            .BackStyle = fmBackStyleOpaque
            .text = getCustomDocumentProperty("document_author")
            .enabled = True
        End With
        With .txtReviewer
            .BackStyle = fmBackStyleOpaque
            .text = getCustomDocumentProperty("document_reviewer")
            .enabled = True
        End With
        With .txtApprover
            .BackStyle = fmBackStyleOpaque
            .text = getCustomDocumentProperty("document_approver")
            .enabled = True
        End With
        With .txtManagementApprover
            .BackStyle = fmBackStyleOpaque
            .text = getCustomDocumentProperty("document_managementapprover")
            .enabled = True
        End With
    End With
    Select Case Me.txtMode.text
        Case "Create new template"
            With Me
                With .txtType
                    .BackStyle = fmBackStyleOpaque
                    .enabled = True
                    .text = ""
                End With
                With .txtTypeCode
                    .BackStyle = fmBackStyleOpaque
                    .enabled = True
                    .text = ""
                End With
                With .txtOwner
                    .BackStyle = fmBackStyleOpaque
                    .enabled = True
                End With
                With .txtSequence
                    .text = 0
                End With
                With .txtVersion
                    .text = 1
                End With
                With .cbStatus
                    .BackStyle = fmBackStyleOpaque
                    .text = "Draft"
                End With
            End With
        Case "Create new version"
            With Me
                With .txtType
                    .text = getCustomDocumentProperty("document_type")
                End With
                With .txtTypeCode
                    .text = getCustomDocumentProperty("document_type_code")
                End With
                With .txtTitle
                    .BackStyle = fmBackStyleOpaque
                    .text = getCustomDocumentProperty("document_title")
                    .enabled = True
                End With
                With .txtSequence
                    If Not bIsWordTemplate And Not bIsNewDocument Then
                        .text = CInt(getCustomDocumentProperty("document_type_sequence"))
                    Else
                        .text = "0"
                    End If
                    .enabled = bIsNewDocument
                    .BackStyle = fmBackStyleOpaque
                End With
                With .txtVersion
                    If bIsWordTemplate Or Not bIsNewDocument Then
                        targetPath = Me.txtTargetFullPath.text
                        .text = CDbl(FileManagement.GetHighestVersionOfFile(targetPath)) + 1
                    Else
                        .text = "1"
                    End If
                End With
                With .cbStatus
                    .BackStyle = fmBackStyleOpaque
                    .text = "Draft"
                End With
            End With
        Case "Update metadata"
            With Me
                With .txtTitle
                    .BackStyle = fmBackStyleOpaque
                    .text = getCustomDocumentProperty("document_title")
                    .enabled = True
                End With
                With .txtSequence
                    If Not bIsWordTemplate And Not bIsNewDocument Then
                        .text = CInt(getCustomDocumentProperty("document_type_sequence"))
                    Else
                        .text = "0"
                    End If
                End With
                With .txtVersion
                    .text = CDbl(getCustomDocumentProperty("document_version"))
                End With
            End With
    End Select
End Sub

Private Sub UserForm_Initialize()
    
    Me.txtTypeCode.MaxLength = 3
    Me.txtCompanyCode.MaxLength = 3
    
    ' Voeg direct 3 vaste waarden toe via een Array
    Me.cbStatus.List = Array("Draft", "Approved", "Obsolete")

    Me.txtGuid.Visible = LCase(User.getUserName()) = "evanneste"
    
End Sub
