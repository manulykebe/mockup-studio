Sub TransformSheet()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim c As Range
    Application.ScreenUpdating = False
    Set ws = ActiveSheet

    ' Remove top 8 rows
    On Error Resume Next
    ws.Rows("1:8").Delete Shift:=xlUp
    On Error Goto 0

        ' Insert a column left of A
        ws.Columns("A").Insert Shift:=xlToRight

        ' Determine last used row (handle empty sheet)
        If Application.WorksheetFunction.CountA(ws.Cells) = 0 Then
            lastRow = 1
        Else
            Set c = ws.Cells.Find(What:="*", After:=ws.Cells(1, 1), LookIn:=xlFormulas, _
            LookAt:=xlPart, SearchOrder:=xlByRows, SearchDirection:=xlPrevious)
            If Not c Is Nothing Then
                lastRow = c.Row
            Else
                lastRow = 1
            End If
        End If

        ' Fill A1:A(lastRow) With sheet name, but Set A1 To "Source"
        ws.Range("A1:A" & lastRow).Value = ws.Name
        ws.Range("A1").Value = "Source"

        Application.ScreenUpdating = True
end Sub