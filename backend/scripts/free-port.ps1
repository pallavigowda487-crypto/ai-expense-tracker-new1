param(
    [int]$Port = 5000
)

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq 'Listen' }

if (-not $connections) {
    Write-Host "No process is listening on port $Port."
    exit 0
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        Write-Host "Stopping $($process.ProcessName) (PID $processId) on port $Port."
        Stop-Process -Id $processId -Force
    }
    catch {
        Write-Warning ("Could not stop process {0}: {1}" -f $processId, $_.Exception.Message)
    }
}

Write-Host "Port $Port is free."
