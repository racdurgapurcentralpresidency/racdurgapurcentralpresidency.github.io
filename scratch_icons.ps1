$ref = 'C:\ROTARACT\RACDCP 2026-27\Website\racdcp-report-book-full\report-book\site\index.html'
$content = Get-Content $ref -Raw
$matches = [regex]::Matches($content, '<span class="rebel-menu-icon">[\s\S]*?</span>')
for ($i = 0; $i -lt $matches.Count; $i++) {
    Write-Host "=== AREA $($i+1) ==="
    Write-Host $matches[$i].Value
}
