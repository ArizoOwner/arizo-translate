const fs = require('fs');
const path = require('path');
const os = require('os');

function runPatch() {
  const extBase = path.join(os.homedir(), '.antigravity-ide', 'extensions');
  if (!fs.existsSync(extBase)) return;

  const claudeDirs = fs.readdirSync(extBase)
    .filter(d => d.startsWith('anthropic.claude-code'))
    .map(d => path.join(extBase, d));

  let patchedCount = 0;

  for (const dir of claudeDirs) {
    const extFile = path.join(dir, 'extension.js');
    const webFile = path.join(dir, 'webview', 'index.js');

    // -------------------------------------------------------------
    // 1. PATCH EXTENSION.JS
    // -------------------------------------------------------------
    if (fs.existsSync(extFile)) {
      let ext = fs.readFileSync(extFile, 'utf8');
      let changed = false;

      const syncCode = `
function deleteClaudeSession(sessionId) {
  try {
    if (!sessionId || typeof sessionId !== "string") return;
    const fs = require("fs"), path = require("path"), os = require("os");
    const pDir = path.join(os.homedir(), ".claude", "projects");
    if (fs.existsSync(pDir)) {
      for (const e of fs.readdirSync(pDir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          const f = path.join(pDir, e.name);
          const jf = path.join(f, sessionId + ".jsonl");
          if (fs.existsSync(jf)) try { fs.unlinkSync(jf); } catch (_) {}
          const sd = path.join(f, sessionId);
          if (fs.existsSync(sd)) try { fs.rmSync(sd, { recursive: true, force: true }); } catch (_) {}
        }
      }
    }
    const fh = path.join(os.homedir(), ".claude", "file-history", sessionId);
    if (fs.existsSync(fh)) try { fs.rmSync(fh, { recursive: true, force: true }); } catch (_) {}
    const se = path.join(os.homedir(), ".claude", "session-env", sessionId);
    if (fs.existsSync(se)) try { fs.rmSync(se, { recursive: true, force: true }); } catch (_) {}
  } catch (e) {
    console.error("deleteClaudeSession error:", e);
  }
}
function syncAllClaudeSessions() {
  try {
    const fs = require("fs"), path = require("path"), os = require("os");
    const pDir = path.join(os.homedir(), ".claude", "projects");
    if (!fs.existsSync(pDir)) return;
    const pFolders = fs.readdirSync(pDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => path.join(pDir, e.name));
    if (pFolders.length <= 1) return;

    const allFiles = new Map();
    const allDirs = new Map();
    const allMem = new Map();

    for (const folder of pFolders) {
      try {
        for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
          const ip = path.join(folder, item.name);
          if (item.isFile() && item.name.endsWith(".jsonl")) {
            const st = fs.statSync(ip);
            const ex = allFiles.get(item.name);
            if (!ex || st.mtimeMs > ex.mtimeMs || st.size > ex.size) {
              allFiles.set(item.name, { path: ip, mtimeMs: st.mtimeMs, size: st.size });
            }
          } else if (item.isDirectory()) {
            if (item.name === "memory") {
              try {
                for (const mi of fs.readdirSync(ip, { withFileTypes: true })) {
                  if (mi.isFile()) {
                    const mp = path.join(ip, mi.name);
                    const mst = fs.statSync(mp);
                    const mex = allMem.get(mi.name);
                    if (!mex || mst.mtimeMs > mex.mtimeMs) {
                      allMem.set(mi.name, { path: mp, mtimeMs: mst.mtimeMs });
                    }
                  }
                }
              } catch (_) {}
            } else if (!allDirs.has(item.name)) {
              allDirs.set(item.name, ip);
            }
          }
        }
      } catch (_) {}
    }

    for (const folder of pFolders) {
      try {
        for (const [fn, info] of allFiles) {
          const dp = path.join(folder, fn);
          let need = !fs.existsSync(dp);
          if (!need) {
            const st = fs.statSync(dp);
            if (info.size > st.size && info.mtimeMs > st.mtimeMs) need = true;
          }
          if (need) try { fs.copyFileSync(info.path, dp); } catch (_) {}
        }
        for (const [dn, sd] of allDirs) {
          const dp = path.join(folder, dn);
          if (!fs.existsSync(dp)) try { fs.cpSync(sd, dp, { recursive: true }); } catch (_) {}
        }
        if (allMem.size > 0) {
          const mDir = path.join(folder, "memory");
          if (!fs.existsSync(mDir)) try { fs.mkdirSync(mDir, { recursive: true }); } catch (_) {}
          for (const [mf, minf] of allMem) {
            const dmp = path.join(mDir, mf);
            if (!fs.existsSync(dmp)) try { fs.copyFileSync(minf.path, dmp); } catch (_) {}
          }
        }
      } catch (_) {}
    }
  } catch (e) {
    console.error("syncAllClaudeSessions error:", e);
  }
}
try { syncAllClaudeSessions(); setInterval(syncAllClaudeSessions, 15000); } catch (_) {}
`;

      if (!ext.includes('function deleteClaudeSession')) {
        ext = syncCode + ext;
        changed = true;
      }

      // Add delete_session case handler
      if (!ext.includes('case"delete_session":')) {
        const archCaseMatch = ext.match(/case\s*["']archive_session["']\s*:\s*return\s+(?:await\s+)?this\.archiveSession\(([^)]+)\);/);
        if (archCaseMatch) {
          ext = ext.replace(archCaseMatch[0], `${archCaseMatch[0]}case"delete_session":return await this.deleteSession(${archCaseMatch[1]});`);
          changed = true;
        }
      }

      // Add deleteSession method on session manager class
      if (!ext.includes('async deleteSession(')) {
        const archMethMatch = ext.match(/async\s+archiveSession\s*\(\s*([a-zA-Z0-9_$]+)\s*\)\s*\{\s*if\s*\(([a-zA-Z0-9_$]+)\(\1\)===null\)return\s*\{type:["']archive_session_response["']\};return\s+await\s+this\.settings\.archiveSession\(\1\),\{type:["']archive_session_response["']\}\}/);
        if (archMethMatch) {
          const param = archMethMatch[1];
          const checkFn = archMethMatch[2];
          const deleteMeth = `async deleteSession(${param}){if(${checkFn}(${param})===null)return{type:"delete_session_response",success:!1};deleteClaudeSession(${param});return await this.settings.archiveSession(${param}),{type:"delete_session_response",success:!0}}`;
          ext = ext.replace(archMethMatch[0], archMethMatch[0] + deleteMeth);
          changed = true;
        }
      }

      // Hook readSessionList
      if (!ext.includes('syncAllClaudeSessions();let $=')) {
        const readSessMatch = ext.match(/async\s+readSessionList\s*\(\s*\)\s*\{/);
        if (readSessMatch) {
          ext = ext.replace(readSessMatch[0], `${readSessMatch[0]}syncAllClaudeSessions();`);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(extFile, ext, 'utf8');
        patchedCount++;
      }
    }

    // -------------------------------------------------------------
    // 2. PATCH WEBVIEW/INDEX.JS
    // -------------------------------------------------------------
    if (fs.existsSync(webFile)) {
      let web = fs.readFileSync(webFile, 'utf8');
      let changed = false;

      // Detect JSX function (F or v1)
      let jsxFn = 'F';
      const d01Match = web.match(/function\s+d01\s*\([^)]*\)\s*\{\s*return\s+([a-zA-Z0-9_$]+)\s*\(\s*["']svg["']/);
      if (d01Match) jsxFn = d01Match[1];
      else if (web.includes(',F=Lp1')) jsxFn = 'F';
      else if (web.includes('v1("svg"')) jsxFn = 'v1';

      const trashIconDef = `
var TrashIcon = function({className, style, ...props}) {
  return ${jsxFn}("svg", Object.assign({
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    className: className || "",
    style: Object.assign({ width: "18px", height: "18px", display: "inline-block", verticalAlign: "middle" }, style),
    children: ${jsxFn}("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    })
  }, props));
};
`;

      if (!web.includes('var TrashIcon = function') && !web.includes('function TrashIcon(')) {
        if (web.includes('var K1=kp0,F=Lp1,R=Lp1;')) {
          web = web.replace('var K1=kp0,F=Lp1,R=Lp1;', 'var K1=kp0,F=Lp1,R=Lp1;' + trashIconDef);
          changed = true;
        } else {
          const d01Pos = web.indexOf('function d01(');
          if (d01Pos !== -1) {
            web = web.slice(0, d01Pos) + trashIconDef + web.slice(d01Pos);
            changed = true;
          }
        }
      }

      // Attach window.__claudeDeleteSession
      if (!web.includes('window.__claudeDeleteSession=')) {
        const instMatch = web.match(/V\s*=\s*new\s+[a-zA-Z0-9_$]+\(q,U\);/);
        if (instMatch) {
          const attachHook = `${instMatch[0]}window.__claudeDeleteSession=async function(sid){if(!sid)return;try{await G.sendRequest({type:"delete_session",sessionId:sid})}catch(_){}try{if(V&&V.sessions){V.sessions.value=V.sessions.value.filter(s=>s.sessionId?.value!==sid);if(V.activeSession?.value?.sessionId?.value===sid){V.createSession()}}}catch(_){}try{if(G.listSessions)G.listSessions()}catch(_){}};`;
          web = web.replace(instMatch[0], attachHook);
          changed = true;
        }
      }

      // Add trash icon to history list items
      if (!web.includes('title:"Delete session / حذف سشن"')) {
        const actMatch = web.match(/!z&&!g&&(\([^)]+\)|[a-zA-Z0-9_\|$]+)&&R\("span",\{className:([a-zA-Z0-9_$]+)\.sessionActions,children:\[/);
        if (actMatch) {
          const k5Var = actMatch[2];
          const orig = actMatch[0];
          const rep = `!z&&!g&&(${actMatch[1]}||J.sessionId.value)&&R("span",{className:${k5Var}.sessionActions,children:[J.sessionId.value&&${jsxFn}("span",{role:"button",tabIndex:0,className:${k5Var}.actionButton,onClick:(y)=>{y.stopPropagation();let title=(typeof SE==="function"?SE(J):typeof xE==="function"?xE(J):J.summary?.value)||"این چت";if(confirm("آیا می‌خواهید چت \\""+title+"\\" را حذف کنید؟\\nDelete this session?")){window.__claudeDeleteSession?.(J.sessionId.value)}},onKeyDown:(y)=>{if(y.key==="Enter"||y.key===" "){y.preventDefault(),y.stopPropagation();let title=(typeof SE==="function"?SE(J):typeof xE==="function"?xE(J):J.summary?.value)||"این چت";if(confirm("آیا می‌خواهید چت \\""+title+"\\" را حذف کنید؟\\nDelete this session?")){window.__claudeDeleteSession?.(J.sessionId.value)}}},title:"Delete session / حذف سشن",children:${jsxFn}(TrashIcon,{className:${k5Var}.actionIcon})}),`;
          web = web.replace(orig, rep);
          changed = true;
        }
      }

      // Add trash icon to top bar
      if (!web.includes('title:"Delete chat / حذف تاریخچه چت"')) {
        const newSessMatch = web.match(/(\$\{jsxFn\}|\$8|[a-zA-Z0-9_$]+)\(\{ariaLabel:["']New session["'][^}]+\}\)\s*\]\s*\}\s*\)/);
        // More robust: search around 'Session history'
        const shIdx = web.indexOf('ariaLabel:"Session history"');
        if (shIdx !== -1) {
          const nextBracket = web.indexOf(']})', shIdx);
          if (nextBracket !== -1) {
            const btnCallMatch = web.slice(shIdx - 30, shIdx).match(/([a-zA-Z0-9_$]+)\(\{ref:/);
            const btnCall = btnCallMatch ? btnCallMatch[1] : '$8';
            const topBarButton = `,\$.activeSession.value&&${jsxFn}(${btnCall},{ariaLabel:"Delete session",iconSize:20,title:"Delete chat / حذف تاریخچه چت",onClick:()=>{let sid=\$.activeSession.value?.sessionId?.value;if(!sid)return;let title=\$.activeSession.value?.summary?.value||"این چت";if(confirm("آیا از حذف چت \\""+title+"\\" اطمینان دارید؟\\nDelete this chat?")){window.__claudeDeleteSession?.(sid)}},children:${jsxFn}(TrashIcon,{})})`;
            web = web.slice(0, nextBracket) + topBarButton + web.slice(nextBracket);
            changed = true;
          }
        }
      }

      if (changed) {
        fs.writeFileSync(webFile, web, 'utf8');
        patchedCount++;
      }
    }
  }

  // Always perform session synchronization across all projects
  try {
    const pDir = path.join(os.homedir(), '.claude', 'projects');
    if (fs.existsSync(pDir)) {
      const pFolders = fs.readdirSync(pDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => path.join(pDir, e.name));
      if (pFolders.length > 1) {
        const allFiles = new Map();
        const allDirs = new Map();
        const allMem = new Map();

        for (const folder of pFolders) {
          for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
            const ip = path.join(folder, item.name);
            if (item.isFile() && item.name.endsWith('.jsonl')) {
              const st = fs.statSync(ip);
              const ex = allFiles.get(item.name);
              if (!ex || st.mtimeMs > ex.mtimeMs || st.size > ex.size) {
                allFiles.set(item.name, { path: ip, mtimeMs: st.mtimeMs, size: st.size });
              }
            } else if (item.isDirectory()) {
              if (item.name === 'memory') {
                for (const mi of fs.readdirSync(ip, { withFileTypes: true })) {
                  if (mi.isFile()) {
                    const mp = path.join(ip, mi.name);
                    const mst = fs.statSync(mp);
                    const mex = allMem.get(mi.name);
                    if (!mex || mst.mtimeMs > mex.mtimeMs) {
                      allMem.set(mi.name, { path: mp, mtimeMs: mst.mtimeMs });
                    }
                  }
                }
              } else if (!allDirs.has(item.name)) {
                allDirs.set(item.name, ip);
              }
            }
          }
        }

        for (const folder of pFolders) {
          for (const [fn, info] of allFiles) {
            const dp = path.join(folder, fn);
            let need = !fs.existsSync(dp);
            if (!need) {
              const st = fs.statSync(dp);
              if (info.size > st.size && info.mtimeMs > st.mtimeMs) need = true;
            }
            if (need) {
              try { fs.copyFileSync(info.path, dp); } catch (_) {}
            }
          }
          for (const [dn, sd] of allDirs) {
            const dp = path.join(folder, dn);
            if (!fs.existsSync(dp)) {
              try { fs.cpSync(sd, dp, { recursive: true }); } catch (_) {}
            }
          }
          if (allMem.size > 0) {
            const mDir = path.join(folder, 'memory');
            if (!fs.existsSync(mDir)) try { fs.mkdirSync(mDir, { recursive: true }); } catch (_) {}
            for (const [mf, minf] of allMem) {
              const dmp = path.join(mDir, mf);
              if (!fs.existsSync(dmp)) {
                try { fs.copyFileSync(minf.path, dmp); } catch (_) {}
              }
            }
          }
        }
      }
    }
  } catch (_) {}

  return patchedCount;
}

if (require.main === module) {
  const count = runPatch();
  console.log(`Claude Code patcher executed. Applied updates: ${count}`);
}

module.exports = { runPatch };
