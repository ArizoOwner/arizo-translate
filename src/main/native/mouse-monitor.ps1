$ErrorActionPreference = 'Stop'

# High-precision Win32 mouse monitor detecting text selection gestures and right-click release
$typeDef = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace WinMouse {
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }

    public static class Listener {
        [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
        [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
        [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT Point);
        [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        public static POINT GetPos() {
            POINT pt;
            GetCursorPos(out pt);
            return pt;
        }

        public static string GetClassAtPoint(POINT pt) {
            IntPtr hWnd = WindowFromPoint(pt);
            if (hWnd == IntPtr.Zero) return "";
            StringBuilder sb = new StringBuilder(128);
            GetClassName(hWnd, sb, 128);
            return sb.ToString();
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

        # Exclude desktop icons, taskbar, Start Menu
        $wndClass = [WinMouse.Listener]::GetClassAtPoint($pt)
        $isSystemUI = ($wndClass -match '^(WorkerW|Progman|Shell_TrayWnd|Shell_SecondaryTrayWnd|Windows\.UI\.Core\.CoreWindow)$')

        # Deliberate horizontal text drag selection:
        # A true text selection requires holding down the left button and dragging across words.
        # - Single line text selection: horizontal drag >= 32px with horizontal dominance ($dx >= $dy * 1.3)
        # - Multiline text selection: total distance >= 55px, horizontal movement >= 20px, and hold time >= 300ms
        # - Must NOT be system UI (desktop wallpaper, taskbar, start menu)
        # - Normal clicks and double-clicks (opening folders, files, clicking buttons) NEVER trigger selection!
        $isDragSelection = $false
        if (-not $isSystemUI -and $holdTime -ge 180) {
            if ($dx -ge 32 -and $dx -ge ($dy * 1.3)) {
                $isDragSelection = $true
            } elseif ($dist -ge 55 -and $dx -ge 20 -and $holdTime -ge 300) {
                $isDragSelection = $true
            }
        }

        if ($isDragSelection) {
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
