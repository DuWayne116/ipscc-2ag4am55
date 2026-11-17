/* IPS PACKAGING // COMMAND CENTRE  -  J.A.R.V.I.S. v1
   Data: data.json (fetched, refreshed every 60s). FALLBACK below is used when
   opened from file:// where browsers block fetch. Keep it in sync or host the page. */
const FALLBACK = {"_note": "EXAMPLE DATA ONLY - replace with live data. All client/site names below are placeholders.", "updated": "2026-11-17T08:00:00+02:00", "weather": {"location": "Benoni", "temp_c": 24, "condition": "Partly cloudy (EXAMPLE)", "high_c": 27, "low_c": 14, "wind_kmh": 12, "rain_chance": 30}, "loads": [{"site": "EXAMPLE Client A - Edenvale", "type": "40ft HC container - lashing & securing", "loadmaster": "Johan (example)", "time": "08:00", "status": "In progress"}, {"site": "EXAMPLE Client B - Kempton Park", "type": "Flatbed truck - load securing", "loadmaster": "Linton (example)", "time": "10:30", "status": "Scheduled"}, {"site": "EXAMPLE Client C - Germiston", "type": "Export crating - 3 crates", "loadmaster": "Christo (example)", "time": "13:00", "status": "Scheduled"}], "reports": [{"code": "Gre10112026", "site": "EXAMPLE Site", "received": "10 Nov 18:42", "status": "Checked"}, {"code": "Gal13112026", "site": "EXAMPLE Site", "received": "13 Nov 17:05", "status": "Needs review"}, {"code": "Gre16112026", "site": "EXAMPLE Site", "received": "16 Nov 16:20", "status": "New"}], "inbox": {"unread": 12, "top": [{"from": "EXAMPLE Freight Forwarder", "subject": "Quote: 2x 40ft lashing next week", "time": "07:41"}, {"from": "EXAMPLE Supplier", "subject": "Ratchet straps 5t - price update", "time": "06:58"}, {"from": "EXAMPLE Accounts", "subject": "Statement attached", "time": "Mon"}]}, "quotes": [{"name": "EXAMPLE Lead 1", "service": "Export crating", "received": "Today 07:12", "status": "New"}, {"name": "EXAMPLE Lead 2", "service": "Container packing & lashing", "received": "Yesterday", "status": "Draft reply ready"}], "reminders": [{"title": "PAYE EMP201 submission & payment", "due": "2026-12-07", "priority": "high"}, {"title": "EXAMPLE: Invoice follow-up", "due": "2026-11-20", "priority": "medium"}, {"title": "EXAMPLE: Strap & ratchet stock check", "due": "2026-11-24", "priority": "low"}], "stats": {"containers": "2000+", "trucks": "10 000+", "crates": "3000+"}, "ticker": ["IPS PACKAGING // BENONI // EXPORT CRATING // CONTAINER PACKING & LASHING // LOAD SECURING // LOADMASTER SERVICES", "EXAMPLE FEED // replace via data.json"]};
const TZ = 'Africa/Johannesburg';
let D = FALLBACK, state = 'standby', micOn = false, rec = null, awakeUntil = 0, voice = null, level = 0;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- data ---------- */
async function loadData(){
  try{ const r = await fetch('data.json?t='+Date.now(), {cache:'no-store'}); if(r.ok) D = await r.json(); }catch(e){}
  render();
}
function nowSA(){ return new Date(new Date().toLocaleString('en-US',{timeZone:TZ})); }
function daysTo(iso){ const t=nowSA(); t.setHours(0,0,0,0); const d=new Date(iso+'T00:00:00'); return Math.round((d-t)/864e5); }
function tagCls(s){ s=(s||'').toLowerCase(); return s.includes('new')?'new':s.includes('review')?'review':s.includes('check')?'checked':s; }
function render(){
  const ex = (D._note||'').includes('EXAMPLE') ? '<span class="ex">EXAMPLE DATA</span>' : '';
  $('#p-loads .body').innerHTML = (D.loads||[]).map(l=>`<div class="row"><div><div class="a">${esc(l.site)}</div><div class="b">${esc(l.type)} · LM: ${esc(l.loadmaster)}</div></div><div class="t">${esc(l.time)}<br><span class="tag ${tagCls(l.status)}">${esc(l.status)}</span></div></div>`).join('') + ex;
  $('#p-reports .body').innerHTML = (D.reports||[]).map(r=>`<div class="row"><div><div class="a">${esc(r.code)}</div><div class="b">${esc(r.site)} · ${esc(r.received)}</div></div><span class="tag ${tagCls(r.status)}">${esc(r.status)}</span></div>`).join('') + ex;
  const w = D.weather||{};
  $('#p-weather .body').innerHTML = `<div class="row"><div><div class="big">${esc(w.temp_c)}°C</div><div class="b">${esc(w.condition)}</div></div><div class="b" style="text-align:right">H ${esc(w.high_c)}° / L ${esc(w.low_c)}°<br>WIND ${esc(w.wind_kmh)} km/h<br>RAIN ${esc(w.rain_chance)}%</div></div><span class="ex">PLACEHOLDER</span>`;
  const ib = D.inbox||{top:[]};
  $('#p-inbox .body').innerHTML = `<div class="row"><div class="b">UNREAD</div><div class="big">${esc(ib.unread)}</div></div>` + ib.top.map(m=>`<div class="row"><div><div class="a">${esc(m.subject)}</div><div class="b">${esc(m.from)}</div></div><div class="t">${esc(m.time)}</div></div>`).join('') + ex;
  $('#p-quotes .body').innerHTML = (D.quotes||[]).map(q=>`<div class="row"><div><div class="a">${esc(q.name)}</div><div class="b">${esc(q.service)} · ${esc(q.received)}</div></div><span class="tag ${tagCls(q.status)}">${esc(q.status)}</span></div>`).join('') + ex;
  $('#p-reminders .body').innerHTML = (D.reminders||[]).map(r=>{const d=daysTo(r.due);return `<div class="row"><div><div class="a">${esc(r.title)}</div><div class="b">DUE ${esc(r.due)}</div></div><div class="t">${d<0?'OVERDUE':d===0?'TODAY':'T-'+d+'d'}<br><span class="tag ${esc(r.priority)}">${esc(r.priority)}</span></div></div>`}).join('');
  const s = D.stats||{};
  $('#p-stats').innerHTML = [['containers','CONTAINERS LOADED'],['trucks','TRUCKS SECURED'],['crates','CRATES BUILT']].map(([k,l])=>`<div class="stat"><div class="n">${esc(s[k])}</div><div class="l">${l}</div></div>`).join('');
  $('#ticker-text').textContent = [...(D.ticker||[]), ...(D.loads||[]).map(l=>`LOAD ${l.time} ${l.site} — ${l.status}`), ...(D.reports||[]).map(r=>`REPORT ${r.code} — ${r.status}`)].join('   ◆   ');
  let lines=[]; for(let i=0;i<60;i++){ const h=(Math.random()*0xffffffff>>>0).toString(16).padStart(8,'0'); lines.push(`0x${h}  ${['LASH','SEAL','WGT','CNTR','STRP','CRATE','LMSTR','DBN','JHB','SARS'][i%10]}.${(Math.random()*999|0).toString().padStart(3,'0')}  ${(Math.random()*100).toFixed(2)}%  ${Math.random()>.85?'!! CHECK':'OK'}`); }
  $('#stream-l').textContent = lines.join('\n')+'\n'+lines.join('\n');
}

/* ---------- clock ---------- */
function tick(){
  const d = new Date();
  $('#clock-time').textContent = d.toLocaleTimeString('en-GB',{timeZone:TZ,hour12:false});
  $('#clock-date').textContent = d.toLocaleDateString('en-GB',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
}
function greetingWord(){ const h=nowSA().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }

/* ---------- arc reactor / globe ---------- */
const cv = $('#core'), cx = cv.getContext('2d'); let W=0,H=0,dpr=1;
function resize(){ dpr=window.devicePixelRatio||1; const r=cv.getBoundingClientRect(); W=r.width; H=r.height; cv.width=W*dpr; cv.height=H*dpr; cx.setTransform(dpr,0,0,dpr,0,0); }
window.addEventListener('resize', resize);
const pts=[]; for(let i=0;i<420;i++){ const u=Math.random()*2-1,t=Math.random()*Math.PI*2; pts.push([Math.sqrt(1-u*u)*Math.cos(t),u,Math.sqrt(1-u*u)*Math.sin(t)]); }
const SA=[-26.19*Math.PI/180, 28.32*Math.PI/180]; // Benoni lat/lon
function proj(x,y,z,R,rot,tilt){ const c=Math.cos(rot),s=Math.sin(rot); let X=x*c+z*s, Z=-x*s+z*c; const ct=Math.cos(tilt),st=Math.sin(tilt); let Y=y*ct-Z*st; Z=y*st+Z*ct; return [W/2+X*R, H/2-Y*R, Z]; }
function draw(t){
  t/=1000; cx.clearRect(0,0,W,H);
  const target = state==='speaking' ? .6+.4*Math.abs(Math.sin(t*9))*Math.random() : state==='listening' ? .35+.25*Math.sin(t*6) : .05;
  level += (target-level)*.12;
  const R = Math.min(W,H)*.30*(1+level*.06), rot=t*.25, tilt=.35;
  const col = state==='speaking'?'255,200,90':'63,240,255';
  // glow
  const g=cx.createRadialGradient(W/2,H/2,R*.1,W/2,H/2,R*1.6); g.addColorStop(0,`rgba(${col},${.18+level*.25})`); g.addColorStop(1,'rgba(0,0,0,0)'); cx.fillStyle=g; cx.fillRect(0,0,W,H);
  cx.lineWidth=1;
  // latitude/longitude
  for(let la=-75;la<=75;la+=15){ cx.beginPath(); for(let lo=0;lo<=360;lo+=6){ const a=la*Math.PI/180,b=lo*Math.PI/180; const [px,py,pz]=proj(Math.cos(a)*Math.cos(b),Math.sin(a),Math.cos(a)*Math.sin(b),R,rot,tilt); lo?cx.lineTo(px,py):cx.moveTo(px,py);} cx.strokeStyle=`rgba(${col},.22)`; cx.stroke(); }
  for(let lo=0;lo<360;lo+=15){ cx.beginPath(); for(let la=-90;la<=90;la+=6){ const a=la*Math.PI/180,b=lo*Math.PI/180; const [px,py]=proj(Math.cos(a)*Math.cos(b),Math.sin(a),Math.cos(a)*Math.sin(b),R,rot,tilt); la>-90?cx.lineTo(px,py):cx.moveTo(px,py);} cx.strokeStyle=`rgba(${col},.18)`; cx.stroke(); }
  // points
  for(const p of pts){ const [px,py,pz]=proj(p[0],p[1],p[2],R,rot,tilt); if(pz<0) continue; cx.fillStyle=`rgba(${col},${.3+pz*.6})`; cx.fillRect(px,py,1.6,1.6); }
  // Benoni marker
  { const [la,lo]=SA; const [px,py,pz]=proj(Math.cos(la)*Math.cos(lo),Math.sin(la),Math.cos(la)*Math.sin(lo),R,rot,tilt);
    if(pz>-.1){ const pr=4+3*Math.sin(t*4); cx.beginPath(); cx.arc(px,py,pr,0,7); cx.fillStyle='rgba(255,180,70,.95)'; cx.fill(); cx.beginPath(); cx.arc(px,py,pr*3,0,7); cx.strokeStyle='rgba(255,180,70,.5)'; cx.stroke(); cx.fillStyle='rgba(255,200,120,.9)'; cx.font='10px monospace'; cx.fillText('IPS · BENONI',px+10,py-8);} }
  // rings
  const rings=[[1.25,.6,1,[4,6]],[1.38,-.35,2,[40,10]],[1.52,.18,1,[2,8]],[1.66,-.1,3,[80,30,10,30]]];
  rings.forEach(([k,sp,lw,dash],i)=>{ cx.save(); cx.translate(W/2,H/2); cx.rotate(t*sp); cx.setLineDash(dash); cx.lineWidth=lw+level*2; cx.strokeStyle=`rgba(${col},${.35+level*.5-i*.05})`; cx.beginPath(); cx.arc(0,0,R*k*(1+level*.05*Math.sin(t*10+i)),0,Math.PI*2); cx.stroke(); cx.restore(); });
  cx.setLineDash([]);
  // radar sweep
  cx.save(); cx.translate(W/2,H/2); const sw=t*1.4; const sg=cx.createConicGradient? cx.createConicGradient(sw,0,0):null;
  if(sg){ sg.addColorStop(0,`rgba(${col},.28)`); sg.addColorStop(.08,`rgba(${col},0)`); sg.addColorStop(1,`rgba(${col},0)`); cx.fillStyle=sg; cx.beginPath(); cx.arc(0,0,R*1.52,0,7); cx.fill(); }
  cx.restore();
  // audio bars
  const N=96; for(let i=0;i<N;i++){ const a=i/N*Math.PI*2; const amp=(level*.6+.04)*(.4+.6*Math.abs(Math.sin(t*7+i*.7)*Math.cos(t*3+i*.3))); const r1=R*1.78,r2=r1+R*amp*.5; cx.strokeStyle=`rgba(${col},.6)`; cx.lineWidth=2; cx.beginPath(); cx.moveTo(W/2+Math.cos(a)*r1,H/2+Math.sin(a)*r1); cx.lineTo(W/2+Math.cos(a)*r2,H/2+Math.sin(a)*r2); cx.stroke(); }
  // ticks
  for(let i=0;i<72;i++){ const a=i/72*Math.PI*2-t*.05, r1=R*1.95, r2=r1+(i%6?4:10); cx.strokeStyle=`rgba(${col},.4)`; cx.lineWidth=1; cx.beginPath(); cx.moveTo(W/2+Math.cos(a)*r1,H/2+Math.sin(a)*r1); cx.lineTo(W/2+Math.cos(a)*r2,H/2+Math.sin(a)*r2); cx.stroke(); }
  requestAnimationFrame(draw);
}

/* ---------- state + speech ---------- */
function setState(s,hint){ state=s; $('#state').textContent=s.toUpperCase(); $('#hint').textContent=hint||(s==='standby'?(micOn?'SAY “HEY JARVIS”':'MIC OFF'):''); }
function pickVoice(){ const v=speechSynthesis.getVoices(); voice = v.find(x=>/en-GB/i.test(x.lang)&&/(male|daniel|george|ryan|arthur|oliver|thomas)/i.test(x.name)) || v.find(x=>/Google UK English Male/i.test(x.name)) || v.find(x=>/en-GB/i.test(x.lang)) || v.find(x=>/^en/i.test(x.lang)) || null; }
if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged=pickVoice; }
function say(text){
  $('#said').textContent=text;
  if(!('speechSynthesis' in window)){ return; }
  speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); if(voice){u.voice=voice;u.lang=voice.lang;} else u.lang='en-GB';
  u.rate=1.0; u.pitch=.9;
  u.onstart=()=>{ setState('speaking'); pauseRec(true); };
  u.onend=u.onerror=()=>{ setState(micOn?'standby':'standby'); pauseRec(false); };
  speechSynthesis.speak(u);
}
const list = (a,f)=> a.length? a.map(f).join('; ') : 'none';
function answer(cmd){
  const c=cmd.toLowerCase(); $('#copy-btn').classList.add('hidden');
  const L=D.loads||[], R=D.reports||[], I=D.inbox||{unread:0,top:[]}, Q=D.quotes||[], M=D.reminders||[];
  const loads=()=>`We have ${L.length} load${L.length===1?'':'s'} today, sir: ${list(L,l=>`${l.time}, ${l.type} at ${l.site}, loadmaster ${l.loadmaster}`)}.`;
  const reps=()=>{ const n=R.filter(r=>!/checked/i.test(r.status)); return n.length?`${n.length} report${n.length===1?'':'s'} need attention: ${list(n,r=>`${r.code}, ${r.status}`)}.`:'No new reports from Johan, sir.'; };
  const inbox=()=>`You have ${I.unread} unread in the work inbox. Top items: ${list(I.top,m=>`${m.subject}, from ${m.from}`)}.`;
  const due=()=>{ const s=[...M].sort((a,b)=>a.due.localeCompare(b.due)); return `Upcoming: ${list(s,r=>{const d=daysTo(r.due);return `${r.title}, ${d<0?'overdue':d===0?'due today':'in '+d+' day'+(d===1?'':'s')}`;})}.`; };
  const quotes=()=>Q.length?`${Q.length} quote request${Q.length===1?'':'s'} from the website: ${list(Q,q=>`${q.name}, ${q.service}, ${q.status}`)}.`:'No new quote requests, sir.';
  let out=null;
  if(/(status report|brief me|briefing|sit ?rep|summary|update me)/.test(c)) out=`${greetingWord()}, sir. ${loads()} ${reps()} ${inbox()} ${quotes()} ${due()}`;
  else if(/load|job|site|today/.test(c)) out=loads();
  else if(/report|johan/.test(c)) out=reps();
  else if(/inbox|mail|email/.test(c)) out=inbox();
  else if(/quote|lead|website|enquir/.test(c)) out=quotes();
  else if(/due|deadline|remind|paye|emp ?201/.test(c)) out=due();
  else if(/weather|temperature|rain/.test(c)){ const w=D.weather||{}; out=`Benoni is ${w.temp_c} degrees, ${w.condition}, with a ${w.rain_chance} percent chance of rain.`; }
  else if(/time/.test(c)) out=`It is ${new Date().toLocaleTimeString('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit'})}, sir.`;
  else if(/stat|how many container|numbers/.test(c)){ const s=D.stats||{}; out=`To date, sir: ${s.containers} containers loaded, ${s.trucks} trucks secured and ${s.crates} crates built.`; }
  else if(/^(hello|hi|hey)\b|are you there|you there/.test(c)) out='At your service, sir.';
  else if(/thank/.test(c)) out='Always a pleasure, sir.';
  if(!out){ out="I'll pass that on, sir."; const b=$('#copy-btn'); b.dataset.cmd=cmd; b.classList.remove('hidden'); }
  say(out);
}
function handleCommand(cmd){ cmd=cmd.trim(); if(!cmd) return; $('#heard').textContent=cmd; answer(cmd); }

let recPaused=false;
function pauseRec(p){ recPaused=p; if(!rec) return; try{ p?rec.abort():(micOn&&rec.start()); }catch(e){} }
function setupRec(){
  const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ $('#hint').textContent='VOICE NEEDS CHROME / EDGE'; return null; }
  const r=new SR(); r.lang='en-GB'; r.continuous=true; r.interimResults=true;
  r.onresult=e=>{
    for(let i=e.resultIndex;i<e.results.length;i++){
      const txt=e.results[i][0].transcript.trim(), fin=e.results[i].isFinal, low=txt.toLowerCase();
      const m=low.match(/(?:hey|hi|ok|okay)?\s*jarvis[,.!?]?\s*(.*)$/);
      if(m){ awakeUntil=Date.now()+8000; setState('listening','GO AHEAD, SIR'); $('#heard').textContent=m[1]||'…';
        if(fin){ if(m[1]&&m[1].length>2){ awakeUntil=0; handleCommand(m[1]); } else { say('Yes, sir?'); } } }
      else if(Date.now()<awakeUntil){ $('#heard').textContent=txt; if(fin){ awakeUntil=0; handleCommand(txt); } }
    }
  };
  r.onend=()=>{ if(micOn&&!recPaused){ try{r.start();}catch(e){} } if(state==='listening'&&Date.now()>awakeUntil) setState('standby'); };
  r.onerror=e=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed'){ micOn=false; updMic(); $('#hint').textContent=location.protocol==='file:'?'MIC NEEDS HTTPS (HOST THE PAGE)':'MIC PERMISSION DENIED'; } };
  return r;
}
function updMic(){ const b=$('#mic-btn'); b.textContent='🎙 MIC: '+(micOn?'ON':'OFF'); b.classList.toggle('on',micOn); if(state==='standby') setState('standby'); }
function toggleMic(on){ micOn = on ?? !micOn; if(!rec) rec=setupRec(); if(!rec){ micOn=false; updMic(); return; } try{ micOn?rec.start():rec.abort(); }catch(e){} updMic(); }
setInterval(()=>{ if(state==='listening'&&Date.now()>awakeUntil) setState('standby'); },1000);

/* ---------- wiring ---------- */
$('#start-btn').onclick=()=>{ $('#overlay').classList.add('gone'); say(`${greetingWord()}, sir. All systems online.`); toggleMic(true); };
$('#mic-btn').onclick=()=>toggleMic();
$('#brief-btn').onclick=()=>handleCommand('brief me');
$('#typed').addEventListener('keydown',e=>{ if(e.key==='Enter'){ handleCommand(e.target.value); e.target.value=''; } });
$('#copy-btn').onclick=async e=>{ const t=e.target.dataset.cmd||''; try{ await navigator.clipboard.writeText(t); }catch(_){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } e.target.textContent='✓ COPIED — PASTE TO JARVIS IN CHAT'; setTimeout(()=>e.target.textContent='⧉ COPY TO CHAT',2500); };
document.addEventListener('keydown',e=>{ if(e.code==='Space'&&document.activeElement.tagName!=='INPUT'&&$('#overlay').classList.contains('gone')){ e.preventDefault(); awakeUntil=Date.now()+8000; setState('listening','GO AHEAD, SIR'); } });

tick(); setInterval(tick,1000); render(); loadData(); setInterval(loadData,60000);
resize(); requestAnimationFrame(draw);
