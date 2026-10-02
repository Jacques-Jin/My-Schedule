// Splash text editor — a tiny zero-dependency local tool (runs on Deno).
// Launch via set-splash-text.bat (or: deno run -A scripts/splash-text-editor.mjs).
// Serves a small form on http://127.0.0.1:5299/ that rewrites
// public/splash-text.json, which the splash screen fetches at runtime.
// Env overrides (used by the packaged local edition):
//   SPLASH_EDITOR_PORT, SPLASH_TEXT_CONFIG

const PORT = Number(Deno.env.get("SPLASH_EDITOR_PORT") || 5299);
const CONFIG_URL = Deno.env.get("SPLASH_TEXT_CONFIG")
  ? Deno.env.get("SPLASH_TEXT_CONFIG")
  : new URL("../public/splash-text.json", import.meta.url);
const DEFAULTS = { title: "我的日程", subtitle: "My Schedule" };

async function readConfig() {
  try {
    const raw = await Deno.readTextFile(CONFIG_URL);
    const parsed = JSON.parse(raw);
    return {
      title: typeof parsed.title === "string" ? parsed.title : DEFAULTS.title,
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle : DEFAULTS.subtitle,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

async function writeConfig(cfg) {
  await Deno.writeTextFile(CONFIG_URL, JSON.stringify(cfg, null, 2) + "\n");
}

const PAGE = (cfg) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>开屏文字编辑器</title>
<style>
  body { font-family: -apple-system, "Segoe UI", "Noto Sans SC", sans-serif; background: #10101c; color: #f5f5f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #1a1a28; border: 1px solid #2c2c3e; border-radius: 16px; padding: 28px 32px; width: min(420px, 90vw); box-shadow: 0 12px 40px rgba(0,0,0,.4); }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.hint { color: #9a9ab0; font-size: 12px; margin: 0 0 20px; }
  label { display: block; font-size: 13px; color: #b4b4c4; margin: 14px 0 6px; }
  input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; border: 1px solid #34344a; background: #14141f; color: #f5f5f7; font-size: 15px; }
  .row { display: flex; gap: 10px; margin-top: 22px; }
  button { flex: 1; padding: 11px 0; border-radius: 10px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
  #save { background: #6c7cf5; color: #fff; }
  #reset { background: #2a2a3c; color: #d0d0e0; }
  #msg { margin-top: 14px; font-size: 13px; min-height: 18px; color: #7fd6a0; }
</style>
</head>
<body>
  <div class="card">
    <h1>开屏文字编辑器</h1>
    <p class="hint">修改开屏动画的显示文字，保存后刷新页面即生效（开发版 / 本地独立版）。</p>
    <label for="title">主标题</label>
    <input id="title" value="${cfg.title.replace(/"/g, "&quot;")}" />
    <label for="subtitle">副标题</label>
    <input id="subtitle" value="${cfg.subtitle.replace(/"/g, "&quot;")}" />
    <div class="row">
      <button id="save">保存</button>
      <button id="reset">重置为默认</button>
    </div>
    <div id="msg"></div>
  </div>
<script>
  const msg = document.getElementById('msg');
  async function post(path, body) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    msg.textContent = j.ok ? '已保存：' + j.title + ' / ' + j.subtitle : ('失败：' + (j.error || 'unknown'));
    if (j.ok) { document.getElementById('title').value = j.title; document.getElementById('subtitle').value = j.subtitle; }
  }
  document.getElementById('save').onclick = () => post('/save', { title: document.getElementById('title').value, subtitle: document.getElementById('subtitle').value });
  document.getElementById('reset').onclick = () => post('/reset', {});
</script>
</body>
</html>`;

Deno.serve({ port: PORT, hostname: "127.0.0.1" }, async (req) => {
  const url = new URL(req.url);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });

  if (req.method === "GET" && url.pathname === "/") {
    const cfg = await readConfig();
    return new Response(PAGE(cfg), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (req.method === "POST" && (url.pathname === "/save" || url.pathname === "/reset")) {
    try {
      let cfg;
      if (url.pathname === "/reset") {
        cfg = { ...DEFAULTS };
      } else {
        const body = JSON.parse((await req.text()) || "{}");
        cfg = {
          title: String(body.title ?? DEFAULTS.title).slice(0, 40),
          subtitle: String(body.subtitle ?? DEFAULTS.subtitle).slice(0, 60),
        };
      }
      await writeConfig(cfg);
      return json({ ok: true, ...cfg });
    } catch (e) {
      return json({ ok: false, error: String((e && e.message) || e) }, 400);
    }
  }
  return new Response("not found", { status: 404 });
});

console.log(`Splash text editor running at http://127.0.0.1:${PORT}/`);
if (Deno.build.os === "windows") {
  new Deno.Command("cmd", { args: ["/c", "start", "", `http://127.0.0.1:${PORT}/`] }).spawn();
}
