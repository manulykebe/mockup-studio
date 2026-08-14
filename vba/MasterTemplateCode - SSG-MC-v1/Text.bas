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

