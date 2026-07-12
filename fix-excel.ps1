$dir = Split-Path (Get-ChildItem "E:\Wewin\Game Tr*c Nghi*m\*.xlsx" | Where-Object { $_.Name -notlike '*.backup.*' } | Select-Object -First 1).FullName
Set-Location $dir
$path = (Get-ChildItem "*.xlsx" | Where-Object { $_.Name -notlike '*.backup.*' } | Select-Object -First 1).FullName
Copy-Item $path ($path -replace '\.xlsx$','.backup.xlsx') -Force

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($path)

function SerialToDateText($serial) {
  if ($null -eq $serial -or $serial -eq '') { return '' }
  $s = [string]$serial
  if ($s -match '^\d{4}-\d{2}') { return $s }
  try { return ([datetime]::FromOADate([double]$serial)).ToString('yyyy-MM-dd HH:mm:ss') } catch { return $s }
}
function SerialToDayKey($serial) {
  if ($null -eq $serial -or $serial -eq '') { return '' }
  $s = [string]$serial
  if ($s -match '^\d{4}-\d{2}-\d{2}$') { return $s }
  try { return ([datetime]::FromOADate([double]$serial)).ToString('yyyy-MM-dd') } catch { return $s }
}
function SerialToMonthKey($serial) {
  if ($null -eq $serial -or $serial -eq '') { return '' }
  $s = [string]$serial
  if ($s -match '^\d{4}-\d{2}$') { return $s }
  try { return ([datetime]::FromOADate([double]$serial)).ToString('yyyy-MM') } catch { return $s }
}

foreach ($ws in @($wb.Worksheets)) {
  if ($ws.Name -eq 'leaderboard') { $ws.Name = 'Leaderboard'; break }
}

$quiz = $wb.Worksheets.Item('Questions_Quiz')
$quiz.Cells.Item(1, 2).Value2 = 'course'
$quiz.Cells.Item(1, 6).Value2 = 'option_a'
for ($r = 2; $r -le $quiz.UsedRange.Rows.Count; $r++) { $quiz.Cells.Item($r, 9).Value2 = 'TRUE' }

$lb = $wb.Worksheets.Item('Leaderboard')
$lb.Cells.Item(1, 1).Value2 = 'username'
$lb.Cells.Item(1, 2).Value2 = 'display_name'
$lb.Cells.Item(1, 3).Value2 = 'score'
$lb.Cells.Item(1, 4).Value2 = 'badge'
$lb.Cells.Item(1, 5).Value2 = 'period'
$lb.Cells.Item(1, 6).Value2 = 'period_key'
$lb.Cells.Item(1, 7).Value2 = 'updated_at'

$agg = @{}
$lbLast = $lb.UsedRange.Rows.Count
for ($r = 2; $r -le $lbLast; $r++) {
  $user = [string]$lb.Cells.Item($r, 1).Value2
  $name = [string]$lb.Cells.Item($r, 2).Value2
  $score = [double]$lb.Cells.Item($r, 3).Value2
  $badge = [string]$lb.Cells.Item($r, 4).Value2; if (-not $badge) { $badge = 'C1' }
  $period = ([string]$lb.Cells.Item($r, 5).Value2).Trim().ToLower()
  $rawKey = $lb.Cells.Item($r, 6).Value2
  $updated = $lb.Cells.Item($r, 7).Value2
  $periodKey = [string]$rawKey
  if ($period -eq 'day') { $periodKey = SerialToDayKey $rawKey }
  elseif ($period -eq 'month') { $periodKey = SerialToMonthKey $rawKey }
  $key = "$user|$period|$periodKey"
  if (-not $agg.ContainsKey($key)) {
    $agg[$key] = @{ user = $user; name = $name; score = 0; badge = $badge; period = $period; periodKey = $periodKey; updated = $updated }
  }
  $agg[$key].score += $score
  if ($updated) { $agg[$key].updated = $updated }
}

$out = @($agg.Values)
if ($lbLast -gt 1) { $lb.Range("2:$lbLast").Clear() }
for ($i = 0; $i -lt $out.Count; $i++) {
  $row = $i + 2; $item = $out[$i]
  $lb.Cells.Item($row, 1).Value2 = $item.user
  $lb.Cells.Item($row, 2).Value2 = $item.name
  $lb.Cells.Item($row, 3).Value2 = [double]$item.score
  $lb.Cells.Item($row, 4).Value2 = $item.badge
  $lb.Cells.Item($row, 5).Value2 = $item.period
  $lb.Cells.Item($row, 6).NumberFormat = '@'
  $lb.Cells.Item($row, 6).Value2 = [string]$item.periodKey
  $lb.Cells.Item($row, 7).NumberFormat = '@'
  $lb.Cells.Item($row, 7).Value2 = [string](SerialToDateText $item.updated)
}

$log = $wb.Worksheets.Item('ScoreLog')
for ($r = 2; $r -le $log.UsedRange.Rows.Count; $r++) {
  $log.Cells.Item($r, 9).NumberFormat = '@'
  $log.Cells.Item($r, 9).Value2 = [string](SerialToDateText $log.Cells.Item($r, 9).Value2)
}

$wb.Save()
$wb.Close($false)
$excel.Quit()
Write-Host "OK - fixed $path"
