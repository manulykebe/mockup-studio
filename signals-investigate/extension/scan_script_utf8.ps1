$jsFiles = Get-ChildItem -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\lib\\(codemirror|prettier)\\' }
$output = [System.Collections.Generic.List[string]]::new()
foreach ($file in $jsFiles) {
    $relPath = Resolve-Path $file.FullName -Relative
    $output.Add("=== FILE: $relPath ===")
    
    # Read as UTF8
    $content = [System.IO.File]::ReadAllLines($file.FullName, [System.Text.Encoding]::UTF8)
    $lineNum = 0
    foreach ($line in $content) {
        $lineNum++
        
        # 1. i18n reference
        $hasI18n = $line -match "(?i)\bi18n\b|\btranslate\b|\bchrome\.i18n\b|\bwindow\.i18n\b"
        
        # 2. Chinese characters (Unicode range for CJK Unified Ideographs)
        $hasChinese = $line -match "[\x{4e00}-\x{9fa5}]"
        
        # 3. User-facing strings / console messages
        # console.log/warn/error, alert, confirm, prompt, Error(...), textContent/innerHTML strings
        $hasUserFacing = $line -match "console\.(log|warn|error)|alert\(|confirm\(|prompt\(|new\s+Error\(|Error\(|textContent\s*=|innerHTML\s*="
        
        if ($hasI18n -or $hasChinese -or $hasUserFacing) {
            $matched = @()
            if ($hasI18n) { $matched += "I18n" }
            if ($hasChinese) { $matched += "Chinese" }
            if ($hasUserFacing) { $matched += "UserFacing" }
            $mStr = $matched -join ", "
            $trimmed = $line.Trim()
            $output.Add("  Line $lineNum [$mStr]: $trimmed")
        }
    }
}
[System.IO.File]::WriteAllLines("scan_results.txt", $output, [System.Text.Encoding]::UTF8)
Write-Host "Scan completed in UTF-8!"
