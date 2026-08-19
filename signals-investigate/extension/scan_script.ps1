$jsFiles = Get-ChildItem -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\lib\\(codemirror|prettier)\\' }
$output = [System.Collections.Generic.List[string]]::new()
foreach ($file in $jsFiles) {
    $relPath = Resolve-Path $file.FullName -Relative
    $output.Add("=== FILE: $relPath ===")
    $content = Get-Content $file.FullName
    $lineNum = 0
    foreach ($line in $content) {
        $lineNum++
        
        # 1. i18n reference
        $hasI18n = $line -match "(?i)\bi18n\b|\btranslate\b|\bchrome\.i18n\b|\bwindow\.i18n\b"
        
        # 2. Chinese characters
        # Note: PowerShell 5.1/Core regex supports unicode properties path. Or [\x{4e00}-\x{9fa5}]. In standard .NET regex, it is [\p{IsCJKUnifiedIdeographs}] or [\x4e00-\x9fa5]
        $hasChinese = $line -match "[\u4e00-\u9fa5]"
        
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
$output | Set-Content -Path "scan_results.txt" -Encoding utf8
Write-Host "Scan completed!"
