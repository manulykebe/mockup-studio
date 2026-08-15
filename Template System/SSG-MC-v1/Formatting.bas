Attribute VB_Name = "Formatting"
Public Function FormatSelectedTables() As Long
    Dim tbl As Table
    Dim i As Long

    If Selection.Tables.Count = 0 Then
        MsgBox "No tables are selected.", vbExclamation
        FormatSelectedTables = 0
        Exit Function
    End If

    For i = 1 To Selection.Tables.Count
        Set tbl = Selection.Tables(i)

        With tbl.Range
            '.ClearFormatting
            .Paragraphs.Style = ActiveDocument.Styles("No Spacing")
        End With

        With tbl
            .Style = "Plain Table 1"
            .ApplyStyleHeadingRows = True
            .ApplyStyleLastRow = False
            .ApplyStyleRowBands = True
            .ApplyStyleColumnBands = False
            .ApplyStyleFirstColumn = False
            .ApplyStyleLastColumn = False
            .AutoFitBehavior wdAutoFitContent
            .AutoFitBehavior wdAutoFitWindow

            If .Rows.Count > 0 Then
                .Rows(1).HeadingFormat = True
            End If
        End With

        FormatSelectedTables = FormatSelectedTables + 1
    Next i
End Function

Public Sub FormatSelectedTablesCallback()
    Dim countTables As Long
    countTables = FormatSelectedTables()
    MsgBox countTables & " table(s) formatted.", vbInformation
End Sub

