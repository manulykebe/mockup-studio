Attribute VB_Name = "Text"
Sub ReplaceText(text As String, replacementText As String)
    Dim rng As Range
    ' Kies hier het bereik, bijvoorbeeld het hele document
    Set rng = ActiveDocument.Content
    
    With rng.Find
        .ClearFormatting
        .Replacement.ClearFormatting
        .text = text
        .Replacement.text = replacementText
        .Forward = True
        .Wrap = wdFindContinue
        .Execute Replace:=wdReplaceAll ' Vervangt alle exemplaren
    End With
End Sub

Public Sub ReplaceDoubleSpacingAndParagraphMarksRecursively()
    Dim rng As Range
    Dim changed As Boolean
    Dim patternCount As Long
    Dim i As Long
    Dim patterns As Variant
    
    Set rng = ActiveDocument.Content
    patterns = Array(_
        Array("  ", " "), _
        Array(vbTab & vbTab, vbTab), _
        Array(" ^p", "^p"), _
        Array("^p ", "^p"), _
        Array("^p^p", "^p"), _
        Array("^m^m", "^m") _
    )
    
    Do
        changed = False
        patternCount = UBound(patterns) - LBound(patterns) + 1
        
        For i = 0 To patternCount - 1
            If ReplaceAllInRange(rng, CStr(patterns(i)(0)), CStr(patterns(i)(1))) Then
                changed = True
            End If
        Next i
    Loop While changed
End Sub

Public Sub ReplaceDoubleSpacingAndParagraphMarksInSelectionRecursively()
    Dim rng As Range
    Dim changed As Boolean
    Dim patternCount As Long
    Dim i As Long
    Dim patterns As Variant
    
    If Selection.Range.Text = vbNullString Then
        MsgBox "Selecteer eerst een tekstblok om te opschonen.", vbExclamation
        Exit Sub
    End If
    
    Set rng = Selection.Range
    patterns = Array(_
        Array("  ", " "), _
        Array(vbTab & vbTab, vbTab), _
        Array(" ^p", "^p"), _
        Array("^p ", "^p"), _
        Array("^p^p", "^p"), _
        Array("^m^m", "^m") _
    )
    
    Do
        changed = False
        patternCount = UBound(patterns) - LBound(patterns) + 1
        
        For i = 0 To patternCount - 1
            If ReplaceAllInRange(rng, CStr(patterns(i)(0)), CStr(patterns(i)(1))) Then
                changed = True
            End If
        Next i
    Loop While changed
End Sub

Private Function ReplaceAllInRange(ByVal rng As Range, ByVal findText As String, ByVal replacementText As String) As Boolean
    Dim foundValue As Boolean
    
    If Len(findText) = 0 Then
        ReplaceAllInRange = False
        Exit Function
    End If
    
    If InStr(1, rng.Text, findText, vbTextCompare) = 0 Then
        ReplaceAllInRange = False
        Exit Function
    End If
    
    With rng.Find
        .ClearFormatting
        .Replacement.ClearFormatting
        .Text = findText
        .Replacement.Text = replacementText
        .MatchWildcards = False
        .Forward = True
        .Wrap = wdFindContinue
        .Execute Replace:=wdReplaceAll
        foundValue = .Found
    End With
    
    ReplaceAllInRange = foundValue
End Function

Sub ReplaceSection(oldTextPartial As String, newText As String)
    Dim doc As Document
    Dim sec As Section
    Dim foundSection As Boolean
    
    Set doc = ActiveDocument
    foundSection = False
    
    ' Loop door alle secties van het document
    For Each sec In doc.Sections
        ' Controleer of de gezochte (deel)tekst in het bereik van deze sectie voorkomt
        If InStr(1, sec.Range.text, oldTextPartial, vbTextCompare) > 0 Then
            
            Dim rng As Range, txt As String
            Set rng = sec.Range
            
            txt = sec.Range.text
            txt = Left(txt, Len(txt) - 1)
            
            ' Selecteer alles in de sectie BEHALVE het sectie-einde zelf
            rng.MoveEnd wdCharacter, -1
            
            With rng.Find
                .ClearFormatting
                .Replacement.ClearFormatting
                .text = txt
                .Replacement.text = newText
                .MatchWildcards = True
                .Forward = True
                .Wrap = wdFindStop
                .Format = True
                .Execute Replace:=wdReplaceAll
            End With
            
            foundSection = True
            
            Exit For
        End If
    Next sec
    
    ' Optionele melding als de tekst niet is gevonden
    If Not foundSection Then
        MsgBox "De tekst '" & oldTextPartial & "' werd in geen enkele sectie gevonden.", vbExclamation
    End If
End Sub

