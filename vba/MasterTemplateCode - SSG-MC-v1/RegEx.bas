Attribute VB_Name = "RegEx"

' Helper functie om speciale tekens in de bestandsnaam te escapen voor RegEx
Function regexEscape(str As String) As String
    Dim specials As String
    Dim i As Long
    specials = "\^$.|?*+()[]{}"
    For i = 1 To Len(specials)
        str = Replace(str, Mid(specials, i, 1), "\" & Mid(specials, i, 1))
    Next i
    regexEscape = str
End Function
