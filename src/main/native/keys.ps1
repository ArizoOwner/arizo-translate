$ErrorActionPreference = 'Stop'

# Long-lived helper: the Electron app talks to it over stdin/stdout so that a copy / paste keystroke
# costs ~10 ms instead of spawning a fresh script host (~150 ms) for every hotkey press.

Add-Type -Namespace Win -Name Keys -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
[DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);
'@

$KEYUP = 2
$VK_CONTROL = 0x11

function Release-HeldModifiers {
    # The global hotkey (e.g. Alt+Shift+D) may still be physically held. Left alone, Ctrl+C would reach the
    # target application as Ctrl+Alt+Shift+C, so we synthesise "key up" for Alt / Shift / Win first.
    foreach ($vk in 0x12, 0x10, 0xA4, 0xA5, 0xA0, 0xA1, 0x5B, 0x5C) {
        if ([Win.Keys]::GetAsyncKeyState($vk) -band 0x8000) {
            $scan = [byte][Win.Keys]::MapVirtualKey($vk, 0)
            [Win.Keys]::keybd_event([byte]$vk, $scan, $KEYUP, [UIntPtr]::Zero)
        }
    }
}

function Send-CtrlCombo([byte]$key) {
    Release-HeldModifiers
    $scanCtrl = [byte][Win.Keys]::MapVirtualKey($VK_CONTROL, 0)
    $scanKey = [byte][Win.Keys]::MapVirtualKey($key, 0)
    [Win.Keys]::keybd_event($VK_CONTROL, $scanCtrl, 0, [UIntPtr]::Zero)
    [Win.Keys]::keybd_event($key, $scanKey, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 30
    [Win.Keys]::keybd_event($key, $scanKey, $KEYUP, [UIntPtr]::Zero)
    [Win.Keys]::keybd_event($VK_CONTROL, $scanCtrl, $KEYUP, [UIntPtr]::Zero)
}

[Console]::Out.WriteLine('ready')
[Console]::Out.Flush()

$done = $false
while (-not $done) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    switch ($line.Trim()) {
        'copy'      { Send-CtrlCombo 0x43; [Console]::Out.WriteLine('ok') }
        'paste'     { Send-CtrlCombo 0x56; [Console]::Out.WriteLine('ok') }
        'selectall' { Send-CtrlCombo 0x41; [Console]::Out.WriteLine('ok') }
        'cut'       { Send-CtrlCombo 0x58; [Console]::Out.WriteLine('ok') }
        'exit'      { $done = $true }
        default { [Console]::Out.WriteLine('unknown') }
    }
    [Console]::Out.Flush()
}
