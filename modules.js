"use strict";

const MTAU = Math.PI * 2;
const mid = id => document.getElementById(id);
const mmod = a => ((a % MTAU) + MTAU) % MTAU;
const mdeg = a => mmod(a) * 180 / Math.PI;
const mfmt = (v, n = 2) => Number.isFinite(v) ? v.toFixed(n) : "—";

function mechanismPage(kind) {
  const slider = kind === "sc";
  return `
  <main class="layout mechanism-page">
    <aside class="panel controls">
      <div class="panel-title"><span>01</span><div><h2>${slider ? "曲柄滑块" : "曲柄导杆"}输入</h2><p>长度单位：mm</p></div></div>
      <section class="control-section">
        <div class="length-grid">
          <label>曲柄 a · AB<input id="${kind}A" type="number" min="0.01" value="${slider ? 40 : 50}"></label>
          <label>${slider ? "连杆 b · BC" : "机架 d · AC"}<input id="${kind}${slider ? "B" : "D"}" type="number" min="0.01" value="100"></label>
          ${slider ? `<label>偏距 e<input id="scE" type="number" min="0" value="20"></label>` : ""}
          <label>比例尺 μ · m/mm<input id="${kind}Scale" type="number" min="0.0001" step="0.001" value="0.01"></label>
        </div>
        <label>原动件<select id="${kind}Driver"><option value="crank">曲柄 AB</option><option value="other">${slider ? "滑块 C" : "导杆"}（预留）</option></select></label>
        ${slider ? `<label>装配模式<select id="scAssembly"><option value="right">滑块在右侧</option><option value="left">滑块在左侧</option></select></label>` : ""}
        <div class="two-cols">
          <label>角速度 ω · rad/s<input id="${kind}Omega" type="number" min="0.01" step="0.1" value="1"></label>
          <label>转动方向<select id="${kind}Direction"><option value="1">逆时针</option><option value="-1">顺时针</option></select></label>
        </div>
      </section>
      <section class="control-section"><div class="button-grid"><button id="${kind}Judge" class="primary">判别并计算</button><button id="${kind}Start">开始</button><button id="${kind}Pause">暂停</button><button id="${kind}Reset">重置</button></div></section>
      <section class="control-section targets"><h3>运动到特征位置</h3>
        <button id="${kind}Limit1">${slider ? "滑块" : "导杆"}极限位置 1</button>
        <button id="${kind}Limit2">${slider ? "滑块" : "导杆"}极限位置 2</button>
        <button id="${kind}GammaMax"${slider ? "" : " disabled"}>最大传动角 / 最小压力角</button>
        <button id="${kind}GammaMin"${slider ? "" : " disabled"}>最小传动角 / 最大压力角</button>
      </section>
      <div id="${kind}Message" class="message info">点击“判别并计算”开始分析。</div>
    </aside>
    <section class="workspace">
      <div class="panel metrics"><div class="panel-title compact"><span>02</span><div><h2>判别与指标</h2><p id="${kind}Class">尚未计算</p></div></div>
        <div class="metric-grid">
          <article class="metric emphasis"><small>当前输入角</small><strong id="${kind}Angle">—</strong><span>φ</span></article>
          <article class="metric emphasis"><small>${slider ? "当前传动角" : "导杆角"}</small><strong id="${kind}${slider ? "Gamma" : "Psi"}">—</strong><span>${slider ? "γ" : "ψ"}</span></article>
          <article class="metric"><small>${slider ? "当前压力角" : "传动角"}</small><strong id="${kind}${slider ? "Alpha" : "Gamma"}">${slider ? "—" : "90.00°"}</strong><span>${slider ? "α" : "γ"}</span></article>
          <article class="metric"><small>${slider ? "滑块冲程 / 导程" : "压力角"}</small><strong id="${kind}${slider ? "Stroke" : "Alpha"}">${slider ? "—" : "0.00°"}</strong><span>${slider ? "H · mm" : "α"}</span></article>
          <article class="metric"><small>行程速比系数</small><strong id="${kind}K">—</strong><span>K</span></article>
          <article class="metric"><small>极位夹角</small><strong id="${kind}Theta">—</strong><span>θ</span></article>
          ${slider ? `<article class="metric"><small>传动角范围</small><strong id="scGammaRange">—</strong><span>γmin — γmax</span></article><article class="metric"><small>压力角范围</small><strong id="scAlphaRange">—</strong><span>αmin — αmax</span></article>` : ""}
        </div>
      </div>
      <div class="panel canvas-panel"><div class="canvas-head"><div><span class="section-number">03</span><h2>${slider ? "偏置曲柄滑块" : "曲柄导杆"}仿真</h2></div></div>
        <div class="canvas-wrap"><canvas id="${kind}Canvas"></canvas><div class="canvas-note">中键拖动视角 · 滚轮缩放</div></div>
      </div>
    </section>
  </main>`;
}

mid("page-slider").innerHTML = mechanismPage("sc");
mid("page-guide").innerHTML = mechanismPage("cg");
mid("page-instructions").innerHTML = `<main class="instructions-page"><div class="instructions-head"><span>04</span><div><h2>说明</h2><p>LIC/TasPalivia/woChovy</p></div></div><div class="instructions-grid"><article><h3>一、项目简介</h3><p>这是一个简单的VibeCoding项目，灵感来源于今天复习了一天的机械原理第八章连杆机构及其设计</p></article><article><h3>二、使用方法</h3><p>这里点点那里点点就行，只要你觉得有哪些题目做不明白，或者说想看看它到底运动了个啥，你就可以用这个程序实时观察机构的运动情况。使用时要注意，文件夹内四个文件要同时存放："index.html", "style.css", "main.js", "modules.js"。README.md的话无所谓</p></article><article><h3>三、机构判别规则</h3><p>四杆机构一共是两个判别规则，第一个是杆长条件，第二个是封闭条件，满足前者+后者或只满足后者就会进入对应的机架判断；。</p></article><article><h3>四、参数说明</h3><p>这里预留参数说明内容，后续手动编辑。</p></article><article><h3>五、注意事项</h3><p>这里预留注意事项内容，后续手动编辑。</p></article></div></main>`;

function makeView(canvas, draw) {
  const view = { zoom: 1, x: 0, y: 0, pan: null };
  canvas.addEventListener("wheel", e => { e.preventDefault(); view.zoom = Math.max(.2, Math.min(8, view.zoom * (e.deltaY < 0 ? 1 / 1.12 : 1.12))); draw(); }, { passive: false });
  canvas.addEventListener("mousedown", e => { if (e.button === 1) { e.preventDefault(); view.pan = { x: e.clientX - view.x, y: e.clientY - view.y }; canvas.classList.add("panning"); } });
  window.addEventListener("mousemove", e => { if (view.pan) { view.x = e.clientX - view.pan.x; view.y = e.clientY - view.pan.y; draw(); } });
  window.addEventListener("mouseup", e => { if (e.button === 1) { view.pan = null; canvas.classList.remove("panning"); } });
  canvas.addEventListener("auxclick", e => { if (e.button === 1) e.preventDefault(); });
  return view;
}
function fitCanvas(canvas, ctx) {
  const r = canvas.getBoundingClientRect(), d = devicePixelRatio || 1;
  if (r.width && r.height) { canvas.width = r.width * d; canvas.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
}
function line(ctx, p, q, color, width = 4, dash = []) { ctx.save(); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.lineCap = "round"; ctx.stroke(); ctx.restore(); }
function joint(ctx, p, name) { ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, MTAU); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#123b56"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = "#102a43"; ctx.font = "800 11px Segoe UI"; ctx.fillText(name, p.x + 10, p.y - 10); }
function arrow(ctx, p, angle, direction) { ctx.beginPath(); ctx.arc(p.x, p.y, 24, angle - .65, angle + .65, direction < 0); ctx.strokeStyle = "#ef8354"; ctx.lineWidth = 2; ctx.stroke(); }
function message(prefix, text, type = "info") { mid(prefix + "Message").textContent = text; mid(prefix + "Message").className = "message " + type; }
function directedRemaining(current, target, direction) { return mmod(direction * (target - current)); }

const sc = { angle: 0, running: false, target: null, last: 0, valid: false, scan: null, pose: null, direction: 1, omega: 1 };
const scCanvas = mid("scCanvas"), scCtx = scCanvas.getContext("2d"), scView = makeView(scCanvas, drawSC);
function solveSC(angle) {
  const a = +mid("scA").value, b = +mid("scB").value, e = +mid("scE").value;
  const B = { x: a * Math.cos(angle), y: e + a * Math.sin(angle) }, root = b * b - B.y * B.y;
  if (root < -1e-8) return null;
  const sign = mid("scAssembly").value === "right" ? 1 : -1, C = { x: B.x + sign * Math.sqrt(Math.max(0, root)), y: 0 };
  let gamma = Math.abs(Math.atan2(B.y, C.x - B.x)) * 180 / Math.PI; gamma = Math.min(gamma, 180 - gamma);
  return { A: { x: 0, y: e }, B, C, gamma };
}
function scanSC() {
  const samples = []; for (let i = 0; i < 2400; i++) { const angle = i * MTAU / 2400, pose = solveSC(angle); if (pose) samples.push({ angle, pose }); }
  if (!samples.length) return null;
  const min = samples.reduce((a, b) => b.pose.C.x < a.pose.C.x ? b : a), max = samples.reduce((a, b) => b.pose.C.x > a.pose.C.x ? b : a);
  const gmin = samples.reduce((a, b) => b.pose.gamma < a.pose.gamma ? b : a), gmax = samples.reduce((a, b) => b.pose.gamma > a.pose.gamma ? b : a);
  const d = mmod(max.angle - min.angle), slow = Math.max(d, MTAU - d), fast = Math.min(d, MTAU - d), K = slow / fast;
  return { samples, min, max, gmin, gmax, stroke: max.pose.C.x - min.pose.C.x, K, theta: 180 * (K - 1) / (K + 1) };
}
function judgeSC() {
  pauseSC(); const a = +mid("scA").value, b = +mid("scB").value, e = +mid("scE").value, scale = +mid("scScale").value, omega = +mid("scOmega").value;
  if ([a, b, omega, scale].some(v => !Number.isFinite(v) || v <= 0) || !Number.isFinite(e) || e < 0) return message("sc", "错误：请输入有效的正数参数，偏距可为 0。", "error");
  if (mid("scDriver").value !== "crank") return sc.valid = false, message("sc", "当前版本暂未实现滑块作为原动件的反解驱动。", "warn");
  if (b < a + e - 1e-9) return sc.valid = false, message("sc", "错误：不满足曲柄存在条件，曲柄不能整周转动。", "error");
  sc.angle = 0; sc.omega = omega; sc.direction = +mid("scDirection").value; sc.scan = scanSC(); sc.pose = solveSC(0); sc.valid = true;
  mid("scClass").textContent = "偏置曲柄滑块机构"; message("sc", Math.abs(b - a - e) < 1e-9 ? "机构处于曲柄存在条件临界状态，可能出现特殊位置。" : "满足曲柄存在条件，可以构成曲柄滑块机构。", Math.abs(b - a - e) < 1e-9 ? "warn" : "info"); updateSC(); drawSC();
}
function updateSC() {
  const s = sc.scan, p = sc.pose; if (!s || !p) return;
  mid("scAngle").textContent = mfmt(mdeg(sc.angle)) + "°"; mid("scGamma").textContent = mfmt(p.gamma) + "°"; mid("scAlpha").textContent = mfmt(90 - p.gamma) + "°";
  mid("scStroke").textContent = mfmt(s.stroke) + " mm"; mid("scK").textContent = mfmt(s.K, 3); mid("scTheta").textContent = mfmt(s.theta) + "°";
  mid("scGammaRange").textContent = `${mfmt(s.gmin.pose.gamma)}° — ${mfmt(s.gmax.pose.gamma)}°`; mid("scAlphaRange").textContent = `${mfmt(90 - s.gmax.pose.gamma)}° — ${mfmt(90 - s.gmin.pose.gamma)}°`;
}
function drawSC() {
  fitCanvas(scCanvas, scCtx); const w = scCanvas.clientWidth, h = scCanvas.clientHeight; scCtx.clearRect(0, 0, w, h); if (!sc.pose) return;
  const max = Math.max(+mid("scA").value, +mid("scB").value), px = Math.min(w, h) * .32 / max * (.01 / +mid("scScale").value) * scView.zoom;
  const T = p => ({ x: w / 2 + scView.x + p.x * px, y: h / 2 + scView.y - p.y * px }), p = sc.pose, A = T(p.A), B = T(p.B), C = T(p.C);
  line(scCtx, T({ x: -max * 2, y: 0 }), T({ x: max * 2, y: 0 }), "#9aaeb8", 2); line(scCtx, A, B, "#ef8354", 5); line(scCtx, B, C, "#123b56", 4);
  scCtx.strokeStyle = "#667985"; scCtx.strokeRect(C.x - 16, C.y - 11, 32, 22); line(scCtx, T({ x: 0, y: 0 }), A, "#8a6f9e", 1.5, [4, 4]);
  if (sc.scan) { [sc.scan.min, sc.scan.max].forEach((s, i) => line(scCtx, T({ x: s.pose.C.x, y: -12 / px }), T({ x: s.pose.C.x, y: 12 / px }), "#8a6f9e", 1.5, [5, 4])); }
  joint(scCtx, A, "A"); joint(scCtx, B, "B"); joint(scCtx, C, "C"); arrow(scCtx, A, sc.angle, sc.direction);
}
function pauseSC() { sc.running = false; }
function startSC() { if (!sc.valid) judgeSC(); if (!sc.valid) return; sc.running = true; sc.target = null; sc.last = performance.now(); requestAnimationFrame(tickSC); }
function targetSC(a) { if (!sc.valid) return; sc.running = true; sc.target = a; sc.last = performance.now(); requestAnimationFrame(tickSC); }
function tickSC(t) { if (!sc.running) return; const dt = Math.min(.04, (t - sc.last) / 1000 || 0); sc.last = t; let step = sc.direction * sc.omega * dt, reached = false; if (sc.target !== null) { const r = directedRemaining(sc.angle, sc.target, sc.direction); if (r <= Math.abs(step) + .002) { step = sc.direction * r; sc.target = null; reached = true; } } sc.angle = mmod(sc.angle + step); sc.pose = solveSC(sc.angle); updateSC(); drawSC(); if (reached) return pauseSC(); requestAnimationFrame(tickSC); }

const cg = { angle: 0, running: false, target: null, last: 0, valid: false, scan: null, pose: null, direction: 1, omega: 1, rotating: false };
const cgCanvas = mid("cgCanvas"), cgCtx = cgCanvas.getContext("2d"), cgView = makeView(cgCanvas, drawCG);
function solveCG(angle) { const a = +mid("cgA").value, d = +mid("cgD").value, A = { x: 0, y: 0 }, C = { x: d, y: 0 }, B = { x: a * Math.cos(angle), y: a * Math.sin(angle) }; return { A, B, C, psi: Math.atan2(B.y, B.x - C.x) }; }
function scanCG() { const samples = []; let last; for (let i = 0; i < 2400; i++) { const angle = i * MTAU / 2400, pose = solveCG(angle); let psi = pose.psi; if (last !== undefined) psi = last + Math.atan2(Math.sin(psi - last), Math.cos(psi - last)); last = psi; samples.push({ angle, pose, psi }); } const min = samples.reduce((a, b) => b.psi < a.psi ? b : a), max = samples.reduce((a, b) => b.psi > a.psi ? b : a); const d = mmod(max.angle - min.angle), slow = Math.max(d, MTAU - d), fast = Math.min(d, MTAU - d), K = slow / fast; return { samples, min, max, K, theta: 180 * (K - 1) / (K + 1) }; }
function judgeCG() {
  pauseCG(); const a = +mid("cgA").value, d = +mid("cgD").value, scale = +mid("cgScale").value, omega = +mid("cgOmega").value;
  if ([a, d, scale, omega].some(v => !Number.isFinite(v) || v <= 0)) return message("cg", "错误：请输入有效且大于 0 的参数。", "error");
  if (mid("cgDriver").value !== "crank") return cg.valid = false, message("cg", "当前版本暂未实现导杆作为原动件的反解驱动。", "warn");
  cg.rotating = a >= d; cg.angle = 0; cg.omega = omega; cg.direction = +mid("cgDirection").value; cg.pose = solveCG(0); cg.scan = scanCG(); cg.valid = true;
  mid("cgClass").textContent = a < d ? "摆动导杆机构" : "转动导杆机构"; mid("cgLimit1").disabled = cg.rotating; mid("cgLimit2").disabled = cg.rotating;
  message("cg", a === d ? "机构处于临界状态，导杆可达特殊位置。" : cg.rotating ? "导杆可整周转动，摇杆极位与 K 不适用。" : "判别完成：摆动导杆机构。", a === d ? "warn" : "info"); updateCG(); drawCG();
}
function updateCG() { if (!cg.pose) return; mid("cgAngle").textContent = mfmt(mdeg(cg.angle)) + "°"; mid("cgPsi").textContent = mfmt(cg.pose.psi * 180 / Math.PI) + "°"; mid("cgK").textContent = cg.rotating ? "不适用" : mfmt(cg.scan.K, 3); mid("cgTheta").textContent = cg.rotating ? "不适用" : mfmt(cg.scan.theta) + "°"; }
function drawCG() {
  fitCanvas(cgCanvas, cgCtx); const w = cgCanvas.clientWidth, h = cgCanvas.clientHeight; cgCtx.clearRect(0, 0, w, h); if (!cg.pose) return;
  const a = +mid("cgA").value, d = +mid("cgD").value, px = Math.min(w, h) * .45 / Math.max(a, d) * (.01 / +mid("cgScale").value) * cgView.zoom, T = p => ({ x: w / 2 + cgView.x + (p.x - d / 2) * px, y: h / 2 + cgView.y - p.y * px }), p = cg.pose, A = T(p.A), B = T(p.B), C = T(p.C);
  line(cgCtx, A, C, "#667985", 8); line(cgCtx, A, B, "#ef8354", 5); const len = Math.max(a, d) * 1.5, u = { x: Math.cos(p.psi), y: Math.sin(p.psi) }; line(cgCtx, C, T({ x: p.C.x + u.x * len, y: p.C.y + u.y * len }), "#123b56", 7);
  line(cgCtx, T({ x: p.C.x - u.x * len * .25, y: p.C.y - u.y * len * .25 }), T({ x: p.C.x + u.x * len, y: p.C.y + u.y * len }), "#9cc7cf", 2);
  joint(cgCtx, A, "A"); joint(cgCtx, B, "B"); joint(cgCtx, C, "C"); arrow(cgCtx, A, cg.angle, cg.direction);
}
function pauseCG() { cg.running = false; }
function startCG() { if (!cg.valid) judgeCG(); if (!cg.valid) return; cg.running = true; cg.target = null; cg.last = performance.now(); requestAnimationFrame(tickCG); }
function targetCG(a) { if (!cg.valid || cg.rotating) return; cg.running = true; cg.target = a; cg.last = performance.now(); requestAnimationFrame(tickCG); }
function tickCG(t) { if (!cg.running) return; const dt = Math.min(.04, (t - cg.last) / 1000 || 0); cg.last = t; let step = cg.direction * cg.omega * dt, reached = false; if (cg.target !== null) { const r = directedRemaining(cg.angle, cg.target, cg.direction); if (r <= Math.abs(step) + .002) { step = cg.direction * r; cg.target = null; reached = true; } } cg.angle = mmod(cg.angle + step); cg.pose = solveCG(cg.angle); updateCG(); drawCG(); if (reached) return pauseCG(); requestAnimationFrame(tickCG); }

function pauseAllAnimations() { if (typeof pause === "function") pause(); pauseSC(); pauseCG(); }
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  pauseAllAnimations(); document.querySelectorAll(".tab,.page").forEach(x => x.classList.remove("active")); tab.classList.add("active"); mid("page-" + tab.dataset.page).classList.add("active");
  if (tab.dataset.page === "slider") { fitCanvas(scCanvas, scCtx); drawSC(); } if (tab.dataset.page === "guide") { fitCanvas(cgCanvas, cgCtx); drawCG(); } if (tab.dataset.page === "fourbar") resizeCanvas();
}));

mid("scJudge").onclick = judgeSC; mid("scStart").onclick = startSC; mid("scPause").onclick = pauseSC; mid("scReset").onclick = () => { pauseSC(); sc.angle = 0; sc.pose = solveSC(0); updateSC(); drawSC(); };
mid("scLimit1").onclick = () => targetSC(sc.scan.min.angle); mid("scLimit2").onclick = () => targetSC(sc.scan.max.angle); mid("scGammaMax").onclick = () => targetSC(sc.scan.gmax.angle); mid("scGammaMin").onclick = () => targetSC(sc.scan.gmin.angle);
mid("cgJudge").onclick = judgeCG; mid("cgStart").onclick = startCG; mid("cgPause").onclick = pauseCG; mid("cgReset").onclick = () => { pauseCG(); cg.angle = 0; cg.pose = solveCG(0); updateCG(); drawCG(); };
mid("cgLimit1").onclick = () => targetCG(cg.scan.min.angle); mid("cgLimit2").onclick = () => targetCG(cg.scan.max.angle);
["scScale", "cgScale"].forEach(id => mid(id).addEventListener("input", id.startsWith("sc") ? drawSC : drawCG));
window.addEventListener("resize", () => { drawSC(); drawCG(); });
judgeSC(); judgeCG();
