$ErrorActionPreference = 'Stop'

# High-precision Win32 mouse monitor detecting text selection gestures and right-click release
Add-Type -Namespace Win -Name MouseListener -MemberDefinition @'
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
[DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
public struct POINT { public int X; public int Y; }
'@

$leftDown = $false
$rightDown = $false
$downX = 0
$downY = 0
$downTime = 0
$lastUpTime = 0

[Console]::Out.WriteLine('ready')
[Console]::Out.Flush()

while ($true) {
    Start-Sleep -Milliseconds 25

    $pt = New-Object Win.POINT
    [Win.MouseListener]::GetCursorPos([ref]$pt) | Out-Null

    # 0x01 = VK_LBUTTON (Left Mouse Button)
    $lState = [Win.MouseListener]::GetAsyncKeyState(1)
    $isLDown = ($lState -band 0x8000) -ne 0

    # 0x02 = VK_RBUTTON (Right Mouse Button)
    $rState = [Win.MouseListener]::GetAsyncKeyState(2)
    $isRDown = ($rState -band 0x8000) -ne 0

    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

    # Left mouse transitions
    if ($isLDown -and -not $leftDown) {
        $leftDown = $true
        $downX = $pt.X
        $downY = $pt.Y
        $downTime = $now
    } elseif (-not $isLDown -and $leftDown) {
        $leftDown = $false
        $dx = [Math]::Abs($pt.X - $downX)
        $dy = [Math]::Abs($pt.Y - $downY)
        $sinceLastUp = $now - $lastUpTime
        $lastUpTime = $now

        # Selection detected: Dragged > 6px OR double-clicked (< 400ms interval)
        if (($dx -gt 6 -or $dy -gt 6) -or ($sinceLastUp -lt 400)) {
            [Console]::Out.WriteLine('selection_made')
            [Console]::Out.Flush()
        } else {
            [Console]::Out.WriteLine('left_clicked')
            [Console]::Out.Flush()
        }
    }

    # Right mouse transitions
    if ($isRDown -and -not $rightDown) {
        $rightDown = $true
    } elseif (-not $isRDown -and $rightDown) {
        $rightDown = $false
        [Console]::Out.WriteLine('right_clicked')
        [Console]::Out.Flush()
    }
}
