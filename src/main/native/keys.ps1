$ErrorActionPreference = 'Stop'

# Long-lived helper: the Electron app talks to it over stdin/stdout so that a copy / paste keystroke
# costs ~10 ms instead of spawning a fresh script host (~150 ms) for every hotkey press.

Add-Type -Namespace Win -Name Keys -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
[DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);
[DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr ProcessId);
[DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
[DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
'@

$targetHwnd = [IntPtr]::Zero

function Restore-TargetForeground {
    if ($targetHwnd -ne [IntPtr]::Zero) {
        $curFg = [Win.Keys]::GetForegroundWindow()
        if ($curFg -ne $targetHwnd) {
            $curThread = [Win.Keys]::GetCurrentThreadId()
            $targetThread = [Win.Keys]::GetWindowThreadProcessId($targetHwnd, [IntPtr]::Zero)
            [Win.Keys]::AttachThreadInput($curThread, $targetThread, $true)
            [Win.Keys]::SetForegroundWindow($targetHwnd)
            [Win.Keys]::AttachThreadInput($curThread, $targetThread, $false)
            Start-Sleep -Milliseconds 40
        }
    }
}

$KEYUP = 2
$VK_CONTROL = 0x11
$VK_MENU = 0x12
$VK_SHIFT = 0x10

function Wait-ModifiersReleased {
    # When a global hotkey like Alt+Shift+D is pressed, the physical keys are held down
    # by the user's fingers for 150-350ms. We wait until they are released to prevent
    # collisions (e.g. Ctrl+Alt+Shift+C).
    for ($i = 0; $i -lt 24; $i++) {
        $held = $false
        foreach ($vk in @(0x10, 0x11, 0x12, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C)) {
            if (([Win.Keys]::GetAsyncKeyState($vk) -band 0x8000) -ne 0) {
                $held = $true
                break
            }
        }
        if (-not $held) { break }
        Start-Sleep -Milliseconds 25
    }
    Release-HeldModifiers
}

function Release-HeldModifiers {
    # The global hotkey (e.g. Ctrl+S or Alt+Shift+D) may still be physically held.
    # We synthesise "key up" for all modifiers and letter keys so they do not collide with our injected Ctrl combo.
    $keys = @(0x11, 0x12, 0x10, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C) + (0x41..0x5A)
    $hadAlt = $false
    foreach ($vk in $keys) {
        if ([Win.Keys]::GetAsyncKeyState($vk) -band 0x8000) {
            if ($vk -eq 0x12 -or $vk -eq 0xA4 -or $vk -eq 0xA5) {
                $hadAlt = $true
            }
            $scan = [byte][Win.Keys]::MapVirtualKey($vk, 0)
            [Win.Keys]::keybd_event([byte]$vk, $scan, $KEYUP, [UIntPtr]::Zero)
        }
    }
    # In Windows, releasing Alt without another key can activate the application menu bar,
    # stealing focus from the text input field. A quick Shift tap dismisses menu mode harmlessly.
    if ($hadAlt) {
        $scanShift = [byte][Win.Keys]::MapVirtualKey($VK_SHIFT, 0)
        [Win.Keys]::keybd_event($VK_SHIFT, $scanShift, 0, [UIntPtr]::Zero)
        [Win.Keys]::keybd_event($VK_SHIFT, $scanShift, $KEYUP, [UIntPtr]::Zero)
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
        'copy'           { Send-CtrlCombo 0x43; [Console]::Out.WriteLine('ok') }
        'paste'          { Send-CtrlCombo 0x56; [Console]::Out.WriteLine('ok') }
        'selectall'      { Send-CtrlCombo 0x41; [Console]::Out.WriteLine('ok') }
        'cut'            { Send-CtrlCombo 0x58; [Console]::Out.WriteLine('ok') }
        'get_seq'        { [Console]::Out.WriteLine([Win.Keys]::GetClipboardSequenceNumber()) }
        'save_target'    {
            $targetHwnd = [Win.Keys]::GetForegroundWindow()
            [Console]::Out.WriteLine('ok')
        }
        'restore_target' {
            Restore-TargetForeground
            [Console]::Out.WriteLine('ok')
        }
        'wait_modifiers' {
            Wait-ModifiersReleased
            [Console]::Out.WriteLine('ok')
        }
        'smart_copy' {
            $before = [Win.Keys]::GetClipboardSequenceNumber()
            Send-CtrlCombo 0x43
            $copied = $false
            for ($i = 0; $i -lt 16; $i++) {
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
        'exit'           { $done = $true }
        default          { [Console]::Out.WriteLine('unknown') }
    }
    [Console]::Out.Flush()
}
