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

# 1. Delete old Aphra assets if still present
$oldAssetIds = @(615795644, 615799727)
foreach ($id in $oldAssetIds) {
    try {
        & curl.exe -s -X DELETE -H "Authorization: Bearer $token" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/ArizoOwner/arizo-translate/releases/assets/$id"
        Write-Host "Cleaned old asset $id"
    } catch {
        Write-Host "Asset $id already removed or not found"
    }
}

# 2. Upload new Arizo Translate assets using curl streaming
$items = @(
    @{ local = "dist\Arizo Translate Setup 2.0.0.exe"; remote = "Arizo.Translate.Setup.2.0.0.exe" },
    @{ local = "dist\Arizo Translate-Portable-2.0.0.exe"; remote = "Arizo.Translate-Portable-2.0.0.exe" }
)

foreach ($item in $items) {
    $fullPath = Resolve-Path $item.local
    $remoteName = [Uri]::EscapeDataString($item.remote)
    $uploadUrl = "https://uploads.github.com/repos/ArizoOwner/arizo-translate/releases/404830086/assets?name=$remoteName"

    Write-Host "Uploading $($item.remote)..."
    & curl.exe --retry 3 --retry-delay 3 -f -s -S -X POST `
        -H "Authorization: Bearer $token" `
        -H "Content-Type: application/octet-stream" `
        -H "Accept: application/vnd.github+json" `
        --data-binary "@$fullPath" `
        $uploadUrl

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully uploaded $($item.remote)!"
    } else {
        Write-Host "Warning: curl upload returned exit code $LASTEXITCODE for $($item.remote)"
    }
}
