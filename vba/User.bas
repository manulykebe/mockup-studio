Attribute VB_Name = "User"
Option Explicit

Function getUserName()
    ' Haalt de unieke Windows-inlognaam van de gebruiker op
    getUserName = Environ("USERNAME")
End Function
