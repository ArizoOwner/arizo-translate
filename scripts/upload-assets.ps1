$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredHelperUpload {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credentialPtr);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }
    public static string GetPassword(string target) {
        IntPtr ptr;
        if (CredRead(target, 1, 0, out ptr)) {
            var cred = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
            CredFree(ptr);
            if (bytes.Length >= 2 && bytes[1] == 0) return Encoding.Unicode.GetString(bytes);
            return Encoding.UTF8.GetString(bytes);
        }
        return null;
    }
}
"@

$token = [CredHelperUpload]::GetPassword("git:https://ArizoTeam@github.com")

$releaseId = "404830086"
$items = @(
    @{ local = "dist\Arizo Translate Setup 2.0.0.exe"; remote = "Arizo.Translate.Setup.2.0.0.exe" },
    @{ local = "dist\Arizo Translate-Portable-2.0.0.exe"; remote = "Arizo.Translate-Portable-2.0.0.exe" }
)

foreach ($item in $items) {
    $fullPath = Resolve-Path $item.local
    $fileBytes = (Get-Item $fullPath).Length
    $remoteName = [Uri]::EscapeDataString($item.remote)

    # First delete if already exists on release
    $rel = (& curl.exe --resolve api.github.com:443:140.82.121.6 -s -H "Authorization: Bearer $token" "https://api.github.com/repos/ArizoOwner/arizo-translate/releases/$releaseId") | ConvertFrom-Json
    foreach ($a in $rel.assets) {
        if ($a.name -eq $item.remote) {
            Write-Host "Deleting existing asset $($a.name) ($($a.id))..."
            & curl.exe -s -X DELETE -H "Authorization: Bearer $token" "https://api.github.com/repos/ArizoOwner/arizo-translate/releases/assets/$($a.id)"
            Start-Sleep -Seconds 2
        }
    }

    $uploadUrl = "https://uploads.github.com/repos/ArizoOwner/arizo-translate/releases/$releaseId/assets?name=$remoteName"
    Write-Host "Uploading $($item.remote) ($([math]::round($fileBytes / 1MB, 2)) MB)..."

    $uploaded = $false
    for ($attempt = 1; $attempt -le 4; $attempt++) {
        Write-Host "Attempt $attempt..."
        & curl.exe --resolve uploads.github.com:443:140.82.121.14 `
            --http1.1 `
            --connect-timeout 60 `
            -H "Expect:" `
            -H "Authorization: Bearer $token" `
            -H "Content-Type: application/octet-stream" `
            -H "Accept: application/vnd.github+json" `
            --data-binary "@$fullPath" `
            $uploadUrl

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully uploaded $($item.remote)!"
            $uploaded = $true
            break
        } else {
            Write-Host "Upload failed with exit code $LASTEXITCODE. Retrying in 5 seconds..."
            Start-Sleep -Seconds 5
        }
    }

    if (-not $uploaded) {
        Write-Error "Failed to upload $($item.remote) after 4 attempts."
    }
}
