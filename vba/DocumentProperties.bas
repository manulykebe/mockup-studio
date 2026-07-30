Attribute VB_Name = "DocumentProperties"
Function findCustomDocumentProperty(propertyName As String, Optional ByRef property As Office.DocumentProperty, Optional ByRef targetDocument As Document) As Boolean
    If targetDocument Is Nothing Then Set targetDocument = ActiveDocument
    findCustomDocumentProperty = False
    For Each Item In targetDocument.CustomDocumentProperties
        If Item.Name = propertyName Then
            findCustomDocumentProperty = True
            Set property = Item
            Exit For
        End If
    Next
End Function
Sub getAllCustomDocumentProperties(Optional ByRef targetDoc As Document)
    If targetDoc Is Nothing Then
        Set targetDoc = ActiveDocument
    End If
    For i = 1 To targetDoc.CustomDocumentProperties.Count
        Debug.Print targetDoc.CustomDocumentProperties(i).Name
    Next
End Sub
Function getCustomDocumentProperty(propertyName As String, Optional ByRef targetDocument As Document) As Variant
    If targetDocument Is Nothing Then Set targetDocument = ActiveDocument
    
    Dim prop As DocumentProperty
    
    ' Loop door alle aangepaste eigenschappen
    For Each prop In targetDocument.CustomDocumentProperties
        ' Vergelijk de naam (ongevoelig voor hoofdletters)
        If LCase(prop.Name) = LCase(propertyName) Then
            getCustomDocumentProperty = prop.Value
            Exit Function
            ' De waarde is gevonden, stop de functie direct
        End If
    Next prop
    
    ' Optioneel: Geef Empty of Nothing terug als de eigenschap niet bestaat
    getCustomDocumentProperty = Empty
End Function


Sub setCustomDocumentProperty(propertyName As String, propertyValue As Variant, Optional ByRef targetDocument As Document)
    If targetDocument Is Nothing Then Set targetDocument = ActiveDocument
    
    Dim prop As DocumentProperty
    Dim propType As MsoDocProperties
    
    ' Bepaal automatisch het juiste gegevenstype op basis van de waarde
    Select Case VarType(propertyValue)
        Case vbBoolean: propType = msoPropertyTypeBoolean
        Case vbDate:    propType = msoPropertyTypeDate
        Case vbInteger, vbLong, vbSingle, vbDouble: propType = msoPropertyTypeNumber
        Case Else:      propType = msoPropertyTypeString
    End Select
    
    ' Loop door alle aangepaste eigenschappen om te kijken of deze al bestaat
    For Each prop In targetDocument.CustomDocumentProperties
        If LCase(prop.Name) = LCase(propertyName) Then
            ' Eigenschap bestaat: update de waarde en stop de sub
            prop.Value = propertyValue
            Exit Sub
        End If
    Next prop
    
    ' Eigenschap bestaat niet: voeg een nieuwe toe
    targetDocument.CustomDocumentProperties.Add _
        Name:=propertyName, _
        LinkToContent:=False, _
        Type:=propType, _
        Value:=propertyValue
End Sub

Sub ClearAllDocumentVariables()
    Dim i As Long
    Dim varCount As Long
    
    varCount = ActiveDocument.Variables.Count
    
    ' Check if there is anything to delete
    If varCount = 0 Then
        MsgBox "No document variables found to clear.", vbInformation
        Exit Sub
    End If
    
    ' Loop backwards to prevent index shift errors
    For i = varCount To 1 Step -1
        ActiveDocument.Variables(i).Delete
    Next i
    
    MsgBox "All " & varCount & " document variables have been deleted.", vbInformation
End Sub


Sub ListAllReferences()
    Dim ref
    
    Debug.Print "--- ACTIVE REFERENCES ---"
    
    ' Loop through every reference in the project
    For Each ref In ActiveDocument.VBProject.References
        Debug.Print "Name: " & ref.Name
        Debug.Print "Description: " & ref.Description
        Debug.Print "Path: " & ref.FullPath
        Debug.Print "GUID: " & ref.Guid
        Debug.Print "Broken: " & ref.IsBroken
        Debug.Print "-------------------------"
    Next ref
End Sub
