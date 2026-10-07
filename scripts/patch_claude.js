const fs = require('fs');
const path = require('path');
const os = require('os');

const extBase = path.join(os.homedir(), '.antigravity-ide', 'extensions');
if (!fs.existsSync(extBase)) {
  console.error('Extensions directory not found:', extBase);
  process.exit(1);
}

const claudeDirs = fs.readdirSync(extBase)
  .filter(d => d.startsWith('anthropic.claude-code'))
  .map(d => path.join(extBase, d));

console.log('Found Claude Code extensions:', claudeDirs);

for (const dir of claudeDirs) {
  const extFile = path.join(dir, 'extension.js');
  const webFile = path.join(dir, 'webview', 'index.js');

  // --- 1. Patch extension.js ---
  if (fs.existsSync(extFile)) {
    let ext = fs.readFileSync(extFile, 'utf8');

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
`;

    if (!ext.includes('function deleteClaudeSession')) {
      ext = syncCode + ext;
    }

    if (!ext.includes('case"delete_session":')) {
      ext = ext.replace(
        'case"archive_session":return this.archiveSession($.request.sessionId);',
        'case"archive_session":return this.archiveSession($.request.sessionId);case"delete_session":return await this.deleteSession($.request.sessionId);'
      );
    }

    if (!ext.includes('async deleteSession(')) {
      ext = ext.replace(
        'async archiveSession($){if(K0($)===null)return{type:"archive_session_response"};return await this.settings.archiveSession($),{type:"archive_session_response"}}',
        'async archiveSession($){if(K0($)===null)return{type:"archive_session_response"};return await this.settings.archiveSession($),{type:"archive_session_response"}}async deleteSession($){if(K0($)===null)return{type:"delete_session_response",success:!1};deleteClaudeSession($);return await this.settings.archiveSession($),{type:"delete_session_response",success:!0}}'
      );
    }

    if (!ext.includes('syncAllClaudeSessions();let $=FZ1()')) {
      ext = ext.replace(
        'async readSessionList(){let $=FZ1(),J=await this.buildSessionList();',
        'async readSessionList(){syncAllClaudeSessions();let $=FZ1(),J=await this.buildSessionList();'
      );
    }

    if (!ext.includes('setInterval(syncAllClaudeSessions,15000)')) {
      ext = ext.replace(
        'function s75($){',
        'function s75($){syncAllClaudeSessions();setInterval(syncAllClaudeSessions,15000);'
      );
    }

    fs.writeFileSync(extFile, ext, 'utf8');
    console.log('Patched extension.js in', dir);
  }

  // --- 2. Patch webview/index.js ---
  if (fs.existsSync(webFile)) {
    let web = fs.readFileSync(webFile, 'utf8');

    const trashIconCode = `
var TrashIcon = function({className, style, ...props}) {
  return F("svg", Object.assign({
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    className: className || "",
    style: Object.assign({ width: "18px", height: "18px", display: "inline-block", verticalAlign: "middle" }, style),
    children: F("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    })
  }, props));
};
`;

    if (!web.includes('var TrashIcon = function')) {
      web = web.replace(
        'var K1=kp0,F=Lp1,R=Lp1;',
        'var K1=kp0,F=Lp1,R=Lp1;' + trashIconCode
      );
    }

    if (!web.includes('window.__claudeDeleteSession=')) {
      web = web.replace(
        'V=new c31(q,U);',
        'V=new c31(q,U);window.__claudeDeleteSession=async function(sid){if(!sid)return;try{await G.sendRequest({type:"delete_session",sessionId:sid})}catch(_){}try{if(V&&V.sessions){V.sessions.value=V.sessions.value.filter(s=>s.sessionId?.value!==sid);if(V.activeSession?.value?.sessionId?.value===sid){V.createSession()}}}catch(_){}try{if(G.listSessions)G.listSessions()}catch(_){}};'
      );
    }

    // Add trash icon to history list items
    if (!web.includes('title:"Delete session / حذف سشن"')) {
      web = web.replace(
        '!z&&!g&&(M||N||w)&&R("span",{className:K5.sessionActions,children:[',
        '!z&&!g&&(M||N||w||J.sessionId.value)&&R("span",{className:K5.sessionActions,children:[J.sessionId.value&&F("span",{role:"button",tabIndex:0,className:K5.actionButton,onClick:(y)=>{y.stopPropagation();let title=SE(J)||"این چت";if(confirm("آیا می‌خواهید چت \\""+title+"\\" را حذف کنید؟\\nDelete this session?")){window.__claudeDeleteSession?.(J.sessionId.value)}},onKeyDown:(y)=>{if(y.key==="Enter"||y.key===" "){y.preventDefault(),y.stopPropagation();let title=SE(J)||"این چت";if(confirm("آیا می‌خواهید چت \\""+title+"\\" را حذف کنید؟\\nDelete this session?")){window.__claudeDeleteSession?.(J.sessionId.value)}}},title:"Delete session / حذف سشن",children:F(TrashIcon,{className:K5.actionIcon})}),'
      );
    }

    // Add trash icon to top bar
    if (!web.includes('title:"Delete chat / حذف تاریخچه چت"')) {
      const topBarTarget = '!q&&R(K1,{children:[F($8,{ref:Y,ariaLabel:"Session history",iconSize:20,onClick:()=>G(!z),children:F(c01,{})}),F($8,{ariaLabel:"New session",iconSize:20,onClick:()=>{if(!J.startNewConversationTab())$.createSession()},children:F(LF0,{})})]})';
      const topBarReplacement = '!q&&R(K1,{children:[F($8,{ref:Y,ariaLabel:"Session history",iconSize:20,onClick:()=>G(!z),children:F(c01,{})}),F($8,{ariaLabel:"New session",iconSize:20,onClick:()=>{if(!J.startNewConversationTab())$.createSession()},children:F(LF0,{})}),$.activeSession.value&&F($8,{ariaLabel:"Delete session",iconSize:20,title:"Delete chat / حذف تاریخچه چت",onClick:()=>{let sid=$.activeSession.value?.sessionId?.value;if(!sid)return;let title=$.activeSession.value?.summary?.value||"این چت";if(confirm("آیا از حذف چت \\""+title+"\\" اطمینان دارید؟\\nDelete this chat?")){window.__claudeDeleteSession?.(sid)}},children:F(TrashIcon,{})})]})';
      web = web.replace(topBarTarget, topBarReplacement);
    }

    fs.writeFileSync(webFile, web, 'utf8');
    console.log('Patched webview/index.js in', dir);
  }
}

console.log('All patches completed successfully!');
