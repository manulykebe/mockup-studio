Attribute VB_Name = "Code128"
Public Function ConvertToCode128(ByVal InputString As String) As String
    Dim i As Integer
    Dim checksum As Long
    Dim checkDigit As Integer
    Dim finalString As String
    
    ' Controleer of de input leeg is
    If Len(InputString) = 0 Then
        ConvertToCode128 = ""
        Exit Function
    End If
    
    ' Code 128B startwaarde is altijd 104
    checksum = 104
    
    ' Loop door elk karakter om de checksum te berekenen
    For i = 1 To Len(InputString)
        ' ASCII-waarde converteren naar Code 128 waarde (ASCII - 32)
        checksum = checksum + (i * (Asc(Mid(InputString, i, 1)) - 32))
    Next i
    
    ' Bereken het controlegetal via modulo 103
    checkDigit = checksum Mod 103
    
    ' Bouw de definitieve tekenreeks op:
    ' Startteken (ASCII 204) + Input + Controlegetal + Stopteken (ASCII 206)
    
    ' Converteer checkDigit terug naar het juiste ASCII karakter
    Dim checkChar As String
    If checkDigit < 95 Then
        checkChar = Chr(checkDigit + 32)
    Else
        checkChar = Chr(checkDigit + 100)
    End If
    
    finalString = Chr(204) & InputString & checkChar & Chr(206)
    ConvertToCode128 = finalString
End Function

