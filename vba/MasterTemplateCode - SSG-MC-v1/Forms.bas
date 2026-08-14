Attribute VB_Name = "Forms"
Public Sub ForceAlphaNumericUpper(ByRef KeyAscii As MSForms.ReturnInteger)
    Select Case KeyAscii
        Case 48 To 57   ' Allows numbers 0-9
            ' Do nothing, allowed
        Case 65 To 90   ' Allows uppercase A-Z
            ' Do nothing, allowed
        Case 97 To 122  ' Intercepts lowercase a-z and forces uppercase
            KeyAscii = KeyAscii - 32
        Case Else       ' Blocks all other characters (spaces, symbols, punctuation)
            KeyAscii = 0
            Beep        ' Optional audio feedback
    End Select
End Sub
