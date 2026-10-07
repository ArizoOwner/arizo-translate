$ErrorActionPreference = 'Stop'

# Long-lived helper: the Electron app talks to it over stdin/stdout so that a copy / paste keystroke
# costs ~10 ms instead of spawning a fresh script host (~150 ms) for every hotkey press.

Add-Type -Namespace Win -Name Keys -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
[DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);
[DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();
'@

$KEYUP = 2
$VK_CONTROL = 0x11

function Release-HeldModifiers {
    # The global hotkey (e.g. Ctrl+S or Alt+Shift+D) may still be physically held.
    # We synthesise "key up" for all modifiers and letter keys so they do not collide with our injected Ctrl combo.
    $keys = @(0x11, 0x12, 0x10, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C) + (0x41..0x5A)
    foreach ($vk in $keys) {
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
        'copy'       { Send-CtrlCombo 0x43; [Console]::Out.WriteLine('ok') }
        'paste'      { Send-CtrlCombo 0x56; [Console]::Out.WriteLine('ok') }
        'selectall'  { Send-CtrlCombo 0x41; [Console]::Out.WriteLine('ok') }
        'cut'        { Send-CtrlCombo 0x58; [Console]::Out.WriteLine('ok') }
        'get_seq'    { [Console]::Out.WriteLine([Win.Keys]::GetClipboardSequenceNumber()) }
        'smart_copy' {
            $before = [Win.Keys]::GetClipboardSequenceNumber()
            Send-CtrlCombo 0x43
            $copied = $false
            for ($i = 0; $i -lt 14; $i++) {
                Start-Sleep -Milliseconds 25
                if ([Win.Keys]::GetClipboardSequenceNumber() -ne $before) {
                    $copied = $true
                    break
                }
            }
            if ($copied) {
                [Console]::Out.WriteLine('copied')
            } else {
                [Console]::Out.WriteLine('no_change')
            }
        }
        'exit'       { $done = $true }
        default      { [Console]::Out.WriteLine('unknown') }
    }
    [Console]::Out.Flush()
}
