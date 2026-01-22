"use strict";
const STORAGE_KEY = "langlive_roulette_records";

function getMeta(n){
  if(n===0) return {color:"green", oddEven:null, range:null};
  const color = (n%2===1) ? "red" : "black";
  const oddEven = (n%2===1) ? "odd" : "even";
  let range=null;
  if(n>=1 && n<=12) range="small";
  else if(n<=24) range="medium";
  else range="large";
  return {color, oddEven, range};
}

function loadRecords(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch{ return []; }
}
function saveRecords(records){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function addRecord(number){
  const records = loadRecords();
  const m = getMeta(number);
  records.unshift({number, ...m, timestamp: Date.now()});
  saveRecords(records);
}
function undoLast(){
  const records = loadRecords();
  records.shift();
  saveRecords(records);
}
function clearAll(){ saveRecords([]); }

function calcStats(records, n){
  const slice = records.slice(0,n);
  let red=0, black=0, odd=0, even=0, small=0, medium=0, large=0;
  for(const r of slice){
    if(r.number===0) continue;
    if(r.color==="red") red++; else if(r.color==="black") black++;
    if(r.oddEven==="odd") odd++; else if(r.oddEven==="even") even++;
    if(r.range==="small") small++; else if(r.range==="medium") medium++; else if(r.range==="large") large++;
  }
  return {red, black, odd, even, small, medium, large};
}

function calcHotCold(records){
  const slice = records.slice(0,240);
  const counts = new Map();
  for(const r of slice) counts.set(r.number,(counts.get(r.number)||0)+1);

  const allNums = Array.from({length:37},(_,i)=>i);
  const hot = allNums
    .map(num=>({num,c:counts.get(num)||0}))
    .sort((a,b)=>(b.c-a.c)||(a.num-b.num))
    .filter(x=>x.c>0)
    .slice(0,3)
    .map(x=>x.num);

  const lastIndex = new Map();
  for(let i=0;i<slice.length;i++){
    const num = slice[i].number;
    if(!lastIndex.has(num)) lastIndex.set(num,i);
  }
  const cold = allNums
    .map(num=>({num,idx:lastIndex.has(num)?lastIndex.get(num):Infinity}))
    .sort((a,b)=>(b.idx-a.idx)||(a.num-b.num))
    .slice(0,3)
    .map(x=>x.num);

  return {hot, cold};
}

function calcZero(records){
  let missing = records.length;
  for(let i=0;i<records.length;i++){
    if(records[i].number===0){ missing=i; break; }
  }
  const idx=[];
  for(let i=0;i<records.length;i++) if(records[i].number===0) idx.push(i);
  let avg=null;
  if(idx.length>=2){
    let sum=0;
    for(let i=0;i<idx.length-1;i++) sum += (idx[i+1]-idx[i]);
    avg = Math.round((sum/(idx.length-1))*10)/10;
  }
  return {missing, avg};
}

function dot(color){
  const s=document.createElement("span");
  s.className="dot";
  s.style.background = (color==="red") ? "var(--red)" : (color==="black" ? "var(--black)" : "var(--green)");
  return s;
}

function renderGrid(){
  const grid=document.getElementById("grid36");
  grid.innerHTML="";
  for(let n=1;n<=36;n++){
    const b=document.createElement("button");
    b.className="btn"; b.textContent=String(n);
    b.onclick=()=>{ addRecord(n); renderAll(); };
    grid.appendChild(b);
  }
  document.getElementById("btn0").onclick=()=>{ addRecord(0); renderAll(); };
}

function renderRecent(records){
  const box=document.getElementById("recent15");
  box.innerHTML="";
  const list=records.slice(0,15);
  
  // 固定顯示 15 行，不足補 --
  for(let i=0;i<15;i++){
    const row=document.createElement("div"); row.className="row";
    const left=document.createElement("div"); left.className="left";
    
    if(i<list.length){
      const r=list[i];
      const num=document.createElement("div"); num.className="num"; num.textContent=String(r.number);
      left.appendChild(num); left.appendChild(dot(r.color));

      const meta=document.createElement("div"); meta.className="meta";
      if(r.number===0) meta.textContent="—";
      else{
        const oe=(r.oddEven==="odd")?"單":"雙";
        const rg=(r.range==="small")?"小":(r.range==="medium"?"中":"大");
        meta.textContent=`${oe}  ${rg}`;
      }
      row.appendChild(left); row.appendChild(meta);
    }else{
      const num=document.createElement("div"); num.className="num"; num.textContent="—";
      left.appendChild(num);
      const meta=document.createElement("div"); meta.className="meta"; meta.textContent="—";
      row.appendChild(left); row.appendChild(meta);
    }
    box.appendChild(row);
  }
}

function renderStats(records,n,targetId){
  const s=calcStats(records,n);
  document.getElementById(targetId).innerHTML =
    `紅 ${s.red} ｜ 黑 ${s.black}<br>`+
    `單 ${s.odd} ｜ 雙 ${s.even}<br>`+
    `小 ${s.small} ｜ 中 ${s.medium} ｜ 大 ${s.large}`;
}

function renderHotCold(records){
  const el=document.getElementById("hotcold");
  const {hot,cold}=calcHotCold(records);
  const hotHtml = hot.map(n=>`<span class="badge">${n}</span>`).join("");
  const coldHtml = cold.map(n=>`<span class="badge">${n}</span>`).join("");
  el.innerHTML = `熱號：${hotHtml}<br><br>冷號：${coldHtml}`;
}

function renderZero(records){
  const el=document.getElementById("zero");
  const z=calcZero(records);
  el.innerHTML = `目前幾期沒出 0：${z.missing} 局<br>平均幾次出 0：${z.avg===null?"—":z.avg+" 局"}`;
}

let holdTimer=null;
function setupButtons(){
  document.getElementById("btnAdd").onclick=()=>{ 
    const hint=document.getElementById("holdHint");
    hint.textContent="點擊上方數字按鈕即可新增";
    setTimeout(()=>hint.textContent="",2000);
  };
  document.getElementById("btnUndo").onclick=()=>{ undoLast(); renderAll(); };

  const clearBtn=document.getElementById("btnClear");
  const hint=document.getElementById("holdHint");
  clearBtn.onpointerdown=(e)=>{
    e.preventDefault();
    hint.textContent="長按中… 2 秒會清空";
    holdTimer=setTimeout(()=>{
      clearAll(); renderAll();
      hint.textContent="已清空";
      holdTimer=null;
      setTimeout(()=>hint.textContent="",800);
    },2000);
  };
  const stop=()=>{
    if(!holdTimer) return;
    clearTimeout(holdTimer);
    holdTimer=null;
    hint.textContent="未達 2 秒，未清空";
    setTimeout(()=>hint.textContent="",800);
  };
  clearBtn.onpointerup=stop;
  clearBtn.onpointerleave=stop;
  clearBtn.onpointercancel=stop;
}

function renderAll(){
  const records=loadRecords();
  renderRecent(records);
  renderStats(records,20,"stats20");
  renderStats(records,50,"stats50");
  renderHotCold(records);
  renderZero(records);
}

renderGrid();
setupButtons();
renderAll();
