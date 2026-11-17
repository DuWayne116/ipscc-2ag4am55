/* IPS PACKAGING // COMMAND CENTRE  -  J.A.R.V.I.S. v2.0 (AI uplink via Cloudflare Worker -> xAI; local answers = offline fallback)
   Data: data.json (fetched, refreshed every 60s). FALLBACK below is used when
   opened from file:// where browsers block fetch. Keep it in sync or host the page. */
const FALLBACK = {"_note": "EXAMPLE DATA ONLY - replace with live data. All client/site names below are placeholders.", "updated": "2026-11-17T08:00:00+02:00", "weather": {"location": "Benoni", "temp_c": 24, "condition": "Partly cloudy (EXAMPLE)", "high_c": 27, "low_c": 14, "wind_kmh": 12, "rain_chance": 30}, "loads": [{"site": "EXAMPLE Client A - Edenvale", "type": "40ft HC container - lashing & securing", "loadmaster": "Johan (example)", "time": "08:00", "status": "In progress"}, {"site": "EXAMPLE Client B - Kempton Park", "type": "Flatbed truck - load securing", "loadmaster": "Linton (example)", "time": "10:30", "status": "Scheduled"}, {"site": "EXAMPLE Client C - Germiston", "type": "Export crating - 3 crates", "loadmaster": "Christo (example)", "time": "13:00", "status": "Scheduled"}], "reports": [{"code": "Gre10112026", "site": "EXAMPLE Site", "received": "10 Nov 18:42", "status": "Checked"}, {"code": "Gal13112026", "site": "EXAMPLE Site", "received": "13 Nov 17:05", "status": "Needs review"}, {"code": "Gre16112026", "site": "EXAMPLE Site", "received": "16 Nov 16:20", "status": "New"}], "inbox": {"unread": 12, "top": [{"from": "EXAMPLE Freight Forwarder", "subject": "Quote: 2x 40ft lashing next week", "time": "07:41"}, {"from": "EXAMPLE Supplier", "subject": "Ratchet straps 5t - price update", "time": "06:58"}, {"from": "EXAMPLE Accounts", "subject": "Statement attached", "time": "Mon"}]}, "quotes": [{"name": "EXAMPLE Lead 1", "service": "Export crating", "received": "Today 07:12", "status": "New"}, {"name": "EXAMPLE Lead 2", "service": "Container packing & lashing", "received": "Yesterday", "status": "Draft reply ready"}], "reminders": [{"title": "PAYE EMP201 submission & payment", "due": "2026-12-07", "priority": "high"}, {"title": "EXAMPLE: Invoice follow-up", "due": "2026-11-20", "priority": "medium"}, {"title": "EXAMPLE: Strap & ratchet stock check", "due": "2026-11-24", "priority": "low"}], "stats": {"containers": "2000+", "trucks": "10 000+", "crates": "3000+"}, "ticker": ["IPS PACKAGING // BENONI // EXPORT CRATING // CONTAINER PACKING & LASHING // LOAD SECURING // LOADMASTER SERVICES", "EXAMPLE FEED // replace via data.json"]};
const TZ = 'Africa/Johannesburg';
const JARVIS_URL = 'https://ips-jarvis.ipspackaging.workers.dev/chat';   // Cloudflare Worker proxy (holds the xAI key)
const KEY_STORE = 'ipscc-jarvis-key';
const HISTORY_TURNS = 10;
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
  const target = state==='speaking' ? .6+.4*Math.abs(Math.sin(t*9))*Math.random() : state==='listening' ? .35+.25*Math.sin(t*6) : state==='thinking' ? .22+.18*Math.abs(Math.sin(t*14)) : .05;
  level += (target-level)*.12;
  const R = Math.min(W,H)*.30*(1+level*.06), rot=t*.25, tilt=.35;
  const col = state==='speaking'?'255,200,90':state==='thinking'?'190,150,255':'63,240,255';
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
let sayGuard=null;
function sayDone(){ clearTimeout(sayGuard); sayGuard=null; if(state==='speaking') setState('standby'); pauseRec(false); }
function say(text){
  $('#said').textContent=text;
  if(!('speechSynthesis' in window)){ setState('standby'); return; }
  pauseRec(true);                                   // stop listening BEFORE speaking so Jarvis does not hear himself
  speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); if(voice){u.voice=voice;u.lang=voice.lang;} else u.lang='en-GB';
  u.rate=1.0; u.pitch=.9;
  setState('speaking'); u.onstart=()=>setState('speaking');
  u.onend=u.onerror=()=>sayDone();
  clearTimeout(sayGuard); sayGuard=setTimeout(sayDone, 4000+text.length*90);   // safety: Edge sometimes never fires onend
  speechSynthesis.speak(u);
}
const list = (a,f)=> a.length? a.map(f).join('; ') : 'none';
function localAnswer(cmd){
  const c=cmd.toLowerCase();
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
  if(!out) out="I'm in offline mode at the moment, sir, so I can only give you what's on the screen. Try again shortly, or ask me in the Grok Bot app.";
  return out;
}

/* ---------- AI uplink (Cloudflare Worker -> xAI) ---------- */
let history=[], reqSeq=0, keyPromise=null;
function getKey(){ try{ return localStorage.getItem(KEY_STORE)||''; }catch(e){ return ''; } }
function setKey(k){ try{ k?localStorage.setItem(KEY_STORE,k):localStorage.removeItem(KEY_STORE); }catch(e){} updLock(); }
function updLock(){ const b=$('#lock-btn'); if(!b) return; const has=!!getKey(); b.textContent=has?'🔒 LOCK':'🔑 UNLOCK'; b.title=has?'Forget the passphrase on this device':'Enter the passphrase'; }
function askKey(msg){
  if(keyPromise) return keyPromise;
  keyPromise=new Promise(res=>{
    const m=$('#key-modal'), inp=$('#key-input');
    $('#key-msg').textContent=msg||'ENTER PASSPHRASE TO CONNECT J.A.R.V.I.S.';
    inp.value=''; m.classList.remove('hidden'); setTimeout(()=>inp.focus(),60);
    const done=v=>{ m.classList.add('hidden'); keyPromise=null; $('#key-ok').onclick=$('#key-cancel').onclick=null; inp.onkeydown=null; if(v) setKey(v); res(v||''); };
    $('#key-ok').onclick=()=>done(inp.value.trim());
    $('#key-cancel').onclick=()=>done('');
    inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') done(inp.value.trim()); else if(e.key==='Escape') done(''); };
  });
  return keyPromise;
}
function setOffline(off,why){
  const s=$('#sysline'); if(!s) return;
  s.textContent=off?('J.A.R.V.I.S. OFFLINE MODE'+(why?' · '+why:'')):'J.A.R.V.I.S. ONLINE · AI UPLINK';
  s.classList.toggle('offline',!!off);
}
async function callJarvis(cmd){
  for(let attempt=0; attempt<3; attempt++){
    let key=getKey();
    if(!key) key=await askKey(attempt?'PASSPHRASE REJECTED · TRY AGAIN':'ENTER PASSPHRASE TO CONNECT J.A.R.V.I.S.');
    if(!key){ const e=new Error('LOCKED'); e.why='LOCKED'; throw e; }
    const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(),25000);
    let r;
    try{
      r=await fetch(JARVIS_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Jarvis-Key':key},
        body:JSON.stringify({messages:[...history.slice(-HISTORY_TURNS*2),{role:'user',content:cmd}],context:D}),signal:ctrl.signal});
    }catch(e){ const x=new Error('NETWORK'); x.why=e.name==='AbortError'?'TIMEOUT':'NO CONNECTION'; throw x; }
    finally{ clearTimeout(to); }
    if(r.status===401){ setKey(''); continue; }
    if(!r.ok){ const e=new Error('HTTP'); e.why='ERROR '+r.status; throw e; }
    const j=await r.json().catch(()=>({}));
    if(!j.reply){ const e=new Error('EMPTY'); e.why='EMPTY REPLY'; throw e; }
    return j.reply.replace(/[*_#`]+/g,'').replace(/\s+/g,' ').trim();
  }
  const e=new Error('LOCKED'); e.why='PASSPHRASE REJECTED'; throw e;
}
async function answer(cmd){
  const seq=++reqSeq, b=$('#copy-btn');
  b.dataset.cmd=cmd; b.classList.add('hidden');
  setState('thinking','PROCESSING, SIR'); $('#said').textContent='…';
  let out, online=true, why='';
  try{ out=await callJarvis(cmd); }catch(e){ online=false; why=e.why||''; out=localAnswer(cmd); }
  if(seq!==reqSeq) return;                         // a newer command superseded this one
  setOffline(!online,why);
  if(online){ history.push({role:'user',content:cmd},{role:'assistant',content:out}); history=history.slice(-HISTORY_TURNS*2); }
  b.classList.remove('hidden');
  say(out);
}
function handleCommand(cmd){ cmd=cmd.trim(); if(!cmd) return; $('#heard').textContent=cmd; answer(cmd); }

/* ---------- voice recognition (wake word + tap to talk) ---------- */
const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
const LANGS=['en-GB','en-US','en-ZA'];
const AUTO_LANGS=['en-GB','en-US'];
const LANG_KEY='ipscc-lang';
function readSavedLang(){ try{ const s=localStorage.getItem(LANG_KEY); if(LANGS.includes(s)) return s; }catch(e){} return 'en-GB'; }
let langIdx=Math.max(0, LANGS.indexOf(readSavedLang()));
function currentLang(){ return LANGS[langIdx]; }
function updateLangSel(){ const sel=$('#lang-sel'); if(sel) sel.value=currentLang(); }
function persistLang(){ try{ localStorage.setItem(LANG_KEY, currentLang()); }catch(e){} }

let recPaused=false, wakeRec=null, wakeStarting=false, restartTimer=null, backoff=300, sessionStart=0, pttRec=null, pendingTimer=null;
let emptySessions=0, speechTimer=null, sessionHadResult=false, sessionHadAudio=false, switchedThisSession=false;
let meterStream=null, meterAudio=null, meterAnalyser=null, meterData=null, meterRaf=0;

const WAKE_RE=/\b(?:(?:hey|hi|hay|hai|ok|okay|yo|a)\s+)?(jarvis|jarviss|jarvice|jarvus|jarvas|jarves|jervis|jervas|javis|jarbis|jaavis|garvis|charvis|travis|service|harvest|davis)\b/;
const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
function findWake(alts){ for(const a of alts){ const n=norm(a), m=n.match(WAKE_RE); if(m) return {rest:n.slice(m.index+m[0].length).trim(), text:n}; } return null; }
function setRecStatus(txt,cls){ const el=$('#rec-state'); if(!el) return; el.textContent=txt; $('#voice-status').className=cls||''; }
function hearing(txt,fin){ const el=$('#hearing'); if(!el) return; el.textContent=txt||'—'; el.classList.toggle('final',!!fin); }
function chime(){ try{ const A=window.__ac||(window.__ac=new (window.AudioContext||window.webkitAudioContext)()); const o=A.createOscillator(), g=A.createGain(); o.type='sine'; o.frequency.setValueAtTime(880,A.currentTime); o.frequency.setValueAtTime(1320,A.currentTime+.08); g.gain.setValueAtTime(.0001,A.currentTime); g.gain.exponentialRampToValueAtTime(.2,A.currentTime+.02); g.gain.exponentialRampToValueAtTime(.0001,A.currentTime+.25); o.connect(g).connect(A.destination); o.start(); o.stop(A.currentTime+.26); }catch(e){} }
function runCmd(txt){ clearTimeout(pendingTimer); pendingTimer=null; awakeUntil=0; txt=norm(txt); const w=txt.match(WAKE_RE); if(w&&w.index<3) txt=txt.slice(w.index+w[0].length).trim(); if(!txt){ setState('standby'); return; } hearing(txt,true); handleCommand(txt); }
function wake(){ if(Date.now()>awakeUntil) chime(); awakeUntil=Date.now()+8000; setState('listening','GO AHEAD, SIR'); }

function clearSpeechTimer(){ clearTimeout(speechTimer); speechTimer=null; }
function resetSessionFlags(){ sessionHadResult=false; sessionHadAudio=false; switchedThisSession=false; clearSpeechTimer(); }
function switchLang(reason){
  if(switchedThisSession) return currentLang();
  switchedThisSession=true;
  emptySessions=0;
  const from=currentLang();
  const i=AUTO_LANGS.indexOf(from);
  const next=i>=0 ? AUTO_LANGS[(i+1)%AUTO_LANGS.length] : AUTO_LANGS[0];
  langIdx=LANGS.indexOf(next);
  persistLang();
  updateLangSel();
  setRecStatus('NO RESULTS · '+from+' → '+next+(reason?(' · '+reason):''),'warn');
  return next;
}
function armSpeechTimeout(){
  clearSpeechTimer();
  speechTimer=setTimeout(()=>{
    speechTimer=null;
    if(sessionHadResult||switchedThisSession||!sessionHadAudio) return;
    switchLang('NO RESULT 6s AFTER SPEECH');
    if(pttRec){ try{ pttRec.abort(); }catch(e){} }
    else if(wakeRec){ try{ wakeRec.abort(); }catch(e){} }
  }, 6000);
}
function noteResult(){ sessionHadResult=true; emptySessions=0; clearSpeechTimer(); }
function noteEmptyEnd(err){
  if(sessionHadResult){ emptySessions=0; return; }
  if(switchedThisSession || err==='aborted') return;
  emptySessions++;
  if(emptySessions>=2) switchLang('2 EMPTY SESSIONS');
}
function setLang(code, manual){
  const i=LANGS.indexOf(code);
  if(i<0) return;
  langIdx=i;
  persistLang();
  updateLangSel();
  emptySessions=0;
  if(manual){
    setRecStatus('LANGUAGE SET · '+currentLang(),'ok');
    if(pttRec){ try{ pttRec.abort(); }catch(e){} }
    if(wakeRec||wakeStarting){ stopWake(); if(micOn&&!recPaused&&!pttRec) scheduleWake(200); }
  }
}

function tickMeter(){
  meterRaf=requestAnimationFrame(tickMeter);
  if(!meterAnalyser||!meterData) return;
  meterAnalyser.getByteTimeDomainData(meterData);
  let sum=0;
  for(let i=0;i<meterData.length;i++){ const v=(meterData[i]-128)/128; sum+=v*v; }
  const pct=Math.min(100, Math.round(Math.sqrt(sum/meterData.length)*280));
  const bar=$('#mic-meter-bar');
  if(bar){ bar.style.width=pct+'%'; bar.classList.toggle('hot', pct>=75); bar.classList.toggle('live', pct>=8); }
}
async function labelMicDevice(){
  const el=$('#mic-device');
  try{
    const devs=await navigator.mediaDevices.enumerateDevices();
    const track=meterStream && meterStream.getAudioTracks()[0];
    const id=track && track.getSettings ? track.getSettings().deviceId : '';
    const mics=devs.filter(d=>d.kind==='audioinput');
    const chosen=(id && mics.find(d=>d.deviceId===id)) || mics.find(d=>d.deviceId==='default') || mics[0];
    const name=(chosen && chosen.label) || (track && track.label) || 'INPUT READY';
    if(el) el.textContent='INPUT: '+name;
  }catch(e){ if(el) el.textContent='INPUT: READY'; }
}
async function startMeter(){
  if(meterStream){ if(!meterRaf) tickMeter(); await labelMicDevice(); return true; }
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ setRecStatus('NO MEDIADEVICES (NEEDS HTTPS)','err'); return false; }
  try{
    meterStream=await navigator.mediaDevices.getUserMedia({audio:true});
    const AC=window.AudioContext||window.webkitAudioContext;
    meterAudio=(window.__ac && window.__ac.state!=='closed') ? window.__ac : new AC();
    window.__ac=meterAudio;
    if(meterAudio.state==='suspended') await meterAudio.resume();
    const src=meterAudio.createMediaStreamSource(meterStream);
    meterAnalyser=meterAudio.createAnalyser();
    meterAnalyser.fftSize=256;
    meterAnalyser.smoothingTimeConstant=.7;
    src.connect(meterAnalyser);
    meterData=new Uint8Array(meterAnalyser.fftSize);
    tickMeter();
    await labelMicDevice();
    if(navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', labelMicDevice);
    return true;
  }catch(e){ setRecStatus('MIC PERMISSION: '+(e.name||e),'err'); $('#hint').textContent='MIC: '+(e.name||'ERROR').toUpperCase(); return false; }
}

function scheduleWake(delay){ clearTimeout(restartTimer); restartTimer=setTimeout(startWake, delay); }
function startWake(){
  clearTimeout(restartTimer);
  if(!SR||!micOn||recPaused||pttRec||wakeRec||wakeStarting) return;
  resetSessionFlags();
  const r=new SR(); r.lang=currentLang(); r.continuous=true; r.interimResults=true; r.maxAlternatives=3;
  r.onstart=()=>{ wakeStarting=false; sessionStart=Date.now(); setRecStatus('LISTENING · '+r.lang,'ok'); };
  r.onaudiostart=()=>{ sessionHadAudio=true; setRecStatus('LISTENING · '+r.lang+' · AUDIO','ok'); };
  r.onspeechstart=()=>armSpeechTimeout();
  r.onresult=e=>{
    noteResult();
    for(let i=e.resultIndex;i<e.results.length;i++){
      const res=e.results[i], fin=res.isFinal, alts=[]; for(let k=0;k<res.length;k++) alts.push(res[k].transcript);
      const top=alts[0]||''; hearing(top,fin);
      const w=findWake(alts);
      if(w){ wake(); $('#heard').textContent=w.rest||'…';
        clearTimeout(pendingTimer);
        if(w.rest&&w.rest.length>2){ if(fin) runCmd(w.rest); else { const rest=w.rest; pendingTimer=setTimeout(()=>runCmd(rest),1800); } }
      } else if(Date.now()<awakeUntil && norm(top)){ $('#heard').textContent=top; clearTimeout(pendingTimer);
        if(fin) runCmd(top); else { const t=top; pendingTimer=setTimeout(()=>runCmd(t),1800); } }
    }
  };
  r.onerror=e=>{ const err=e.error||'unknown'; r._err=err;
    if(err==='no-speech'||err==='aborted') return;
    setRecStatus('ERROR: '+err.toUpperCase(),'err');
    if(err==='not-allowed'||err==='service-not-allowed'){ micOn=false; updMic(); $('#hint').textContent=location.protocol==='file:'?'MIC NEEDS HTTPS (HOST THE PAGE)':'MIC BLOCKED: '+err.toUpperCase()+' · USE TAP TO TALK / CHECK MIC PERMISSION'; }
    else if(err==='language-not-supported'){ switchLang('NOT SUPPORTED'); }
    else $('#hint').textContent='VOICE ERROR: '+err.toUpperCase();
  };
  r.onend=()=>{ if(wakeRec===r) wakeRec=null; wakeStarting=false;
    clearSpeechTimer();
    if(state==='listening'&&Date.now()>awakeUntil) setState('standby');
    if(!micOn){ setRecStatus('MIC OFF',''); return; }
    if(recPaused||pttRec){ setRecStatus('PAUSED',''); return; }
    noteEmptyEnd(r._err);
    const lived=Date.now()-sessionStart;
    if(r._err==='network'||r._err==='audio-capture') backoff=Math.min(Math.max(backoff*2,2000),15000);
    else if(r._err==='language-not-supported') backoff=200;
    else if(lived<1500) backoff=Math.min(backoff*2,8000);
    else backoff=300;
    const switched=switchedThisSession ? ' · '+currentLang() : '';
    setRecStatus((switchedThisSession?'SWITCHED TO '+currentLang()+' · ':'')+'RESTARTING'+(r._err&&r._err!=='no-speech'&&r._err!=='aborted'?' ('+r._err+')':'')+' · '+(backoff/1000).toFixed(1)+'s'+switched, (switchedThisSession|| (r._err&&!/no-speech|aborted/.test(r._err)))?'warn':'warn');
    scheduleWake(backoff);
  };
  wakeRec=r; wakeStarting=true; setRecStatus('STARTING · '+r.lang,'warn');
  try{ r.start(); }catch(e){ wakeRec=null; wakeStarting=false; setRecStatus('START FAILED: '+(e.name||e),'err'); scheduleWake(1000); }
}
function stopWake(){ clearTimeout(restartTimer); clearSpeechTimer(); const r=wakeRec; wakeRec=null; wakeStarting=false; if(r){ try{ r.abort(); }catch(e){} } }
function pauseRec(p){ recPaused=p; if(p) stopWake(); else if(micOn) scheduleWake(250); }

/* tap to talk: one-shot recognition, runs the command directly, no wake word needed */
function startPTT(){
  if(!SR){ setRecStatus('VOICE NEEDS CHROME / EDGE','err'); return; }
  if(pttRec) return;
  if('speechSynthesis' in window) speechSynthesis.cancel(); clearTimeout(sayGuard);
  stopWake();
  resetSessionFlags();
  const r=new SR(); r.lang=currentLang(); r.continuous=false; r.interimResults=true; r.maxAlternatives=3;
  let best='', done=false;
  r.onstart=()=>{ setRecStatus('TAP-TO-TALK · LISTENING · '+r.lang,'ok'); setState('listening','SPEAK NOW, SIR'); };
  r.onaudiostart=()=>{ sessionHadAudio=true; setRecStatus('TAP-TO-TALK · LISTENING · '+r.lang+' · AUDIO','ok'); };
  r.onspeechstart=()=>armSpeechTimeout();
  r.onresult=e=>{ noteResult(); for(let i=e.resultIndex;i<e.results.length;i++){ const t=e.results[i][0].transcript; best=t; hearing(t,e.results[i].isFinal); $('#heard').textContent=t; if(e.results[i].isFinal&&!done){ done=true; runCmd(t); } } };
  r.onerror=e=>{ const err=e.error||'unknown'; r._err=err; if(err==='aborted') return; setRecStatus('TAP-TO-TALK ERROR: '+err.toUpperCase(),'err');
    if(err==='language-not-supported') switchLang('NOT SUPPORTED');
    if(err==='not-allowed'||err==='service-not-allowed') $('#hint').textContent='MIC BLOCKED · CHECK MIC PERMISSION'; };
  r.onend=()=>{ pttRec=null; $('#ptt-btn').classList.remove('on'); clearSpeechTimer();
    noteEmptyEnd(r && r._err);
    if(!done&&best){ done=true; runCmd(best); } else if(!done&&state==='listening') setState('standby');
    if(!recPaused&&micOn) scheduleWake(400); else if(!micOn) setRecStatus('MIC OFF','');
    if(switchedThisSession) setRecStatus('SWITCHED TO '+currentLang()+' · SAY AGAIN OR TAP TO TALK','warn');
  };
  pttRec=r; $('#ptt-btn').classList.add('on'); hearing('…');
  try{ r.start(); }catch(e){ pttRec=null; $('#ptt-btn').classList.remove('on'); setRecStatus('TAP-TO-TALK FAILED: '+(e.name||e),'err'); }
}
function stopPTT(){ if(pttRec){ try{ pttRec.stop(); }catch(e){} } }

async function askMic(){ return startMeter(); }
function updMic(){ const b=$('#mic-btn'); b.textContent='🎙 MIC: '+(micOn?'ON':'OFF'); b.classList.toggle('on',micOn); if(state==='standby') setState('standby'); }
function toggleMic(on){
  micOn = on ?? !micOn;
  if(!SR){ micOn=false; updMic(); $('#hint').textContent='VOICE NEEDS CHROME / EDGE'; setRecStatus('SPEECH RECOGNITION NOT AVAILABLE IN THIS BROWSER','err'); return; }
  updMic();
  if(micOn){ backoff=300; if(recPaused) setRecStatus('MIC ON · WAITING FOR JARVIS TO FINISH SPEAKING','warn'); startWake(); } else { stopWake(); setRecStatus('MIC OFF',''); }
}
setInterval(()=>{ if(state==='listening'&&!pttRec&&Date.now()>awakeUntil) setState('standby'); },1000);

/* ---------- wiring ---------- */
$('#start-btn').onclick=async()=>{
  $('#overlay').classList.add('gone');
  chime();
  say(`${greetingWord()}, sir. All systems online.`);       // speak inside the click so the browser allows audio
  setRecStatus('REQUESTING MICROPHONE…','warn');
  const ok=await askMic();
  if(ok){ setRecStatus('MIC GRANTED · '+currentLang(),'ok'); toggleMic(true); } else { micOn=false; updMic(); }
  if(!getKey()) askKey('ENTER PASSPHRASE TO CONNECT J.A.R.V.I.S.');
};
$('#mic-btn').onclick=async()=>{ if(!micOn&&!(await askMic())) return; toggleMic(); };
$('#ptt-btn').onclick=()=>{ pttRec?stopPTT():startPTT(); };
$('#brief-btn').onclick=()=>handleCommand('brief me');
$('#typed').addEventListener('keydown',e=>{ if(e.key==='Enter'){ handleCommand(e.target.value); e.target.value=''; } });
$('#copy-btn').onclick=async e=>{ const t=e.target.dataset.cmd||''; try{ await navigator.clipboard.writeText(t); }catch(_){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } e.target.textContent='✓ COPIED'; setTimeout(()=>e.target.textContent='⧉ COPY TO CHAT',2500); };
$('#lock-btn').onclick=()=>{ if(getKey()){ setKey(''); history=[]; setOffline(true,'LOCKED'); say('Locked, sir. Passphrase cleared from this device.'); } else askKey('ENTER PASSPHRASE TO CONNECT J.A.R.V.I.S.'); };
updLock();
const spaceOK=()=>document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='SELECT'&&$('#overlay').classList.contains('gone')&&$('#key-modal').classList.contains('hidden');
document.addEventListener('keydown',e=>{ if(e.code==='Space'&&spaceOK()){ e.preventDefault(); if(!e.repeat) startPTT(); } });
document.addEventListener('keyup',e=>{ if(e.code==='Space'&&spaceOK()){ e.preventDefault(); stopPTT(); } });
if($('#lang-sel')) $('#lang-sel').addEventListener('change',e=>setLang(e.target.value,true));
updateLangSel();
if(!SR){ setRecStatus('SPEECH RECOGNITION NOT AVAILABLE · USE CHROME / EDGE','err'); }
tick(); setInterval(tick,1000); render(); loadData(); setInterval(loadData,60000);
resize(); requestAnimationFrame(draw);
