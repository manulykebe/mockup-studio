Attribute VB_Name = "modExcelNotes"
Sub MakeAllNotesSameHeight()
    Dim cmt As Comment
    Dim targetHeight As Single
    Dim targetWidth As Single
    Dim iCounter As Single
    ' Set your desired height and width here (in points)
    targetHeight = 15
    targetWidth = 400
    iCounter = 0
    On Error Resume Next
    For Each cmt In ActiveSheet.Comments
        cmt.Shape.Left = 500 'xxx
        cmt.Shape.Top = cmt.Shape.Left - 300 - iCounter * (targetHeight + 5)
        cmt.Shape.Height = targetHeight
        'cmt.Shape.Width = cmt.Shape.Width + 20
        iCounter = iCounter + 1
    Next cmt
    On Error GoTo 0
    
End Sub

Sub NotitiesNaarRechtsUitvouwen()
    Dim startCel As Range
    Dim mijnArray As Variant
    Dim i As Long
    Dim doelCel As Range
    
    ' 1. Definieer de array met tekstuele waarden die in de notities moeten komen
    mijnArray = Array("Manage Material Libraries: Allows user to activate, deactivate, configure and edit the materials libraries.", _
"View Materials: Allows user to view the materials libraries.", _
"Add Materials: Allows user to add new materials. View Materials should be enabled prior to enabling Add Materials.", _
"Edit Materials: Allows user to edit the materials. View Materials should be enabled prior to enabling Edit Materials.", _
"Delete Materials: Allows user to delete the materials. View Materials and Edit Materials should be enabled prior to enabling Trash Materials.", _
"Export Materials: Allows user to export materials. View Materials should be enabled prior to enabling Export Materials.")



' 2. Start bij de momenteel geselecteerde cel
    Set startCel = ActiveCell
    
    ' Schakel schermvernieuwing uit voor snelheid
    Application.ScreenUpdating = False
    
    ' 3. Loop door elke waarde in de array
    For i = LBound(mijnArray) To UBound(mijnArray)
        ' Bepaal de doelcel: schuift bij elke stap in de loop 1 kolom naar rechts op
        Set doelCel = startCel.Offset(0, i)
        
        ' Verwijder een eventueel al bestaande notitie in de doelcel om fouten te voorkomen
        If Not doelCel.Comment Is Nothing Then doelCel.Comment.Delete
        
        ' Voeg de notitie toe met de tekst uit de array
        With doelCel.AddComment
            .Text mijnArray(i)
            .Visible = False ' Alleen zichtbaar bij mouse-over
            .Shape.TextFrame.AutoSize = True
        End With
    Next i
    
    ' Schakel schermvernieuwing weer in
    Application.ScreenUpdating = True
End Sub

Sub VerwijderAlleNotities()
    ' Verwijdert direct alle notities en opmerkingen op het actieve werkblad
    ActiveSheet.Cells.ClearComments
    
    ' Korte melding ter bevestiging
End Sub
