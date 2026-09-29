$ErrorActionPreference = 'Continue'
Write-Host '=== The Boys MAX preflight ==='

function Cmd($label, [scriptblock]$block) {
  Write-Host "`n--- $label ---"
  try { & $block } catch { Write-Host $_.Exception.Message }
}

Cmd 'Node' { node -v }
Cmd 'npm' { npm -v; npm ping }
Cmd 'Git' { git --version }
Cmd 'GitHub TCP' { Test-NetConnection github.com -Port 443 | Select-Object ComputerName,RemoteAddress,TcpTestSucceeded }
Cmd 'npm TCP' { Test-NetConnection registry.npmjs.org -Port 443 | Select-Object ComputerName,RemoteAddress,TcpTestSucceeded }
Cmd 'KudaGo TCP' { Test-NetConnection docs.kudago.com -Port 443 | Select-Object ComputerName,RemoteAddress,TcpTestSucceeded }
Cmd 'Timepad TCP' { Test-NetConnection dev.timepad.ru -Port 443 | Select-Object ComputerName,RemoteAddress,TcpTestSucceeded }
Cmd 'Node HTTPS npm' { node -e "fetch('https://registry.npmjs.org').then(r=>console.log(r.status)).catch(e=>{console.error(e);process.exitCode=1})" }
Cmd 'Docker CLI/Compose' { docker --version; docker compose version }
Cmd 'Docker daemon' { docker info }
Cmd 'Git status' { git status --short }
