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

    [StructLayout(LayoutKind.Sequential)]
    public struct CURSORINFO {
        public int cbSize;
        public int flags;
        public IntPtr hCursor;
        public POINT ptScreenPos;
    }

    public static class Listener {
        [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
        [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
        [DllImport("user32.dll")] public static extern bool GetCursorInfo(out CURSORINFO pci);
        [DllImport("user32.dll")] public static extern IntPtr LoadCursor(IntPtr hInstance, int lpCursorName);
        [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT Point);
        [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        public static POINT GetPos() {
            POINT pt;
            GetCursorPos(out pt);
            return pt;
        }

        public static bool IsArrowCursor() {
            CURSORINFO ci = new CURSORINFO();
            ci.cbSize = Marshal.SizeOf(typeof(CURSORINFO));
            if (!GetCursorInfo(out ci)) return false;
            IntPtr arrow = LoadCursor(IntPtr.Zero, 32512); // IDC_ARROW
            return ci.hCursor == arrow;
        }

        public static bool IsIBeamCursor() {
            CURSORINFO ci = new CURSORINFO();
            ci.cbSize = Marshal.SizeOf(typeof(CURSORINFO));
            if (!GetCursorInfo(out ci)) return false;
            IntPtr ibeam = LoadCursor(IntPtr.Zero, 32513); // IDC_IBEAM
            return ci.hCursor == ibeam;
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

        # Exclude desktop icons, taskbar, Start Menu
        $wndClass = [WinMouse.Listener]::GetClassAtPoint($pt)
        $isSystemUI = ($wndClass -match '^(WorkerW|Progman|Shell_TrayWnd|Shell_SecondaryTrayWnd|Windows\.UI\.Core\.CoreWindow)$')

        # 1) Deliberate mouse drag selection:
        # User held down mouse for at least 150ms and dragged at least 28px horizontally
        # (or at least 45px total with hold time > 200ms for multiline text)
        $isDragSelection = $false
        if (-not $isSystemUI -and $holdTime -ge 150) {
            if ($dx -ge 28 -and $dx -ge ($dy * 0.4)) {
                $isDragSelection = $true
            } elseif ($dist -ge 45 -and $holdTime -ge 200) {
                $isDragSelection = $true
            }
        }

        # 2) Multi-click selection (double-click / triple-click on text):
        # Only counts if cursor is I-Beam (text cursor) or NOT an arrow cursor,
        # ensuring double-clicks on desktop/explorer icons, buttons, etc. are NEVER classified as text selections!
        $isMultiClickSelection = $false
        if ($dist -le 10 -and -not $isSystemUI) {
            $dt = $now - $lastClickTime
            $cdx = [Math]::Abs($pt.X - $lastClickX)
            $cdy = [Math]::Abs($pt.Y - $lastClickY)
            $cDist = [Math]::Sqrt($cdx * $cdx + $cdy * $cdy)
            if ($dt -lt 400 -and $cDist -lt 10) {
                $clickCount++
                $isArrow = [WinMouse.Listener]::IsArrowCursor()
                $isIBeam = [WinMouse.Listener]::IsIBeamCursor()
                if ($clickCount -ge 2 -and ($isIBeam -or -not $isArrow)) {
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
