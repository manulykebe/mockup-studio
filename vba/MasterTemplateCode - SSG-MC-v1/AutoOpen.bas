Attribute VB_Name = "AutoOpen"
Sub AutoOpen()
    CustomizationContext = ThisDocument
    
    ' Clear previous custom bindings
'    On Error Resume Next
'    FindKey(BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyB)).Disable
'    FindKey(BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyI)).Disable
'    FindKey(BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyU)).Disable
'    FindKey(BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyHyphen)).Disable
'    FindKey(BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyPlus)).Disable
'    FindKey(BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyEqual)).Disable
'    FindKey(BuildKeyCode(wdKeyControl, wdKeyShift, wdKey0)).Disable   ' Clear Format
'    On Error GoTo 0
    
    ' Add bindings
'    KeyBindings.Add KeyCode:=BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyB), KeyCategory:=wdKeyCategoryMacro, Command:="RunBoldStyle"
'    KeyBindings.Add KeyCode:=BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyI), KeyCategory:=wdKeyCategoryMacro, Command:="RunItalicStyle"
'    KeyBindings.Add KeyCode:=BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyU), KeyCategory:=wdKeyCategoryMacro, Command:="RunUnderlineStyle"
'    KeyBindings.Add KeyCode:=BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyHyphen), KeyCategory:=wdKeyCategoryMacro, Command:="RunStrikethroughStyle"
'    KeyBindings.Add KeyCode:=BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyPlus), KeyCategory:=wdKeyCategoryMacro, Command:="RunSuperscriptStyle"
 '   KeyBindings.Add KeyCode:=BuildKeyCode(wdKeyControl, wdKeyShift, wdKeyEqual), KeyCategory:=wdKeyCategoryMacro, Command:="RunSubscriptStyle"
'    KeyBindings.Add KeyCode:=BuildKeyCode(wdKeyControl, wdKeyShift, wdKey0), KeyCategory:=wdKeyCategoryMacro, Command:="RunClearFormatting"
End Sub

' Wrapper macros called by key bindings
Sub RunBoldStyle()
    ToggleCharacterStyle "Strong"
End Sub

Sub RunItalicStyle()
    ToggleCharacterStyle "Emphasis"
End Sub

Sub RunUnderlineStyle()
    ToggleCharacterStyle "Underlined"
End Sub

Sub RunStrikethroughStyle()
    ToggleCharacterStyle "Strikethrough"
End Sub

Sub RunSuperscriptStyle()
    ToggleCharacterStyle "Superscript"
End Sub

Sub RunSubscriptStyle()
    ToggleCharacterStyle "Subscript"
End Sub

Sub RunClearFormatting()
    ToggleParagraphStyle "Normal"
End Sub


    
'----------------------------------------------------------
' Helper: Toggle a character style on/off
'----------------------------------------------------------

Sub ToggleCharacterStyle(styleName As String)
    Dim rng As Range
    Dim hasStyle As Boolean
    Dim styleToApply As Style
    
    On Error Resume Next
    Set styleToApply = ActiveDocument.Styles(styleName)
    On Error GoTo 0
    
    If styleToApply Is Nothing Then
        MsgBox "Style '" & styleName & "' not found in this document.", vbExclamation
        Exit Sub
    End If
    
    Set rng = Selection.Range
    
    ' Check if the entire selection already has the style
    hasStyle = True
    If rng.Start = rng.End Then
        ' Collapsed cursor - check the character to the right
        hasStyle = (rng.Characters(1).Style = styleToApply)
    Else
        ' Selection - check if every character has the style
        Dim c As Range
        For Each c In rng.Characters
            If c.Style <> styleToApply Then
                hasStyle = False
                Exit For
            End If
        Next c
    End If
    
    ' Toggle
    If hasStyle Then
        rng.Style = ActiveDocument.Styles("Default Paragraph Font")
    Else
        rng.Style = styleToApply
    End If
End Sub
Sub ToggleParagraphStyle(styleName As String)
    Dim rng As Range
    Dim hasStyle As Boolean
    Dim styleToApply As Style
    Dim para As Paragraph
    Dim defaultStyle As Style
    
    On Error Resume Next
    Set styleToApply = ActiveDocument.Styles(styleName)
    On Error GoTo 0
    
    If styleToApply Is Nothing Then
        MsgBox "Paragraph style '" & styleName & "' not found in this document.", vbExclamation
        Exit Sub
    End If
    
    ' Safety check: ensure it's actually a paragraph style
    If styleToApply.Type <> wdStyleTypeParagraph Then
        MsgBox "Style '" & styleName & "' is not a paragraph style.", vbExclamation
        Exit Sub
    End If
    
    Set rng = Selection.Range
    Set defaultStyle = ActiveDocument.Styles(wdStyleNormal)
    
    ' Check if all paragraphs in the selection already have the style
    hasStyle = True
    For Each para In rng.Paragraphs
        If para.Style <> styleToApply Then
            hasStyle = False
            Exit For
        End If
    Next para
    
    ' Toggle: apply or revert to Normal
    If hasStyle Then
        rng.Style = defaultStyle
    Else
        rng.Style = styleToApply
    End If
End Sub



