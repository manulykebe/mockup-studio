Attribute VB_Name = "GUID"
Option Explicit

' 1. Structuur definieuren voor de Windows API om de GUID in op te vangen
Private Type GUID_TYPE
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(7) As Byte
End Type

' 2. Windows API declaratie (Werkt op zowel 32-bit als 64-bit Office)
#If VBA7 Then
    Private Declare PtrSafe Function CoCreateGuid Lib "ole32.dll" (Guid As GUID_TYPE) As Long
#Else
    Private Declare Function CoCreateGuid Lib "ole32" (Guid As GUID_TYPE) As Long
#End If



' 3. Help-functie om de GUID te genereren en als schone tekst terug te geven
Function GeneratePureGuid() As String
    Dim guidStructure As GUID_TYPE
    Dim guidString As String
    Dim i As Integer
    
    ' Roep de Windows API aan om de structuur te vullen
    If CoCreateGuid(guidStructure) = 0 Then
        ' Zet de bytes handmatig om naar een hexadecimale string (formaat: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
        guidString = String(8 - Len(Hex(guidStructure.Data1)), "0") & Hex(guidStructure.Data1) & "-" & _
                     String(4 - Len(Hex(guidStructure.Data2)), "0") & Hex(guidStructure.Data2) & "-" & _
                     String(4 - Len(Hex(guidStructure.Data3)), "0") & Hex(guidStructure.Data3) & "-"
                     
        ' Eerste twee bytes van Data4
        For i = 0 To 1
            guidString = guidString & String(2 - Len(Hex(guidStructure.Data4(i))), "0") & Hex(guidStructure.Data4(i))
        Next i
        guidString = guidString & "-"
        
        ' Resterende zes bytes van Data4
        For i = 2 To 7
            guidString = guidString & String(2 - Len(Hex(guidStructure.Data4(i))), "0") & Hex(guidStructure.Data4(i))
        Next i
        
        ' Geef de GUID in kleine letters terug (indien gewenst)
        GeneratePureGuid = LCase(guidString)
    Else
        GeneratePureGuid = "00000000-0000-0000-0000-000000000000"
    End If
End Function
