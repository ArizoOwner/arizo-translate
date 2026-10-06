$ErrorActionPreference = 'Stop'

# Lightweight Win32 mouse monitor detecting right-click release on selected text
Add-Type -Namespace Win -Name MouseListener -MemberDefinition @'
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
'@

$rightDown = $false

[Console]::Out.WriteLine('ready')
[Console]::Out.Flush()

while ($true) {
    Start-Sleep -Milliseconds 40

    # 0x02 = VK_RBUTTON (Right Mouse Button)
    $rState = [Win.MouseListener]::GetAsyncKeyState(2)
    $isRDown = ($rState -band 0x8000) -ne 0

    if ($isRDown -and -not $rightDown) {
        $rightDown = $true
    } elseif (-not $isRDown -and $rightDown) {
        $rightDown = $false
        # Right mouse button was clicked and released!
        [Console]::Out.WriteLine('right_clicked')
        [Console]::Out.Flush()
    }
}
