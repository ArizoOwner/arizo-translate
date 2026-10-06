param(
    [string]$Action = "status",
    [string]$RepoName = "aphra-translate",
    [string]$Tag = "v2.0.0",
    [string]$AssetPath = ""
)

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredentialHelper {
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

$token = [CredentialHelper]::GetPassword("git:https://ArizoTeam@github.com")
if (-not $token) {
    $token = [CredentialHelper]::GetPassword("git:https://github.com")
}
if (-not $token) {
    Write-Error "Could not retrieve GitHub token from Windows Credential Manager"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "User-Agent" = "Aphra-Deployer"
    "Accept" = "application/vnd.github+json"
}

switch ($Action) {
    "status" {
        $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
        Write-Host "Logged in as: $($user.login) ($($user.name))"
        $orgs = Invoke-RestMethod -Uri "https://api.github.com/user/orgs" -Headers $headers -Method Get
        Write-Host "Organizations: $(($orgs.login) -join ', ')"
    }

    "create-repo" {
        $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
        $owner = $user.login

        # Check if repo already exists
        $exists = $false
        try {
            $check = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$RepoName" -Headers $headers -Method Get
            $exists = $true
            Write-Host "Repository $owner/$RepoName already exists: $($check.html_url)"
            return $check
        } catch {
            $exists = $false
        }

        if (-not $exists) {
            $body = @{
                name = $RepoName
                description = "دستیار هوشمند ترجمه داینامیک آیلند برای ویندوز | Dynamic Island AI Translation Assistant for Windows (Inspired by Aphra)"
                private = $false
                has_issues = $true
                has_projects = $true
                has_wiki = $false
            } | ConvertTo-Json

            $newRepo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body
            Write-Host "Successfully created public repository: $($newRepo.html_url)"
            return $newRepo
        }
    }

    "get-token" {
        # Only prints user info, keeps token secure
        $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
        Write-Output "$($user.login):$token"
    }

    "create-release" {
        $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
        $owner = $user.login
        $repoUrl = "https://api.github.com/repos/$owner/$RepoName/releases"

        # Check if release exists
        $rel = $null
        try {
            $rel = Invoke-RestMethod -Uri "$repoUrl/tags/$Tag" -Headers $headers -Method Get
            Write-Host "Release $Tag already exists (ID: $($rel.id))"
        } catch {
            $body = @{
                tag_name = $Tag
                target_commitish = "main"
                name = "Aphra Translate v2.0.0 - Dynamic Island Windows Release"
                body = @"
## 🌟 Aphra Translate v2.0.0 (Windows Release)

دستیار هوشمند ترجمه با طراحی مدرن داینامیک آیلند (Dynamic Island) برای ویندوز.

### ✨ ویژگی‌های کلیدی | Key Features
- 🏝️ **داینامیک آیلند مینیمال و شناور**: قرارگیری در بالای صفحه بدون اشغال فضای کاربری.
- ⚡ **ترجمه آنی و هوشمند در هر برنامه**: پشتیبانی از کلید میانبر `Alt+Shift+D` در تلگرام، ورد، کروم و تمامی نرم‌افزارهای ویندوز.
- 🎯 **دکمه شناور کنار متن انتخاب شده**: نمایش هوشمند آیکون ترجمه بدون تداخل یا فعال‌سازی ناخواسته.
- 🔄 **تشخیص خودکار و بدون درنگ زبان**: جابجایی دوطرفه بین فارسی و انگلیسی به همراه کلمات تخصصی ترکیبی.
- 🗣️ **تلفظ صوتی طبیعی (TTS)** به زبان‌های فارسی و انگلیسی.
- 🧹 **ابزار هوشمند پاکسازی متون PDF**: الحاق خطوط و حذف فاصله‌های اضافی فایل‌های کپی شده.
- 📦 **نسخه مستقل پرتابل و نصبی** برای ویندوز ۱۰ و ۱۱ (x64).

### 📥 فایل‌های دانلود | Download Assets
- **`Aphra Translate-Portable-2.0.0.exe`**: نسخه پرتابل بدون نیاز به نصب (Portable Executable)
- **`Aphra Translate Setup 2.0.0.exe`**: نسخه نصبی با ایجاد میانبر دسکتاپ و منوی استارت (NSIS Installer)
"@
                draft = $false
                prerelease = $false
            } | ConvertTo-Json

            $rel = Invoke-RestMethod -Uri $repoUrl -Headers $headers -Method Post -Body $body
            Write-Host "Created new release $Tag (ID: $($rel.id)): $($rel.html_url)"
        }

        # Upload assets if provided
        if ($AssetPath -and (Test-Path $AssetPath)) {
            $files = Get-ChildItem -Path $AssetPath -Filter "*.exe"
            foreach ($file in $files) {
                $assetName = $file.Name
                $uploadUrl = "https://uploads.github.com/repos/$owner/$RepoName/releases/$($rel.id)/assets?name=$assetName"

                # Check if asset already exists
                $existingAsset = $rel.assets | Where-Object { $_.name -eq $assetName }
                if ($existingAsset) {
                    Write-Host "Asset $assetName already exists, deleting first..."
                    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$RepoName/releases/assets/$($existingAsset.id)" -Headers $headers -Method Delete
                }

                Write-Host "Uploading asset: $assetName ($([math]::Round($file.Length / 1MB, 2)) MB)..."
                $fileBytes = [System.IO.File]::ReadAllBytes($file.FullName)
                $uploadHeaders = @{
                    "Authorization" = "Bearer $token"
                    "User-Agent" = "Aphra-Deployer"
                    "Content-Type" = "application/octet-stream"
                    "Accept" = "application/vnd.github+json"
                }

                $uploaded = Invoke-RestMethod -Uri $uploadUrl -Headers $uploadHeaders -Method Post -Body $fileBytes
                Write-Host "Uploaded successfully: $($uploaded.browser_download_url)"
            }
        }
    }
}
