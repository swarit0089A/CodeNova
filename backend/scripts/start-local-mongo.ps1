$mongoPaths = @(
  'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe',
  'C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe'
)

if (Get-Process -Name mongod -ErrorAction SilentlyContinue) {
  exit 0
}

$binaryPath = $mongoPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $binaryPath) {
  Write-Error 'Local mongod.exe was not found.'
  exit 1
}

$dbPath = Join-Path $env:LOCALAPPDATA 'CodeNova\mongo-data'
$logPath = Join-Path $dbPath 'mongod.log'

New-Item -ItemType Directory -Force $dbPath | Out-Null

Start-Process -FilePath $binaryPath -ArgumentList '--dbpath', $dbPath, '--bind_ip', '127.0.0.1', '--port', '27018', '--logpath', $logPath, '--logappend' -WindowStyle Hidden
exit 0
