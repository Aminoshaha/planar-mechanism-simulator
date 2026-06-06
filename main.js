"use strict";

const NAMES = ["AB", "BC", "CD", "AD"];
const VERTICES = ["A", "B", "C", "D"];
const TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

const state = {
  lengths: [40, 100, 80, 110],
  ground: 3,
  input: 0,
  angle: 0,
  direction: 1,
  omega: 1,
  assembly: "open",
  pose: null,
  previousPose: null,
  scan: null,
  classification: "",
  running: false,
  target: null,
  lastTime: 0,
  trace: [],
  viewZoom: 1,
  viewOffset: { x: 0, y: 0 },
  panning: false,
  panStart: null,
  valid: false
};

function mod(a, n = TAU) { return ((a % n) + n) % n; }
function radToDeg(a) { return mod(a) * 180 / Math.PI; }
function angleDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function pointOn(p, length, angle) { return { x: p.x + length * Math.cos(angle), y: p.y + length * Math.sin(angle) }; }
function edgeVertices(i) { return [i, (i + 1) % 4]; }
function sharedVertex(e1, e2) {
  const a = edgeVertices(e1), b = edgeVertices(e2);
  return a.find(v => b.includes(v));
}
function otherVertex(edge, vertex) { const e = edgeVertices(edge); return e[0] === vertex ? e[1] : e[0]; }

function validateLengths(lengths) {
  if (lengths.some(v => !Number.isFinite(v))) return "错误：杆长输入不能为空。";
  if (lengths.some(v => v <= 0)) return "错误：所有杆长必须大于 0。";
  return "";
}
function checkClosure(lengths) {
  const longest = Math.max(...lengths);
  return longest < lengths.reduce((a, b) => a + b, 0) - longest;
}
function checkGrashof(lengths) {
  const sorted = [...lengths].sort((a, b) => a - b);
  const delta = sorted[0] + sorted[3] - sorted[1] - sorted[2];
  return { satisfied: delta <= 1e-9, critical: Math.abs(delta) <= 1e-9 };
}
function classifyMechanism(lengths, groundIndex) {
  const g = checkGrashof(lengths);
  if (!g.satisfied) return "双摇杆机构（不满足格拉霍夫杆长条件）";
  const min = Math.min(...lengths);
  const shortest = lengths.map((x, i) => Math.abs(x - min) < 1e-9 ? i : -1).filter(i => i >= 0);
  if (shortest.includes(groundIndex)) return "双曲柄机构";
  if (shortest.some(i => ((i - groundIndex + 4) % 4) === 2)) return "双摇杆机构";
  return "曲柄摇杆机构";
}

// 两圆交点：用于地杆与原动件相邻时的稳定解析求解。
function circleIntersections(c1, r1, c2, r2) {
  const d = distance(c1, c2);
  if (d > r1 + r2 + 1e-8 || d < Math.abs(r1 - r2) - 1e-8 || d < 1e-10) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = Math.max(0, r1 * r1 - a * a);
  const h = Math.sqrt(h2);
  const x = c1.x + a * (c2.x - c1.x) / d;
  const y = c1.y + a * (c2.y - c1.y) / d;
  const rx = -(c2.y - c1.y) * h / d, ry = (c2.x - c1.x) * h / d;
  return h < 1e-8 ? [{ x, y }] : [{ x: x + rx, y: y + ry }, { x: x - rx, y: y - ry }];
}

function poseBranchSign(points, ground) {
  const [u, v] = edgeVertices(ground);
  const free = [0, 1, 2, 3].filter(i => i !== u && i !== v);
  const base = { x: points[v].x - points[u].x, y: points[v].y - points[u].y };
  const cross = p => base.x * (p.y - points[u].y) - base.y * (p.x - points[u].x);
  return Math.sign(cross(points[free[0]]) + cross(points[free[1]])) || 1;
}

function solveFourbarPose(lengths, ground, input, inputAngle, assemblyMode, previous = null) {
  if (input === ground) return null;
  const [g0, g1] = edgeVertices(ground);
  const points = Array(4);
  points[g0] = { x: 0, y: 0 };
  points[g1] = { x: lengths[ground], y: 0 };
  const pivot = sharedVertex(ground, input);
  if (pivot === undefined) return solveOppositeInput(lengths, ground, input, inputAngle, previous);
  const moving = otherVertex(input, pivot);
  const sign = edgeVertices(input)[0] === pivot ? 1 : -1;
  points[moving] = pointOn(points[pivot], lengths[input], inputAngle + (sign < 0 ? Math.PI : 0));
  const unknown = [0, 1, 2, 3].find(v => !points[v]);
  const incident = [mod(unknown - 1, 4), unknown];
  const eA = incident[0], eB = incident[1];
  const centerA = points[otherVertex(eA, unknown)], centerB = points[otherVertex(eB, unknown)];
  if (!centerA || !centerB) return null;
  const intersections = circleIntersections(centerA, lengths[eA], centerB, lengths[eB]);
  if (!intersections.length) return null;
  let chosen;
  if (previous?.points?.[unknown]) {
    chosen = intersections.reduce((best, p) => distance(p, previous.points[unknown]) < distance(best, previous.points[unknown]) ? p : best);
  } else {
    const wanted = assemblyMode === "open" ? 1 : -1;
    chosen = intersections.find(p => {
      const test = [...points]; test[unknown] = p;
      return poseBranchSign(test, ground) === wanted;
    }) || intersections[0];
  }
  points[unknown] = chosen;
  return { points, inputAngle: mod(inputAngle) };
}

// 对边杆作为原动件时，以小型牛顿迭代求解闭环约束。
function solveOppositeInput(lengths, ground, input, angle, previous) {
  const [g0, g1] = edgeVertices(ground);
  const free = [0, 1, 2, 3].filter(v => v !== g0 && v !== g1);
  const base = previous ? free.flatMap(v => [previous.points[v].x, previous.points[v].y]) : [lengths[ground] * .25, lengths[input] * .5, lengths[ground] * .75, lengths[input] * .5];
  const constraints = x => {
    const p = Array(4); p[g0] = {x:0,y:0}; p[g1] = {x:lengths[ground],y:0};
    free.forEach((v,i) => p[v]={x:x[i*2],y:x[i*2+1]});
    const f = [];
    for (let e=0;e<4;e++) if(e!==ground) { const [a,b]=edgeVertices(e); f.push(distance(p[a],p[b])-lengths[e]); }
    const [a,b]=edgeVertices(input), vx=p[b].x-p[a].x, vy=p[b].y-p[a].y;
    f.push(vx*Math.sin(angle)-vy*Math.cos(angle));
    return {f,p};
  };
  const seeds = [base, [base[0],-base[1],base[2],-base[3]]];
  for (const seed of seeds) {
    let x=[...seed];
    for(let k=0;k<25;k++){
      const {f,p}=constraints(x); if(Math.hypot(...f)<1e-6) return {points:p,inputAngle:mod(angle)};
      const h=1e-5, J=f.map(()=>Array(4));
      for(let j=0;j<4;j++){const y=[...x];y[j]+=h;const fy=constraints(y).f;for(let i=0;i<4;i++)J[i][j]=(fy[i]-f[i])/h;}
      const dx=solveLinear(J,f.map(v=>-v)); if(!dx)break;
      x=x.map((v,i)=>v+dx[i]);
    }
  }
  return null;
}
function solveLinear(A,b){
  const m=A.map((r,i)=>[...r,b[i]]);
  for(let i=0;i<4;i++){let p=i;for(let j=i+1;j<4;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;[m[i],m[p]]=[m[p],m[i]];if(Math.abs(m[i][i])<1e-10)return null;for(let j=i+1;j<5;j++)m[i][j]/=m[i][i];m[i][i]=1;for(let r=0;r<4;r++)if(r!==i){const q=m[r][i];for(let j=i;j<5;j++)m[r][j]-=q*m[i][j];}}
  return m.map(r=>r[4]);
}

function mechanismRoles(ground, input) {
  const adjacent = [(ground + 1) % 4, (ground + 3) % 4];
  const output = adjacent.find(e => e !== input) ?? adjacent[0];
  const coupler = [0,1,2,3].find(e => e !== ground && e !== input && e !== output);
  return { output, coupler };
}
function computeTransmissionAngle(pose, ground, input) {
  const {output, coupler} = mechanismRoles(ground, input);
  const shared = sharedVertex(output, coupler);
  const p = pose.points[shared], a = pose.points[otherVertex(output, shared)], b = pose.points[otherVertex(coupler, shared)];
  const ux=a.x-p.x, uy=a.y-p.y, vx=b.x-p.x, vy=b.y-p.y;
  let angle=Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)))));
  angle=Math.min(angle,Math.PI-angle);
  return angle*180/Math.PI;
}
function outputAngle(pose, ground, input) {
  const {output}=mechanismRoles(ground,input); const [a,b]=edgeVertices(output);
  return Math.atan2(pose.points[b].y-pose.points[a].y,pose.points[b].x-pose.points[a].x);
}

// 全周期扫描用于传动角极值、摇杆极位和急回特性计算。
function scanMotion(lengths, ground, input, assembly) {
  const samples = [], total = 2400; let prev=null;
  for(let i=0;i<total;i++){
    const angle=i*TAU/total, pose=solveFourbarPose(lengths,ground,input,angle,assembly,prev);
    if(pose){const gamma=computeTransmissionAngle(pose,ground,input);samples.push({angle,pose,gamma,output:outputAngle(pose,ground,input)});prev=pose;} else prev=null;
  }
  if(!samples.length)return null;
  const gammaMax=samples.reduce((a,b)=>b.gamma>a.gamma?b:a), gammaMin=samples.reduce((a,b)=>b.gamma<a.gamma?b:a);
  const unwrapped=[samples[0].output]; for(let i=1;i<samples.length;i++)unwrapped[i]=unwrapped[i-1]+angleDiff(samples[i].output,samples[i-1].output);
  let minI=0,maxI=0;unwrapped.forEach((v,i)=>{if(v<unwrapped[minI])minI=i;if(v>unwrapped[maxI])maxI=i;});
  const limits=[samples[minI],samples[maxI]];
  const d=mod(limits[1].angle-limits[0].angle), slow=Math.max(d,TAU-d), fast=Math.min(d,TAU-d);
  const full=samples.length/total>.995;
  const K=full&&fast>1e-4?slow/fast:null;
  return {samples,gammaMax,gammaMin,limits,K,theta:K?180*(K-1)/(K+1):null,coverage:samples.length/total};
}

function readInputs() {
  const lengths=[0,1,2,3].map(i=>Number($("l"+i).value));
  const ground=Number($("ground").value), input=Number($("inputLink").value);
  const omega=Number($("omega").value), scale=Number($("scale").value);
  const error=validateLengths(lengths);
  if(error)return showMessage(error,"error"),null;
  if(input===ground)return showMessage("错误：原动件不能选择机架。","error"),null;
  if(!Number.isFinite(omega)||omega<=0)return showMessage("错误：角速度必须为大于 0 的有效数值。","error"),null;
  if(!Number.isFinite(scale)||scale<=0)return showMessage("错误：比例尺必须为大于 0 的有效数值。","error"),null;
  if(!checkClosure(lengths))return showMessage("错误：杆长不满足封闭条件，不能构成铰链四杆机构。","error"),null;
  return {lengths,ground,input,omega,scale,direction:Number($("direction").value),assembly:$("assembly").value};
}
function judge() {
  pause();
  const data=readInputs(); if(!data){state.valid=false;setTargetsDisabled(true);drawEmpty();return;}
  Object.assign(state,data,{angle:0,previousPose:null,trace:[],target:null});
  state.classification=classifyMechanism(state.lengths,state.ground);
  state.scan=scanMotion(state.lengths,state.ground,state.input,state.assembly);
  if(state.scan&&!state.classification.startsWith("曲柄摇杆")) {
    state.scan.K=null;
    state.scan.theta=null;
  }
  state.pose=solveFourbarPose(state.lengths,state.ground,state.input,state.angle,state.assembly);
  if(!state.scan||!state.pose){
    const first=state.scan?.samples[0]; if(first){state.angle=first.angle;state.pose=first.pose;} else {showMessage("错误：当前配置没有可求解的装配位置。","error");return;}
  }
  state.valid=true;
  const gr=checkGrashof(state.lengths);
  let note=`判别完成：${state.classification}。`;
  if(gr.critical)note+=" 该机构处于杆长条件临界状态，可能出现特殊位置或运动不连续。";
  else if(!gr.satisfied)note+=" 满足封闭条件，但原动件通常不能整周转动，动画将在不可达位置反向。";
  showMessage(note,gr.critical||!gr.satisfied?"warn":"info");
  updateMetrics();
  setTargetsDisabled(false);
  const hasRockerLimits=state.classification.includes("摇杆");
  $("limit1").disabled=!hasRockerLimits;
  $("limit2").disabled=!hasRockerLimits;
  draw();
}

function start() {
  if(!state.valid){judge();if(!state.valid)return;}
  state.running=true;state.target=null;state.lastTime=performance.now();$("runDot").classList.add("active");$("runState").textContent="运动中";requestAnimationFrame(tick);
}
function pause() { state.running=false;$("runDot").classList.remove("active");$("runState").textContent=state.valid?"已暂停":"等待判别"; }
function reset() { pause();state.angle=0;state.previousPose=null;state.trace=[];if(state.valid){state.pose=solveFourbarPose(state.lengths,state.ground,state.input,0,state.assembly)||state.scan.samples[0].pose;state.angle=state.pose.inputAngle;updateMetrics();draw();} }
function moveToTargetAngle(angle) { if(!state.valid)return;state.target=mod(angle);state.running=true;state.lastTime=performance.now();$("runDot").classList.add("active");$("runState").textContent="前往特征位置";requestAnimationFrame(tick); }
function tick(time) {
  if(!state.running)return;
  const dt=Math.min(.04,(time-state.lastTime)/1000||0);state.lastTime=time;
  let step=state.direction*state.omega*dt;
  if(state.target!==null){const remaining=mod(state.direction*(state.target-state.angle));if(remaining<=Math.abs(step)+.002){step=state.direction*remaining;state.target=null;}}
  const next=mod(state.angle+step), pose=solveFourbarPose(state.lengths,state.ground,state.input,next,state.assembly,state.pose);
  if(!pose){state.direction*=-1;$("direction").value=String(state.direction);showMessage("当前方向到达不可达边界，已自动反向。","warn");}
  else {state.previousPose=state.pose;state.pose=pose;state.angle=next;const {output}=mechanismRoles(state.ground,state.input);const v=otherVertex(output,sharedVertex(output,state.ground));state.trace.push({...pose.points[v]});if(state.trace.length>500)state.trace.shift();updateMetrics();draw();}
  if(state.target===null&&$("runState").textContent==="前往特征位置"){pause();showMessage("已到达目标特征位置。","info");return;}
  requestAnimationFrame(tick);
}

function updateMetrics() {
  if(!state.valid||!state.pose)return;
  const gamma=computeTransmissionAngle(state.pose,state.ground,state.input), s=state.scan;
  $("classification").textContent=state.classification;
  $("angleNow").textContent=radToDeg(state.angle).toFixed(2)+"°";
  $("gammaNow").textContent=gamma.toFixed(2)+"°";$("alphaNow").textContent=(90-gamma).toFixed(2)+"°";
  $("gammaRange").textContent=`${s.gammaMin.gamma.toFixed(2)}° — ${s.gammaMax.gamma.toFixed(2)}°`;
  $("alphaRange").textContent=`${(90-s.gammaMax.gamma).toFixed(2)}° — ${(90-s.gammaMin.gamma).toFixed(2)}°`;
  $("quickRatio").textContent=s.K?s.K.toFixed(3):"不适用";$("theta").textContent=s.theta?s.theta.toFixed(2)+"°":"不适用";
  $("coverage").textContent=(s.coverage*100).toFixed(1)+"%";
  $("assemblyReadout").textContent=state.assembly==="open"?"开式":"交叉式";$("scaleReadout").textContent=`μ = ${Number($("scale").value).toFixed(3)} m/mm`;
}
function showMessage(text,type="info"){$("message").textContent=text;$("message").className="message "+type;}
function setTargetsDisabled(value){["limit1","limit2","gammaMax","gammaMin"].forEach(id=>$(id).disabled=value);}

function resizeCanvas() { const r=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw(); }
function displayTransform(points) {
  const w=canvas.clientWidth,h=canvas.clientHeight, mu=Number($("scale").value)||.01;
  const userFactor=.01/mu, base=Math.min(w,h)*.55/Math.max(...state.lengths), pxPerUnit=base*userFactor*state.viewZoom;
  // The solver keeps the ground link horizontal. Anchor the viewport to its
  // midpoint as well, so the fixed link never appears to drift during motion.
  const [g0,g1]=edgeVertices(state.ground);
  const cx=(points[g0].x+points[g1].x)/2,cy=(points[g0].y+points[g1].y)/2;
  return p=>({x:w/2+state.viewOffset.x+(p.x-cx)*pxPerUnit,y:h/2+state.viewOffset.y-(p.y-cy)*pxPerUnit});
}
function drawEmpty(){ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);ctx.fillStyle="#78909c";ctx.font="13px Segoe UI";ctx.textAlign="center";ctx.fillText("输入有效参数后点击“判别并计算”",canvas.clientWidth/2,canvas.clientHeight/2);}
function drawFeaturePose(sample,color,label,T){
  if(!sample)return;ctx.save();ctx.setLineDash([6,6]);ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.globalAlpha=.58;for(let e=0;e<4;e++){const [a,b]=edgeVertices(e),p=T(sample.pose.points[a]),q=T(sample.pose.points[b]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}const p=T(sample.pose.points[0]);ctx.fillStyle=color;ctx.font="700 9px Segoe UI";ctx.fillText(label,p.x+7,p.y-7);ctx.restore();
}
function draw() {
  ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);if(!state.valid||!state.pose){drawEmpty();return;}
  const T=displayTransform(state.pose.points);
  if(state.scan){
    if($("showLimit1").checked)drawFeaturePose(state.scan.limits[0],"#8a6f9e","极位 1",T);
    if($("showLimit2").checked)drawFeaturePose(state.scan.limits[1],"#8a6f9e","极位 2",T);
    if($("showGammaMax").checked)drawFeaturePose(state.scan.gammaMax,"#0f8b8d","γmax",T);
    if($("showGammaMin").checked)drawFeaturePose(state.scan.gammaMin,"#c2413b","γmin",T);
  }
  if(state.trace.length>1){ctx.beginPath();state.trace.forEach((p,i)=>{const q=T(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.strokeStyle="rgba(15,139,141,.22)";ctx.lineWidth=1.5;ctx.stroke();}
  for(let e=0;e<4;e++){const [a,b]=edgeVertices(e),p=T(state.pose.points[a]),q=T(state.pose.points[b]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=e===state.input?"#ef8354":e===state.ground?"#667985":"#123b56";ctx.lineWidth=e===state.ground?8:e===state.input?5:4;ctx.lineCap="round";ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.font="700 10px Segoe UI";ctx.fillText(NAMES[e],(p.x+q.x)/2+7,(p.y+q.y)/2-7);}
  state.pose.points.forEach((p,i)=>{const q=T(p);ctx.beginPath();ctx.arc(q.x,q.y,7,0,TAU);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#123b56";ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle="#102a43";ctx.font="800 11px Segoe UI";ctx.fillText(VERTICES[i],q.x+10,q.y-10);});
  const pivot=sharedVertex(state.ground,state.input);if(pivot!==undefined){const p=T(state.pose.points[pivot]);ctx.beginPath();ctx.arc(p.x,p.y,24,state.angle-.65,state.angle+.65,state.direction<0);ctx.strokeStyle="#ef8354";ctx.lineWidth=2;ctx.stroke();const a=state.angle+(state.direction>0?.65:-.65),tip={x:p.x+24*Math.cos(a),y:p.y-24*Math.sin(a)};ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(tip.x-7*Math.cos(a-.55),tip.y+7*Math.sin(a-.55));ctx.lineTo(tip.x-7*Math.cos(a+.55),tip.y+7*Math.sin(a+.55));ctx.closePath();ctx.fillStyle="#ef8354";ctx.fill();}
}

$("judge").onclick=judge;$("start").onclick=start;$("pause").onclick=pause;$("reset").onclick=reset;
$("limit1").onclick=()=>moveToTargetAngle(state.scan.limits[0].angle);$("limit2").onclick=()=>moveToTargetAngle(state.scan.limits[1].angle);
$("gammaMax").onclick=()=>moveToTargetAngle(state.scan.gammaMax.angle);$("gammaMin").onclick=()=>moveToTargetAngle(state.scan.gammaMin.angle);
$("scale").addEventListener("input",()=>{if(Number($("scale").value)>0){updateMetrics();draw();}else showMessage("错误：比例尺必须为大于 0 的有效数值。","error");});
canvas.addEventListener("wheel",event=>{
  event.preventDefault();
  const factor=event.deltaY<0?1/1.12:1.12;
  state.viewZoom=Math.max(.2,Math.min(8,state.viewZoom*factor));
  draw();
},{passive:false});
canvas.addEventListener("mousedown",event=>{
  if(event.button!==1)return;
  event.preventDefault();
  state.panning=true;
  state.panStart={x:event.clientX-state.viewOffset.x,y:event.clientY-state.viewOffset.y};
  canvas.classList.add("panning");
});
window.addEventListener("mousemove",event=>{
  if(!state.panning)return;
  state.viewOffset.x=event.clientX-state.panStart.x;
  state.viewOffset.y=event.clientY-state.panStart.y;
  draw();
});
window.addEventListener("mouseup",event=>{
  if(event.button!==1)return;
  state.panning=false;
  state.panStart=null;
  canvas.classList.remove("panning");
});
canvas.addEventListener("auxclick",event=>{if(event.button===1)event.preventDefault();});
["showLimit1","showLimit2","showGammaMax","showGammaMin"].forEach(id=>$(id).addEventListener("change",draw));
$("direction").addEventListener("change",()=>state.direction=Number($("direction").value));
$("omega").addEventListener("change",()=>{const v=Number($("omega").value);if(v>0)state.omega=v;});
["ground","inputLink","assembly"].forEach(id=>$(id).addEventListener("change",()=>showMessage("配置已修改，请重新点击“判别并计算”。","warn")));
window.addEventListener("resize",resizeCanvas);setTargetsDisabled(true);resizeCanvas();judge();
