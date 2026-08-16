Attribute VB_Name = "Callbacks"
Public MyRibbon As IRibbonUI
Sub UpdateRibbon()
    If Not MyRibbon Is Nothing Then
        MyRibbon.Invalidate
    End If
End Sub

Sub UpdateRibbonControl(ControlID As String)
    If Not MyRibbon Is Nothing Then
        MyRibbon.InvalidateControl ControlID
    End If
End Sub

'Callback for PrintPreviewAndPrint onAction
Sub onFilePrint(control As IRibbonControl, ByRef cancelDefault)
    Interceptor.FilePrint
End Sub

'Callback for FilePrintQuick onAction
Sub onFilePrintDefault(control As IRibbonControl, ByRef cancelDefault)
    Interceptor.FilePrintDefault
End Sub

' Callback bij het laden van het lint (optioneel, handig voor vernieuwen)
Sub Ribbon_OnLoad(ribbon As IRibbonUI)
    ' Eventuele code bij het opstarten
    Set MyRibbon = ribbon
End Sub

'Callback for btnCreateTemplate getEnabled
Sub OnCreateTemplateClick_Enabled(control As IRibbonControl, ByRef returnedVal)
    returnedVal = ActiveDocument.CustomDocumentProperties.Item("document_type_code").Value = "MT"
End Sub

' Actie voor de "Create new template" knop
Sub OnCreateTemplateClick(control As IRibbonControl)
    With frmDocumentManagement
        .txtMode = "Create new template"
        .Show
    End With
End Sub

'Callback for btnCreateVersion getEnabled
Sub OnCreateVersionClick_Enabled(control As IRibbonControl, ByRef returnedVal)
    returnedVal = LCase(ActiveDocument.CustomDocumentProperties.Item("document_status").Value) = "approved"
End Sub
'Callback for btnCreateVersion getLabel
Sub OnCreateVersionClick_Label(control As IRibbonControl, ByRef returnedVal)
    returnedVal = "Create new version"
End Sub
' Actie voor de "Create new version" knop
Sub OnCreateVersionClick(control As IRibbonControl)
    Call CreateVersion(control)
End Sub

'Callback for btnApprove getEnabled
Sub OnApproveClick_Enabled(control As IRibbonControl, ByRef returnedVal)
    returnedVal = LCase(ActiveDocument.CustomDocumentProperties.Item("document_status").Value) = "draft"
End Sub

'Callback for btnApprove onAction
Sub OnApproveClick(control As IRibbonControl)
    With ActiveDocument.CustomDocumentProperties
        .Item("document_status").Value = "Approved"
        .Item("document_effective_date").Value = Format(Now + 1, "dd/mmm/yyyy")
    End With
    Call UpdateAllFields
    Call LockDocument(ActiveDocument)
    ActiveDocument.Save
    Call UpdateRibbon
End Sub


'Callback for btnMetadata getEnabled
Sub OnMetadataClick_Enabled(control As IRibbonControl, ByRef returnedVal)
    returnedVal = (LCase(ActiveDocument.CustomDocumentProperties.Item("document_status").Value) = "draft") Or _
                    (LCase(User.getUserName() = "evanneste"))
End Sub

'Callback for btnMetadata onAction
Sub OnMetadataClick(control As IRibbonControl)
    With frmDocumentManagement
        .txtMode = "Update metadata"
        .Show
    End With
End Sub

'Callback for Bold onAction
Sub OnBoldCommand2(control As IRibbonControl, ByRef cancelDefault)
    ToggleCharacterStyle "Strong"
    cancelDefault = True
End Sub

'Callback for Italic onAction
Sub OnItalicCommand2(control As IRibbonControl, ByRef cancelDefault)
    ToggleCharacterStyle "Emphasis"
    cancelDefault = True
End Sub

'Callback for Underline onAction
Sub OnUnderlineCommand2(control As IRibbonControl, ByRef cancelDefault)
    ToggleCharacterStyle "Underlined"
    cancelDefault = True
End Sub

'Callback for Strikethrough onAction
Sub OnStrikethroughCommand2(control As IRibbonControl, ByRef cancelDefault)
    ToggleCharacterStyle "Strikethrough"
    cancelDefault = True
End Sub

'Callback for Superscript onAction
Sub OnSuperscriptCommand2(control As IRibbonControl, ByRef cancelDefault)
    ToggleCharacterStyle "Superscript"
    cancelDefault = True
End Sub

'Callback for Subscript onAction
Sub OnSubscriptCommand2(control As IRibbonControl, ByRef cancelDefault)
    ToggleCharacterStyle "Subscript"
    cancelDefault = True
End Sub

Public Sub OnBoldCommand(control As IRibbonControl)
    ToggleCharacterStyle "Strong"
End Sub

Public Sub OnItalicCommand(control As IRibbonControl)
    ToggleCharacterStyle "Emphasis"
End Sub

Public Sub OnUnderlineCommand(control As IRibbonControl)
    ToggleCharacterStyle "Underlined"
End Sub

Public Sub OnStrikethroughCommand(control As IRibbonControl)
    ToggleCharacterStyle "Strikethrough"
End Sub

Public Sub OnSuperscriptCommand(control As IRibbonControl)
    ToggleCharacterStyle "Superscript"
End Sub

Public Sub OnSubscriptCommand(control As IRibbonControl)
    ToggleCharacterStyle "Subscript"
End Sub

Public Sub OnFormatTablesClick_Enabled(control As IRibbonControl, ByRef returnedVal)
    returnedVal = (Selection.Tables.Count > 0)
End Sub

Public Sub OnFormatTablesClick(control As IRibbonControl)
    Dim countTables As Long
    countTables = FormatSelectedTables()
    If countTables > 0 Then
        MsgBox countTables & " table(s) formatted.", vbInformation
    End If
End Sub

Public Sub OnClearFormattingCommand(control As IRibbonControl)
    RunClearFormatting
End Sub



'Callback for btnCleanTextDocument getEnabled
Sub OnCleanTextDocumentCommand_Enabled(control As IRibbonControl, ByRef returnedVal)
    returnedVal = False
End Sub

'Callback for btnCleanTextDocument getVisible
Sub OnCleanTextDocumentCommand_Visible(control As IRibbonControl, ByRef returnedVal)
    returnedVal = False
End Sub

'Callback for btnCleanTextDocument onAction
Sub OnCleanTextDocumentCommand(control As IRibbonControl)
    'ReplaceDoubleSpacingAndParagraphMarksRecursively
End Sub

'Callback for btnCleanTextSelection getEnabled
Sub OnCleanTextSelectionCommand_Enabled(control As IRibbonControl, ByRef returnedVal)
    returnedVal = False
End Sub

'Callback for btnCleanTextSelection getVisible
Sub OnCleanTextSelectionCommand_Visible(control As IRibbonControl, ByRef returnedVal)
    returnedVal = False
End Sub

'Callback for btnCleanTextSelection onAction
Sub OnCleanTextSelectionCommand(control As IRibbonControl)
    'ReplaceDoubleSpacingAndParagraphMarksInSelectionRecursively
End Sub




