Attribute VB_Name = "VBE"
Sub VerwijderOngeldigeVerwijzingen()
    Dim i As Long
    Dim vbaProj As Object
    Dim huidigeRef As Object
    Dim teller As Long
    

    
    On Error Resume Next
    Set vbaProj = Application.VBE.ActiveVBProject
    If vbaProj Is Nothing Then
        MsgBox "Toegang tot het objectmodel van het VBA-project vertrouwen!", vbCritical, gTemplateSystemName
        Exit Sub
    End If
    ' Loop achterwaarts door de lijst om fouten tijdens het verwijderen te voorkomen
    For i = vbaProj.References.Count To 1 Step -1
        Set huidigeRef = vbaProj.References.Item(i)
        
        ' Controleer of de verwijzing defect/ontbrekend is
        If huidigeRef.IsBroken = True Then
            Debug.Print "Verwijderd: " & huidigeRef.Name
            vbaProj.References.Remove huidigeRef
            teller = teller + 1
        End If
    Next i
    On Error GoTo 0
    
    ' Resultaat tonen
    If teller > 0 Then
        MsgBox teller & " ongeldige verwijzing(en) succesvol verwijderd!", vbInformation, "Systeemopruiming"
    Else
        MsgBox "Geen ongeldige verwijzingen gevonden.", vbInformation, "Systeemopruiming"
    End If
End Sub

Sub VoegSjabloonReferentieToe()

    Call VerwijderOngeldigeVerwijzingen

    Dim vbaProj As Object
    Dim targetPath As String
    Dim ref As Object
    Dim alAanwezig As Boolean
    
    ' Het exacte pad naar jouw Master Template
    targetPath = "C:\Sopra Steria\Q-Regulate\Master Template\SSG-MC\SSG-MC-v1.dotm"
    
    ' 1. Controleer of het bestand daadwerkelijk bestaat op de C-schijf
    If Dir(targetPath) = "" Then
        MsgBox "Fout: Het bestand kan niet worden gevonden op de locatie:" & vbCrLf & targetPath, vbCritical, "Bestand Niet Gevonden"
        Exit Sub
    End If
    
    On Error Resume Next
    Set vbaProj = Application.VBE.ActiveVBProject
    On Error GoTo 0
    
    If vbaProj Is Nothing Then
        MsgBox "Toegang tot het VBA-project is geblokkeerd." & vbCrLf & _
               "Schakel 'Toegang tot het objectmodel van het VBA-project vertrouwen' in bij de macro-instellingen.", vbCritical, "Beveiligingswaarschuwing"
        Exit Sub
    End If
    
    ' 2. Loop door bestaande referenties om duplicaten te voorkomen
    For Each ref In vbaProj.References
        If UCase(ref.FullPath) = UCase(targetPath) Then
            alAanwezig = True
            Exit For
        End If
    Next ref
    
    ' 3. Voeg de referentie toe als deze nog niet bestaat
    If Not alAanwezig Then
        On Error Resume Next
        vbaProj.References.AddFromFile targetPath
        
        If Err.Number = 0 Then
            MsgBox "Referentie naar SSG-MC-v1 succesvol gekoppeld!", vbInformation, "Succes"
        Else
            MsgBox "Fout bij koppelen: " & Err.Description, vbCritical, "Fout"
        End If
        On Error GoTo 0
    Else
        MsgBox "De referentie naar dit sjabloon was al actief in het project.", vbInformation, "Info"
    End If
End Sub


