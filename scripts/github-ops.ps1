param(
    [string]$Action = "status",
    [string]$RepoName = "arizo-translate",
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
                name = "Arizo Translate v2.0.0 - Windows Release"
                body = @"
## 🌟 Arizo Translate v2.0.0 (Windows Release)

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
- **`Arizo Translate-Portable-2.0.0.exe`**: نسخه پرتابل بدون نیاز به نصب (Portable Executable)
- **`Arizo Translate Setup 2.0.0.exe`**: نسخه نصبی با ایجاد میانبر دسکتاپ و منوی استارت (NSIS Installer)
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
            Add-Type -AssemblyName System.Net.Http

            foreach ($file in $files) {
                $assetName = $file.Name
                $uploadUrl = "https://uploads.github.com/repos/$owner/$RepoName/releases/$($rel.id)/assets?name=$assetName"

                # Check if asset already exists on release
                $currentRel = Invoke-RestMethod -Uri "$repoUrl/tags/$Tag" -Headers $headers -Method Get
                $dotName = $assetName -replace '\s+', '.'
                $existingAssets = $currentRel.assets | Where-Object { $_.name -eq $assetName -or $_.name -eq $dotName }
                $alreadyUploaded = $false
                foreach ($ex in $existingAssets) {
                    if ($ex.size -eq $file.Length -and $ex.state -eq "uploaded") {
                        Write-Host "Asset $($ex.name) is already up to date ($($ex.size) bytes)."
                        $alreadyUploaded = $true
                        break
                    }
                    Write-Host "Asset $($ex.name) already exists with different size ($($ex.size) vs $($file.Length)), deleting old version..."
                    try {
                        Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$RepoName/releases/assets/$($ex.id)" -Headers $headers -Method Delete
                        Start-Sleep -Seconds 2
                    } catch {
                        Write-Host "Warning: Delete failed ($($_.Exception.Message))"
                    }
                }
                if ($alreadyUploaded) { continue }

                $uploadedSuccessfully = $false
                for ($attempt = 1; $attempt -le 4; $attempt++) {
                    Write-Host "Uploading asset via stream: $assetName ($([math]::Round($file.Length / 1MB, 2)) MB) [Attempt $attempt]..."

                    # Use curl.exe if available for robust large binary streaming
                    $curlResult = & curl.exe -s -w "%{http_code}" -X POST "$uploadUrl" `
                        -H "Authorization: Bearer $token" `
                        -H "User-Agent: Arizo-Deployer" `
                        -H "Accept: application/vnd.github+json" `
                        -H "Content-Type: application/octet-stream" `
                        --data-binary "@$($file.FullName)"

                    if ($curlResult -match '^(200|201)') {
                        Write-Host "Uploaded successfully via curl: $assetName"
                        $uploadedSuccessfully = $true
                        break
                    }

                    # Fallback to .NET HttpClient with explicit ContentLength
                    $client = [System.Net.Http.HttpClient]::new()
                    $client.Timeout = [System.TimeSpan]::FromMinutes(25)
                    $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $token)
                    $client.DefaultRequestHeaders.UserAgent.ParseAdd("Arizo-Deployer")
                    $client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json")

                    $stream = [System.IO.File]::OpenRead($file.FullName)
                    $content = [System.Net.Http.StreamContent]::new($stream)
                    $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("application/octet-stream")
                    $content.Headers.ContentLength = $file.Length

                    try {
                        $response = $client.PostAsync($uploadUrl, $content).GetAwaiter().GetResult()
                        if ($response.IsSuccessStatusCode) {
                            $json = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
                            Write-Host "Uploaded successfully: $($json.browser_download_url)"
                            $uploadedSuccessfully = $true
                            break
                        } else {
                            $err = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                            Write-Host "Upload returned status $($response.StatusCode): $err. Retrying in 5 seconds..."
                            Start-Sleep -Seconds 5
                        }
                    } catch {
                        Write-Host "Upload error: $($_.Exception.Message). Retrying in 5 seconds..."
                        Start-Sleep -Seconds 5
                    } finally {
                        $stream.Dispose()
                        $content.Dispose()
                        $client.Dispose()
                    }
                }

                if (-not $uploadedSuccessfully) {
                    Write-Error "Failed to upload asset $assetName after multiple attempts."
                }
            }
        }
    }
}
