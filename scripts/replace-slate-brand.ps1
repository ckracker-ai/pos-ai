# Migración rápida slate → tokens marca (WSP sprint ítem 4)
$root = Split-Path $PSScriptRoot -Parent
$files = @(
  'pos-frontend/src/app/(app)/branches/page.tsx',
  'pos-frontend/src/app/(app)/mermas/page.tsx',
  'pos-frontend/src/app/(app)/users/page.tsx',
  'pos-frontend/src/app/(app)/suppliers/page.tsx',
  'pos-frontend/src/app/(app)/pos/page.tsx',
  'pos-frontend/src/app/(app)/manual/page.tsx',
  'pos-frontend/src/app/(app)/comprobantes/page.tsx'
)
$replacements = @{
  'text-slate-500' = 'text-brand-ink-muted'
  'text-slate-600' = 'text-brand-ink-muted'
  'text-slate-400' = 'text-brand-ink-muted/80'
  'text-slate-700' = 'text-brand-ink'
  'bg-slate-200' = 'bg-brand-linen/50'
  'bg-slate-100' = 'bg-brand-surface'
  'bg-slate-50' = 'bg-brand-surface/80'
}
foreach ($rel in $files) {
  $p = Join-Path $root $rel
  if (-not (Test-Path $p)) { Write-Warning "Skip: $rel"; continue }
  $c = Get-Content $p -Raw -Encoding UTF8
  foreach ($k in $replacements.Keys) { $c = $c.Replace($k, $replacements[$k]) }
  [System.IO.File]::WriteAllText($p, $c, [System.Text.UTF8Encoding]::new($false))
  Write-Host "OK $rel"
}
