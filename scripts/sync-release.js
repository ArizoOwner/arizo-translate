const fs = require('fs');
const path = require('path');

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN not provided');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Arizo-Translate-Deployer',
  'X-GitHub-Api-Version': '2022-11-28'
};

async function main() {
  const repo = 'ArizoOwner/arizo-translate';
  console.log(`Checking releases for ${repo}...`);

  const listRes = await fetch(`https://api.github.com/repos/${repo}/releases`, { headers });
  if (!listRes.ok) {
    throw new Error(`Failed to list releases: ${listRes.status} ${await listRes.text()}`);
  }

  const releases = await listRes.json();
  console.log(`Found ${releases.length} releases.`);

  let targetRelease = releases[0];
  if (!targetRelease) {
    console.log('No release found. Creating v2.0.0 release...');
    const createRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: 'v2.0.0',
        name: 'Arizo Translate v2.0.0 - Windows Release',
        draft: false,
        prerelease: false
      })
    });
    targetRelease = await createRes.json();
  }

  console.log(`Target Release: ID ${targetRelease.id}, Tag: ${targetRelease.tag_name}, Name: ${targetRelease.name}`);

  // 1. Update Release title and body with pristine UTF-8 bilingual notes
  const releaseBody = `# 🏝️ Arizo Translate v2.0.0 (Windows Release)

> دستیار هوشمند ترجمه داینامیک آیلند برای ویندوز
> **Dynamic Island AI Translation Assistant for Windows 10 & 11**

---

## 🇮🇷 راهنمای فارسی (Persian)

دستیار هوشمند **Arizo Translate** با الهام از طراحی مدرن Dynamic Island، ترجمه دوطرفه انگلیسی و فارسی را بدون نیاز به جابجایی بین پنجره‌ها و برنامه‌ها در اختیار شما قرار می‌دهد.

### ✨ ویژگی‌ها و قابلیت‌های کلیدی:
- 🏝️ **داینامیک آیلند معلق و مینیمال:** پنجره مدرن و شناور در بالای صفحه با پس‌زمینه تیره مات و فیزیک حرکتی نرم.
- ⚡ **ترجمه درجا با کلید میانبر (\`Alt + Shift + D\`):** در تلگرام، دیسکورد، ورد و مرورگرها مستقیماً متن تایپ‌شده را به زبان مقصد ترجمه و جایگزین می‌کند.
- 🎯 **دکمه هوشمند شناور با کلیک راست:** با انتخاب متن و کلیک راست، دکمه شیک ترجمه در کنار نشانگر موس ظاهر شده و با یک کلیک متن را ترجمه می‌کند. (بدون انتخاب متن مزاحمتی ایجاد نمی‌کند).
- 🔄 **تشخیص هوشمند و خودکار زبان (FA ⇄ EN):** تفکیک دقیق جملات فارسی، انگلیسی و متون تخصصی ترکیبی برنامه‌نویسی.
- 🗣️ **تلفظ صوتی طبیعی (TTS):** پخش صوتی برای عبارات انگلیسی و فارسی.
- 🧹 **ابزار پاکسازی خطوط PDF:** الحاق خودکار خطوط شکسته مقالات و فایل‌های کپی‌شده.
- 🤖 **کاراکتر تعاملی موچی:** انیمیشن زنده و واکنش‌گرا به جهت نشانگر موس.

---

## 🇬🇧 English Guide

**Arizo Translate** is an ultra-fast, native Dynamic Island translation assistant designed for Windows 10 & 11.

### 🌟 Key Highlights:
- 🏝️ **Floating Dynamic Island:** Stays accessible at the top of your screen with smooth physics and solid dark finish.
- ⚡ **Instant In-Place Translation (\`Alt + Shift + D\`):** Type in Telegram, Word, or web inputs, press the hotkey, and watch your text instantly translate right inside the field.
- 🎯 **Context-Aware Floating Bubble:** Appears near cursor only when text is actively selected, with zero clipboard pollution.
- 🔄 **Smart Bidirectional Detection:** Heuristically detects Persian, English, and mixed technical sentences.
- 🗣️ **Natural Bilingual TTS:** Built-in speech synthesis for English and Persian.
- 🧹 **Smart PDF De-hyphenator:** Cleans and joins broken PDF paragraph lines.

---

### 📥 دانلود فایل‌های آماده | Download Assets
- 🚀 **\`Arizo.Translate-Portable-2.0.0.exe\`**: نسخه پرتابل بدون نیاز به نصب (Portable Executable)
- 📦 **\`Arizo.Translate.Setup.2.0.0.exe\`**: فایل نصبی همراه با میانبر دسکتاپ و استارت منو (Windows Installer)
`;

  const patchRes = await fetch(`https://api.github.com/repos/${repo}/releases/${targetRelease.id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Arizo Translate v2.0.0 - Windows Release',
      body: releaseBody
    })
  });

  if (!patchRes.ok) {
    throw new Error(`Failed to update release: ${patchRes.status} ${await patchRes.text()}`);
  }
  console.log('✅ Successfully updated release title and Persian UTF-8 text!');

  // 2. Upload assets from dist
  const distDir = path.join(__dirname, '..', 'dist');
  const filesToUpload = [
    { local: 'Arizo Translate Setup 2.0.0.exe', name: 'Arizo.Translate.Setup.2.0.0.exe' },
    { local: 'Arizo Translate-Portable-2.0.0.exe', name: 'Arizo.Translate-Portable-2.0.0.exe' }
  ];

  for (const item of filesToUpload) {
    const filePath = path.join(distDir, item.local);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found on disk: ${filePath}`);
      continue;
    }

    const stat = fs.statSync(filePath);
    console.log(`\nChecking asset: ${item.name} (${(stat.size / 1024 / 1024).toFixed(1)} MB)...`);

    // Check if asset already exists in release
    const existing = (targetRelease.assets || []).find((a) => a.name === item.name);
    if (existing) {
      if (existing.size === stat.size) {
        console.log(`Asset ${item.name} already uploaded with matching size. Skipping.`);
        continue;
      } else {
        console.log(`Deleting old asset ${existing.id}...`);
        await fetch(`https://api.github.com/repos/${repo}/releases/assets/${existing.id}`, {
          method: 'DELETE',
          headers
        });
      }
    }

    console.log(`Uploading ${item.name}...`);
    const fileBuffer = fs.readFileSync(filePath);
    const uploadUrl = `https://uploads.github.com/repos/${repo}/releases/${targetRelease.id}/assets?name=${encodeURIComponent(item.name)}`;

    const upRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(stat.size)
      },
      body: fileBuffer
    });

    if (!upRes.ok) {
      console.error(`Failed to upload ${item.name}: ${upRes.status} ${await upRes.text()}`);
    } else {
      console.log(`✅ Uploaded ${item.name} successfully!`);
    }
  }

  console.log('\nAll done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
