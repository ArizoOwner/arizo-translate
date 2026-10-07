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
$lastClickTime = 0
$lastClickX = 0
$lastClickY = 0
$clickCount = 0

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
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        $holdTime = $now - $downTime

        # Selection detected:
        # 1) Deliberate mouse drag: moved > 15px with hold time > 70ms
        $isDragSelection = ($dist -gt 15 -and $holdTime -gt 70)

        # 2) Multi-click selection: double-click / triple-click in same area (< 12px) within 400ms
        $isMultiClickSelection = $false
        if ($dist -le 12) {
            $dt = $now - $lastClickTime
            $cdx = [Math]::Abs($pt.X - $lastClickX)
            $cdy = [Math]::Abs($pt.Y - $lastClickY)
            $cDist = [Math]::Sqrt($cdx * $cdx + $cdy * $cdy)
            if ($dt -lt 400 -and $cDist -lt 12) {
                $clickCount++
                if ($clickCount -ge 2) {
                    $isMultiClickSelection = $true
                }
            } else {
                $clickCount = 1
                $lastClickX = $pt.X
                $lastClickY = $pt.Y
            }
            $lastClickTime = $now
        } else {
            $clickCount = 0
        }

        if ($isDragSelection -or $isMultiClickSelection) {
            [Console]::Out.WriteLine('selection_made')
            [Console]::Out.Flush()
        } else {
            [Console]::Out.WriteLine('left_clicked')
            [Console]::Out.Flush()
        }
    }

    # Right mouse transitions - notify when pressed or released so bubble can hide immediately
    if ($isRDown -and -not $rightDown) {
        $rightDown = $true
        [Console]::Out.WriteLine('right_clicked')
        [Console]::Out.Flush()
    } elseif (-not $isRDown -and $rightDown) {
        $rightDown = $false
        [Console]::Out.WriteLine('right_clicked')
        [Console]::Out.Flush()
    }
}
