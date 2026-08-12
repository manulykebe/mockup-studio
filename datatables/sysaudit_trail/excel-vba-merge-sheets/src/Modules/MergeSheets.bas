Sub MergeSheets()
    Dim ws As Worksheet
    Dim newWs As Worksheet
    Dim startRow As Long, startCol As Long
    Dim lastRow As Long, lastCol As Long
    Dim newRow As Long
    Dim rng As Range

    Application.ScreenUpdating = False

    ' Remove existing MergedData sheet If present
    On Error Resume Next
    Application.DisplayAlerts = False
    ThisWorkbook.Worksheets("MergedData").Delete
    Application.DisplayAlerts = True
    On Error Goto 0

        ' Create a New worksheet For merged data
        Set newWs = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        newWs.Name = "MergedData"
        newRow = 1

        ' Loop through each worksheet in the workbook
        For Each ws In ThisWorkbook.Worksheets
            If ws.Name <> newWs.Name Then
                ' Skip empty sheets
                If Application.WorksheetFunction.CountA(ws.Cells) > 0 Then
                    ' Use UsedRange To detect first/last row And column of data
                    With ws.UsedRange
                        startRow = .Row
                        startCol = .Column
                        lastRow = .Row + .Rows.Count - 1
                        lastCol = .Column + .Columns.Count - 1
                    End With

                    ' Set the range To copy (auto-detected)
                    Set rng = ws.Range(ws.Cells(startRow, startCol), ws.Cells(lastRow, lastCol))

                    ' Copy the data To the New worksheet (stacked)
                    rng.Copy Destination:=newWs.Cells(newRow, 1)

                    ' Update the New row counter
                    newRow = newRow + rng.Rows.Count
                End If
            End If
        Next ws

        newWs.Columns.AutoFit
        Application.ScreenUpdating = True
End Sub