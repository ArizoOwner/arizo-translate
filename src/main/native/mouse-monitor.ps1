$ErrorActionPreference = 'Stop'

# High-precision Win32 mouse monitor detecting right-click ON selected text
Add-Type -Namespace Win -Name MouseListener -MemberDefinition @'
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
[DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
[StructLayout(LayoutKind.Sequential)]
public struct POINT { public int X; public int Y; }
'@

$leftDown = $false
$downX = 0
$downY = 0
$downTime = 0

$lastClickTime = 0
$lastClickX = 0
$lastClickY = 0
$clickCount = 0

$hasSelection = $false
$selectionTime = 0

$rightDown = $false

[Console]::Out.WriteLine('ready')
[Console]::Out.Flush()

$pt = New-Object Win.MouseListener+POINT

while ($true) {
    Start-Sleep -Milliseconds 25
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

    # 0x01 = VK_LBUTTON (Left Mouse Button)
    $lState = [Win.MouseListener]::GetAsyncKeyState(1)
    $isLDown = ($lState -band 0x8000) -ne 0

    [Win.MouseListener]::GetCursorPos([ref]$pt) | Out-Null

    if ($isLDown -and -not $leftDown) {
        $leftDown = $true
        $downX = $pt.X
        $downY = $pt.Y
        $downTime = $now
    } elseif (-not $isLDown -and $leftDown) {
        $leftDown = $false
        $dx = $pt.X - $downX
        $dy = $pt.Y - $downY
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)

        if ($dist > 10) {
            # Dragged with left mouse button -> user highlighted/selected text!
            $hasSelection = $true
            $selectionTime = $now
            $clickCount = 0
        } else {
            # Released close to press location: check for double / multi-click selection
            $dt = $now - $lastClickTime
            $cdx = $pt.X - $lastClickX
            $cdy = $pt.Y - $lastClickY
            $cDist = [Math]::Sqrt($cdx * $cdx + $cdy * $cdy)

            if ($dt < 420 -and $cDist < 8) {
                $clickCount++
                if ($clickCount >= 2) {
                    # Double click (word selection) or triple click (line selection)!
                    $hasSelection = $true
                    $selectionTime = $now
                }
            } else {
                # Single left click without drag -> cleared selection
                $clickCount = 1
                $hasSelection = $false
            }
            $lastClickTime = $now
            $lastClickX = $pt.X
            $lastClickY = $pt.Y
        }
    }

    # Check keyboard selection: Shift + Arrow keys (0x25..0x28) or Ctrl+A (0x41)
    $shiftState = [Win.MouseListener]::GetAsyncKeyState(0x10) # VK_SHIFT
    if (($shiftState -band 0x8000) -ne 0) {
        foreach ($arrow in 0x25, 0x26, 0x27, 0x28) {
            if (([Win.MouseListener]::GetAsyncKeyState($arrow) -band 0x8000) -ne 0) {
                $hasSelection = $true
                $selectionTime = $now
                break
            }
        }
    }

    # 0x02 = VK_RBUTTON (Right Mouse Button)
    $rState = [Win.MouseListener]::GetAsyncKeyState(2)
    $isRDown = ($rState -band 0x8000) -ne 0

    if ($isRDown -and -not $rightDown) {
        $rightDown = $true
    } elseif (-not $isRDown -and $rightDown) {
        $rightDown = $false
        # Right mouse button was clicked and released!
        if ($hasSelection -and ($now - $selectionTime < 25000)) {
            # User specifically selected text and right-clicked on it!
            [Console]::Out.WriteLine('selection_right_clicked')
            [Console]::Out.Flush()
            # Reset selection flag after right-click so subsequent random right clicks don't re-trigger
            $hasSelection = $false
        } else {
            # Normal right click on unselected space
            [Console]::Out.WriteLine('normal_right_click')
            [Console]::Out.Flush()
        }
    }
}
