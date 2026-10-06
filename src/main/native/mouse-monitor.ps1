$ErrorActionPreference = 'Stop'

# High-precision Win32 mouse monitor detecting text selection gestures and right-click release
$typeDef = @'
using System;
using System.Runtime.InteropServices;

namespace WinMouse {
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }

    public static class Listener {
        [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
        [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);

        public static POINT GetPos() {
            POINT pt;
            GetCursorPos(out pt);
            return pt;
        }
    }
}
'@

Add-Type -TypeDefinition $typeDef

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

    $pt = [WinMouse.Listener]::GetPos()

    # 0x01 = VK_LBUTTON (Left Mouse Button)
    $lState = [WinMouse.Listener]::GetAsyncKeyState(1)
    $isLDown = ($lState -band 0x8000) -ne 0

    # 0x02 = VK_RBUTTON (Right Mouse Button)
    $rState = [WinMouse.Listener]::GetAsyncKeyState(2)
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

        $holdTime = $now - $downTime

        # Selection detected: Dragged > 3px OR held down > 150ms with movement OR double-clicked (< 450ms)
        if (($dx -gt 3 -or $dy -gt 3) -or ($holdTime -gt 150 -and ($dx -gt 2 -or $dy -gt 2)) -or ($sinceLastUp -lt 450)) {
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
