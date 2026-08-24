Attribute VB_Name = "ExportTableToSortableHtml"
Option Explicit

' Exports the active Excel table, or the selected range when the active cell
' is not inside a table, to a standalone sortable HTML file.
Public Sub ExportActiveTableToSortableHtml()
    Dim sourceRange As Range
    Dim html As String
    Dim outputPath As Variant
    Dim fileNumber As Integer

    Set sourceRange = GetSourceRange()
    If sourceRange Is Nothing Then
        MsgBox "Select a range or place the active cell inside an Excel table.", vbExclamation
        Exit Sub
    End If

    html = BuildHtmlTable(sourceRange)

    outputPath = Application.GetSaveAsFilename( _
        InitialFileName:=SanitizeFileName(sourceRange.Worksheet.Name) & "_table.html", _
        FileFilter:="HTML Files (*.html), *.html", _
        Title:="Export sortable HTML table")

    If VarType(outputPath) = vbBoolean And outputPath = False Then Exit Sub

    If LCase$(Right$(CStr(outputPath), 5)) <> ".html" Then
        outputPath = CStr(outputPath) & ".html"
    End If

    fileNumber = FreeFile
    Open CStr(outputPath) For Output As #fileNumber
    Print #fileNumber, html
    Close #fileNumber

    MsgBox "Sortable HTML table exported to:" & vbCrLf & CStr(outputPath), vbInformation
End Sub

Private Function GetSourceRange() As Range
    Dim table As ListObject

    On Error Resume Next
    Set table = ActiveCell.ListObject
    On Error GoTo 0

    If Not table Is Nothing Then
        Set GetSourceRange = table.Range
    ElseIf TypeName(Selection) = "Range" Then
        Set GetSourceRange = Selection
    End If
End Function

Private Function BuildHtmlTable(ByVal sourceRange As Range) As String
    Dim html As String
    Dim rowIndex As Long
    Dim columnIndex As Long
    Dim cellValue As String

    html = "<!doctype html>" & vbCrLf
    html = html & "<html lang=""en"">" & vbCrLf
    html = html & "<head>" & vbCrLf
    html = html & "<meta charset=""utf-8"">" & vbCrLf
    html = html & "<meta name=""viewport"" content=""width=device-width, initial-scale=1"">" & vbCrLf
    html = html & "<title>" & HtmlEncode(sourceRange.Worksheet.Name) & "</title>" & vbCrLf
    html = html & "<style>" & vbCrLf
    html = html & "body{font-family:system-ui,sans-serif;margin:2rem;color:#202124}" & vbCrLf
    html = html & "table{border-collapse:collapse;width:100%;max-width:100%;font-size:.95rem}" & vbCrLf
    html = html & "th,td{border:1px solid #d9d9d9;padding:.55rem .7rem;text-align:left;vertical-align:top}" & vbCrLf
    html = html & "th{background:#f1f3f4;cursor:pointer;position:sticky;top:0;white-space:nowrap}" & vbCrLf
    html = html & "th:hover{background:#e3e7ea}th::after{content:'  ⇅';color:#6b7280;font-size:.8em}" & vbCrLf
    html = html & "tr:nth-child(even){background:#fafafa}tr:hover{background:#fff4cc}" & vbCrLf
    html = html & "</style>" & vbCrLf
    html = html & "</head>" & vbCrLf
    html = html & "<body>" & vbCrLf
    html = html & "<table id=""sortableTable"">" & vbCrLf
    html = html & "<thead><tr>"

    For columnIndex = 1 To sourceRange.Columns.Count
        html = html & "<th scope=""col"" onclick=""sortTable(" & CStr(columnIndex - 1) & ")"">"
        html = html & HtmlEncode(CellText(sourceRange.Cells(1, columnIndex))) & "</th>"
    Next columnIndex

    html = html & "</tr></thead>" & vbCrLf
    html = html & "<tbody>" & vbCrLf

    For rowIndex = 2 To sourceRange.Rows.Count
        html = html & "<tr>"
        For columnIndex = 1 To sourceRange.Columns.Count
            cellValue = CellText(sourceRange.Cells(rowIndex, columnIndex))
            html = html & "<td data-sort-value=""" & HtmlEncode(LCase$(cellValue)) & """>"
            html = html & HtmlEncode(cellValue) & "</td>"
        Next columnIndex
        html = html & "</tr>" & vbCrLf
    Next rowIndex

    html = html & "</tbody></table>" & vbCrLf
    html = html & "<script>" & vbCrLf
    html = html & "const directions={};" & vbCrLf
    html = html & "function sortTable(column){const table=document.getElementById('sortableTable');const body=table.tBodies[0];const rows=Array.from(body.rows);directions[column]=!directions[column];const direction=directions[column]?1:-1;rows.sort((a,b)=>{const av=a.cells[column].dataset.sortValue||'';const bv=b.cells[column].dataset.sortValue||'';const an=Number(av),bn=Number(bv);if(av!==''&&bv!==''&&!Number.isNaN(an)&&!Number.isNaN(bn))return(an-bn)*direction;return av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'})*direction;});rows.forEach(row=>body.appendChild(row));}" & vbCrLf
    html = html & "</script>" & vbCrLf
    html = html & "</body></html>"

    BuildHtmlTable = html
End Function

Private Function CellText(ByVal cell As Range) As String
    If IsError(cell.Value) Or IsEmpty(cell.Value) Then
        CellText = ""
    Else
        CellText = CStr(cell.Text)
    End If
End Function

Private Function HtmlEncode(ByVal value As String) As String
    value = Replace(value, "&", "&amp;")
    value = Replace(value, "<", "&lt;")
    value = Replace(value, ">", "&gt;")
    value = Replace(value, """", "&quot;")
    value = Replace(value, "'", "&#39;")
    HtmlEncode = Replace(value, vbCrLf, "<br>")
End Function

Private Function SanitizeFileName(ByVal value As String) As String
    Dim invalidCharacter As Variant

    For Each invalidCharacter In Array("\", "/", ":", "*", "?", """", "<", ">", "|")
        value = Replace(value, CStr(invalidCharacter), "_")
    Next invalidCharacter

    SanitizeFileName = value
End Function
