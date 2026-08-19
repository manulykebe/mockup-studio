$basePath = "d:\Github\mockup-studio\signals-investigate\extension"
$files = Get-ChildItem -Path $basePath -Recurse -File | Where-Object { $_.Extension -match "\.(js|html|json|css|md|txt)$" }

foreach ($file in $files) {
    if ($file.FullName -like "*\lib\*" -and $file.Name -match "\.min\.") {
        # Skip minified vendor files under lib unless they contain handwritten comments? Let's check them anyway but separately, or check all of them first.
    }
    
    $relativePath = Resolve-Path $file.FullName -Relative -RelativeTo $basePath
    # Clean relative path format (remove .\ if present)
    $relativePath = $relativePath -replace "^\\.\s*", "" -replace "^\.\\", ""
    
    $lines = Get-Content -Path $file.FullName -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($null -eq $lines) { continue }
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($line -match "\p{IsCJKUnifiedIdeographs}") {
            [PSCustomObject]@{
                Path = $relativePath
                LineNumber = $i + 1
                LineText = $line.Trim()
            } | ConvertTo-Json -Compress | Write-Host
        }
    }
}
