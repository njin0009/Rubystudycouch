const INTEGRITY={"total":719,"idMin":1,"idMax":719,"categories":{"Migration & Innovation":30,"Cloud Technology & Services":236,"Security & Compliance":195,"Cloud Concepts":174,"Billing & Pricing":84},"multiCount":86,"allIds":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,457,458,459,460,461,462,463,464,465,466,467,468,469,470,471,472,473,474,475,476,477,478,479,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,495,496,497,498,499,500,501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,519,520,521,522,523,524,525,526,527,528,529,530,531,532,533,534,535,536,537,538,539,540,541,542,543,544,545,546,547,548,549,550,551,552,553,554,555,556,557,558,559,560,561,562,563,564,565,566,567,568,569,570,571,572,573,574,575,576,577,578,579,580,581,582,583,584,585,586,587,588,589,590,591,592,593,594,595,596,597,598,599,600,601,602,603,604,605,606,607,608,609,610,611,612,613,614,615,616,617,618,619,620,621,622,623,624,625,626,627,628,629,630,631,632,633,634,635,636,637,638,639,640,641,642,643,644,645,646,647,648,649,650,651,652,653,654,655,656,657,658,659,660,661,662,663,664,665,666,667,668,669,670,671,672,673,674,675,676,677,678,679,680,681,682,683,684,685,686,687,688,689,690,691,692,693,694,695,696,697,698,699,700,701,702,703,704,705,706,707,708,709,710,711,712,713,714,715,716,717,718,719]};

const CATS=[
  {key:'Cloud Concepts',lbl:'Cloud Concepts',cls:'cc',color:'#1d4ed8'},
  {key:'Security & Compliance',lbl:'Security & Compliance',cls:'sc',color:'#b91c1c'},
  {key:'Cloud Technology & Services',lbl:'Tech & Services',cls:'ct',color:'#065f46'},
  {key:'Billing & Pricing',lbl:'Billing & Pricing',cls:'bp',color:'#92400e'},
  {key:'Migration & Innovation',lbl:'Migration',cls:'mi',color:'#6d28d9'},
];
function getCat(k){return CATS.find(c=>c.key===k)||{lbl:k,cls:'cc',color:'#1d4ed8'};}

function correctKeys(q){return Array.isArray(q.correct)?q.correct:String(q.correct).split('');}
function correctText(q){return correctKeys(q).join('');}
function keysMatch(a,b){return [...a].sort().join('')===[...b].sort().join('');}
function questionType(q){
  if(q.multi||correctKeys(q).length>1)return 'multi';
  const vals=Object.values(q.options||{}).map(v=>String(v).trim().toLowerCase());
  const tf=vals.length===2&&vals.some(v=>v==='true'||v==='yes')&&vals.some(v=>v==='false'||v==='no');
  return tf?'tf':'single';
}
function questionTypeLabel(q){return questionType(q)==='multi'?'Multi Select':'Single Choice';}
function filterByType(pool,type){return !type||type==='all'?pool:pool.filter(q=>questionType(q)===type);}

let S={
  mode:'random',count:10,cat:'all',type:'all',reviewType:'all',bmType:'all',reviewPeriod:'all',bmPeriod:'all',
  qs:[],idx:0,ans:{},
  sessionWrongIds:[],
  wrongMap:{},
  bmMap:{},markMap:{},correctMap:{},
  comments:{},        // { qid: 'user note text' }
  totalDone:0,totalRight:0,
  checkinDates:[],
  dailyCount:{},dailyCatCount:{},
  calMonthOffset:0,
  currentScreen:'home-screen',
  timer:{mode:'countdown',elapsed:0,remaining:5400,running:false,lastTick:null},
};
const BASE_STORAGE_KEY='clf_en3';
const PROFILE_INDEX_KEY='clf_profiles';
const ACTIVE_PROFILE_KEY='clf_active_profile';
let activeProfile=localStorage.getItem(ACTIVE_PROFILE_KEY)||'default';
let pdfDoc=null,pdfPage=1,pdfTask=null,weekOff=0;

/* ── PERSIST ── */
function profileKey(id=activeProfile){return id==='default'?BASE_STORAGE_KEY:`${BASE_STORAGE_KEY}:profile:${id}`;}
function getProfiles(){
  try{
    const profiles=JSON.parse(localStorage.getItem(PROFILE_INDEX_KEY)||'null')||[{id:'default',name:'Default'}];
    if(!profiles.some(p=>p.id==='default'))profiles.unshift({id:'default',name:'Default'});
    return profiles;
  }catch(e){return [{id:'default',name:'Default'}];}
}
function setProfiles(profiles){localStorage.setItem(PROFILE_INDEX_KEY,JSON.stringify(profiles));}
function makeDataPackage(){
  return {
    version:2,app:'CLF-C02 StudyCoach',exportedAt:new Date().toISOString(),profileId:activeProfile,
    data:{
      wrongMap:S.wrongMap,bmMap:S.bmMap,markMap:S.markMap,correctMap:S.correctMap,comments:S.comments,
      totalDone:S.totalDone,totalRight:S.totalRight,checkinDates:S.checkinDates,
      dailyCount:S.dailyCount,dailyCatCount:S.dailyCatCount,
      currentScreen:S.currentScreen,
      activeSession:{
        questionIds:(S.qs||[]).map(q=>q.id),
        idx:S.idx||0,
        ans:S.ans||{},
        sessionWrongIds:S.sessionWrongIds||[],
        multiPending:S.multiPending||[],
        timer:S.timer||null,
      },
    }
  };
}
function applyDataPackage(pkg){
  const d=pkg&&pkg.data?pkg.data:pkg;
  if(!d||typeof d!=='object')throw new Error('Invalid backup file');
  S.wrongMap=d.wrongMap||{};S.bmMap=d.bmMap||{};S.markMap=d.markMap||{};S.correctMap=d.correctMap||{};S.comments=d.comments||{};
  S.totalDone=d.totalDone||0;S.totalRight=d.totalRight||0;
  S.checkinDates=d.checkinDates||[];
  S.dailyCount=d.dailyCount||{};S.dailyCatCount=d.dailyCatCount||{};
  S.currentScreen=d.currentScreen||'home-screen';
  if(d.activeSession&&Array.isArray(d.activeSession.questionIds)&&d.activeSession.questionIds.length){
    const byId=new Map(ALL_QUESTIONS.map(q=>[q.id,q]));
    S.qs=d.activeSession.questionIds.map(id=>byId.get(id)).filter(Boolean);
    S.idx=Math.min(d.activeSession.idx||0,Math.max(0,S.qs.length-1));
    S.ans=d.activeSession.ans||{};
    S.sessionWrongIds=d.activeSession.sessionWrongIds||[];
    S.multiPending=d.activeSession.multiPending||[];
    S.timer={mode:'countdown',elapsed:0,remaining:5400,running:false,lastTick:null,...(d.activeSession.timer||{})};
    if(S.timer.running)S.timer.lastTick=Date.now();
  }
}
function save(){
  try{localStorage.setItem(profileKey(),JSON.stringify(makeDataPackage().data));}catch(e){}
}
function hasStudyData(d){
  if(!d)return false;
  return (d.totalDone||0)>0||
    Object.keys(d.wrongMap||{}).length>0||
    Object.keys(d.bmMap||{}).length>0||
    Object.keys(d.markMap||{}).length>0||
    Object.keys(d.correctMap||{}).length>0||
    Object.keys(d.comments||{}).length>0||
    (d.checkinDates||[]).length>0;
}
function mergeMap(target,source){
  for(const[k,v]of Object.entries(source||{}))target[k]=v;
}
function mergeCountMap(target,source){
  for(const[k,v]of Object.entries(source||{}))target[k]=Math.max(target[k]||0,v||0);
}
function mergeNestedCountMap(target,source){
  for(const[day,cats]of Object.entries(source||{})){
    if(!target[day])target[day]={};
    for(const[k,v]of Object.entries(cats||{}))target[day][k]=Math.max(target[day][k]||0,v||0);
  }
}
function mergeCloudData(d){
  if(!hasStudyData(d))return false;
  mergeMap(S.correctMap,d.correctMap);
  mergeMap(S.wrongMap,d.wrongMap);
  for(const qid of Object.keys(S.correctMap||{})){
    if(d.correctMap&&d.correctMap[qid]&&S.wrongMap[qid]&&d.wrongMap&&!d.wrongMap[qid])delete S.wrongMap[qid];
  }
  mergeMap(S.bmMap,d.bmMap);
  mergeMap(S.markMap,d.markMap);
  mergeMap(S.comments,d.comments);
  S.totalDone=Math.max(S.totalDone||0,d.totalDone||0);
  S.totalRight=Math.max(S.totalRight||0,d.totalRight||0);
  S.checkinDates=Array.from(new Set([...(S.checkinDates||[]),...(d.checkinDates||[])])).sort();
  mergeCountMap(S.dailyCount,d.dailyCount);
  mergeNestedCountMap(S.dailyCatCount,d.dailyCatCount);
  save();
  return true;
}
function load(){
  try{
    let raw=localStorage.getItem(profileKey());
    if(!raw&&activeProfile!=='default')raw=localStorage.getItem(BASE_STORAGE_KEY);
    if(raw){applyDataPackage(JSON.parse(raw));return;}
    const old=JSON.parse(localStorage.getItem('clf_en2')||'null');
    if(old){
      const t=today();
      S.wrongMap={};(old.wrongIds||[]).forEach(id=>{S.wrongMap[id]=t;});
      S.bmMap={};(old.bmIds||[]).forEach(id=>{S.bmMap[id]=t;});
      S.markMap={};S.correctMap={};
      S.totalDone=old.totalDone||0;S.totalRight=old.totalRight||0;
      S.checkinDates=old.checkinDates||[];
      S.dailyCount=old.dailyCount||{};S.dailyCatCount=old.dailyCatCount||{};
      save();
    }
  }catch(e){toast('Could not load profile data');}
}
function renderProfiles(){
  const sel=document.getElementById('profile-select');if(!sel)return;
  const profiles=getProfiles();
  sel.innerHTML=profiles.map(p=>`<option value="${p.id}" ${p.id===activeProfile?'selected':''}>${p.name}</option>`).join('');
  const note=document.getElementById('profile-note');
  if(note)note.textContent=`Active profile: ${profiles.find(p=>p.id===activeProfile)?.name||activeProfile}. Data is stored locally in this browser.`;
}
function switchProfile(id){
  save();activeProfile=id;localStorage.setItem(ACTIVE_PROFILE_KEY,id);resetSessionState();load();updateStats();renderCheckin();renderProfiles();renderProfiles();toast('Profile loaded');
}
function createProfile(){
  const name=prompt('Profile name');
  if(!name||!name.trim())return;
  const id='p_'+Date.now();
  const profiles=getProfiles();profiles.push({id,name:name.trim()});setProfiles(profiles);
  activeProfile=id;localStorage.setItem(ACTIVE_PROFILE_KEY,id);resetStudyData(false);save();updateStats();renderCheckin();renderProfiles();toast('New profile created');
}
function exportProfile(){
  const profiles=getProfiles();const name=(profiles.find(p=>p.id===activeProfile)?.name||activeProfile).replace(/[^a-z0-9_-]+/gi,'_');
  const blob=new Blob([JSON.stringify(makeDataPackage(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`clf-c02-${name}-backup.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup exported');
}
function importProfile(input){
  const file=input.files&&input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const pkg=JSON.parse(reader.result);
      applyDataPackage(pkg);save();updateStats();renderCheckin();renderProfiles();toast('Backup imported');
    }catch(e){toast('Invalid backup file');}
    input.value='';
  };
  reader.readAsText(file);
}
function resetStudyData(preserveProfile=true){
  S.wrongMap={};S.bmMap={};S.markMap={};S.correctMap={};S.comments={};
  S.totalDone=0;S.totalRight=0;S.checkinDates=[];S.dailyCount={};S.dailyCatCount={};
  S.qs=[];S.idx=0;S.ans={};S.sessionWrongIds=[];S.multiPending=[];S.currentScreen='home-screen';
  window.dispatchEvent(new CustomEvent('studycouch:quiz-state',{detail:false}));
  resetTimer(false);
  if(preserveProfile)save();
}
function resetSessionState(){S.qs=[];S.idx=0;S.ans={};S.sessionWrongIds=[];S.multiPending=[];}

/* ── DATE ── */
function ds(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function today(){return ds(new Date());}
function weekStart(ref){const d=new Date(ref);const day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));d.setHours(0,0,0,0);return d;}
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── CHECK-IN ── */
function streak(){
  if(!S.checkinDates.length)return 0;
  const sorted=[...new Set(S.checkinDates)].sort().reverse();
  let s=0,cur=new Date();cur.setHours(0,0,0,0);
  for(const x of sorted){const d=new Date(x);d.setHours(0,0,0,0);const diff=Math.round((cur-d)/864e5);if(diff<=1){s++;cur=d;}else break;}
  return s;
}
function shiftMonth(delta){
  S.calMonthOffset+=delta;
  // Clamp: don't go past current month in the future
  if(S.calMonthOffset>0)S.calMonthOffset=0;
  renderCheckin();
}
function renderCheckin(){
  const now=new Date();
  const refDate=new Date(now.getFullYear(),now.getMonth()+S.calMonthOffset,1);
  const yr=refDate.getFullYear(),mo=refDate.getMonth();
  const td=today(),checkedToday=S.checkinDates.includes(td),str=streak();
  const totalCheckins=S.checkinDates.length;

  // This month count
  const moStr=yr+'-'+String(mo+1).padStart(2,'0');
  const thisMonthCount=S.checkinDates.filter(d=>d.startsWith(moStr)).length;

  document.getElementById('streak-num').textContent=str;
  const btn=document.getElementById('ci-btn');
  btn.textContent=checkedToday?'Checked In ✓':'Check In Today';
  btn.className='ci-btn'+(checkedToday?' done-state':'');
  document.getElementById('ci-hint').textContent=checkedToday?'Click a checked day to undo':'';
  document.getElementById('ci-meta').textContent=`Total check-ins: ${totalCheckins} · ${MONTH_NAMES[mo]}: ${thisMonthCount}`;
  document.getElementById('ci-month-lbl').textContent=`${SHORT_MONTHS[mo]} ${yr}`;

  // Calendar grid — starts on Monday
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const firstDay=new Date(yr,mo,1).getDay(); // 0=Sun
  const startOffset=firstDay===0?6:firstDay-1; // blank cells before day 1
  const grid=document.getElementById('cal-grid');grid.innerHTML='';

  // blank cells
  for(let i=0;i<startOffset;i++){const el=document.createElement('div');el.className='cal-day empty';grid.appendChild(el);}

  const todayDate=new Date();todayDate.setHours(0,0,0,0);

  for(let day=1;day<=daysInMonth;day++){
    const dstr=yr+'-'+String(mo+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    const cellDate=new Date(yr,mo,day);cellDate.setHours(0,0,0,0);
    const isDone=S.checkinDates.includes(dstr);
    const isToday=dstr===td;
    const isFuture=cellDate>todayDate;
    const el=document.createElement('div');
    let cls='cal-day';
    if(isDone)cls+=' done';
    if(isToday)cls+=' today';
    if(isFuture)cls+=' future';
    if(isDone&&!isFuture)cls+=' clickable';
    el.className=cls;
    el.innerHTML=`<span class="cal-day-num">${day}</span><span class="cal-day-dot">${isDone?'✓':''}</span>`;
    el.title=isDone?`${dstr} ✓ (click to remove)`:dstr;
    if(isDone&&!isFuture)el.onclick=()=>cancelCheckin(dstr);
    grid.appendChild(el);
  }
}
function doCheckin(){
  const t=today();
  if(S.checkinDates.includes(t)){cancelCheckin(t);return;}
  S.checkinDates.push(t);save();renderCheckin();toast('🎉 Checked in! Keep the streak going!');
  syncCheckin(t,true);
}
function cancelCheckin(d){
  if(!confirm(`Remove check-in for ${d}?`))return;
  S.checkinDates=S.checkinDates.filter(x=>x!==d);save();renderCheckin();toast('Check-in removed');
  syncCheckin(d,false);
}

/* ── TIMER ── */
let timerInterval=null;
function resetTimer(persist=true){
  S.timer={mode:'countdown',elapsed:0,remaining:5400,running:false,lastTick:null};
  if(persist)save();
  renderTimer();
}
function formatTime(seconds){
  const s=Math.max(0,Math.floor(seconds||0));
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`;
}
function tickTimer(){
  if(!S.timer)resetTimer(false);
  if(!S.timer.running){renderTimer();return;}
  const now=Date.now();
  const last=S.timer.lastTick||now;
  const delta=Math.max(0,Math.floor((now-last)/1000));
  if(delta>0){
    S.timer.elapsed=(S.timer.elapsed||0)+delta;
    if(S.timer.mode==='countdown')S.timer.remaining=Math.max(0,(S.timer.remaining||5400)-delta);
    S.timer.lastTick=now;
    if(S.timer.mode==='countdown'&&S.timer.remaining<=0){
      S.timer.running=false;
      toast('Time is up');
      save();
    }
  }
  renderTimer();
}
function clampTimerPart(value,max){
  const n=parseInt(String(value).replace(/\D/g,''),10);
  if(Number.isNaN(n))return 0;
  return Math.max(0,Math.min(max,n));
}
function setTimerFromInputs(){
  if(!S.timer)resetTimer(false);
  const h=clampTimerPart(document.getElementById('timer-hours')?.value,99);
  const m=clampTimerPart(document.getElementById('timer-minutes')?.value,59);
  const s=clampTimerPart(document.getElementById('timer-seconds')?.value,59);
  const total=h*3600+m*60+s;
  if(S.timer.mode==='countdown'){
    S.timer.remaining=total;
  }else{
    S.timer.elapsed=total;
  }
  S.timer.lastTick=Date.now();
  save();
  renderTimer();
}
function ensureTimerWidget(){
  const side=document.querySelector('.quiz-side');
  const grid=document.getElementById('quiz-side-grid');
  if(!side||!grid)return;
  let widget=document.getElementById('exam-timer-widget');
  if(widget){
    if(!side.contains(widget))grid.insertAdjacentElement('afterend',widget);
    return;
  }
  widget=document.createElement('div');
  widget.id='exam-timer-widget';
  widget.className='exam-timer-widget';
  widget.innerHTML=`
    <div class="timer-head"><span class="timer-head-icon">◷</span><span>Exam Timer</span></div>
    <div class="timer-area">
      <input class="timer-box" id="timer-hours" type="number" min="0" max="99" inputmode="numeric" aria-label="Timer hours" onchange="setTimerFromInputs()" onblur="setTimerFromInputs()" />
      <span class="timer-sep">:</span>
      <input class="timer-box" id="timer-minutes" type="number" min="0" max="59" inputmode="numeric" aria-label="Timer minutes" onchange="setTimerFromInputs()" onblur="setTimerFromInputs()" />
      <span class="timer-sep">:</span>
      <input class="timer-box" id="timer-seconds" type="number" min="0" max="59" inputmode="numeric" aria-label="Timer seconds" onchange="setTimerFromInputs()" onblur="setTimerFromInputs()" />
    </div>
    <div class="timer-controls">
      <button class="timer-chip primary" id="timer-run-btn" onclick="toggleTimerRun()">Start</button>
      <button class="timer-chip" id="timer-mode-btn" onclick="toggleTimerMode()">Count up</button>
      <button class="timer-chip" onclick="focusCurrentNote()">Notes</button>
      <button class="timer-chip icon-only" onclick="resetTimer()" title="Reset timer">↻</button>
    </div>`;
  grid.insertAdjacentElement('afterend',widget);
}
function renderTimer(){
  ensureTimerWidget();
  if(!S.timer)resetTimer(false);
  const hEl=document.getElementById('timer-hours');
  const mEl=document.getElementById('timer-minutes');
  const sEl=document.getElementById('timer-seconds');
  const modeBtn=document.getElementById('timer-mode-btn');
  const runBtn=document.getElementById('timer-run-btn');
  if(!hEl||!mEl||!sEl||!modeBtn||!runBtn)return;
  if(document.activeElement===hEl||document.activeElement===mEl||document.activeElement===sEl)return;
  const raw=Math.max(0,Math.floor(S.timer.mode==='countdown'?S.timer.remaining:S.timer.elapsed));
  hEl.value=String(Math.floor(raw/3600)).padStart(2,'0');
  mEl.value=String(Math.floor((raw%3600)/60)).padStart(2,'0');
  sEl.value=String(raw%60).padStart(2,'0');
  modeBtn.textContent=S.timer.mode==='countdown'?'Countdown':'Count up';
  runBtn.textContent=S.timer.running?'Pause':'Start';
  runBtn.classList.toggle('paused',!S.timer.running);
}
function toggleTimerMode(){
  if(!S.timer)resetTimer(false);
  S.timer.mode=S.timer.mode==='countdown'?'countup':'countdown';
  S.timer.lastTick=Date.now();
  save();renderTimer();
}
function toggleTimerRun(){
  if(!S.timer)resetTimer(false);
  S.timer.running=!S.timer.running;
  S.timer.lastTick=Date.now();
  save();renderTimer();
}
function focusCurrentNote(){
  const section=document.getElementById('comment-section');
  if(section&&section.style.display==='none')toast('Submit an answer first, then add notes');
  section?.scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('comment-textarea')?.focus();
}
function startTimerLoop(){
  if(timerInterval)return;
  timerInterval=setInterval(tickTimer,1000);
}

/* ── NAV ── */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  S.currentScreen=id;
  save();
  const nav=document.getElementById('top-nav');
  if(nav)nav.style.display='none';
  window.dispatchEvent(new CustomEvent('studycouch:screen-change',{detail:id}));
  if(id==='quiz-screen')renderTimer();
  // highlight active
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.remove('active-link'));
  const map={
    'progress-screen':1,'review-screen':2,'bookmarks-screen':3,'check-screen':4
  };
  const links=document.querySelectorAll('.nav-links .nav-link');
  if(map[id])links[map[id]-1].classList.add('active-link');
}
function goHome(){updateStats();renderCheckin();renderProfiles();renderResumeBtn();showScreen('home-screen');}
function renderResumeBtn(){
  var inProgress=S.qs&&S.qs.length&&Object.keys(S.ans||{}).length<S.qs.length;
  var btn=document.getElementById('continue-quiz-btn');
  if(inProgress){
    if(!btn){
      btn=document.createElement('button');
      btn.id='continue-quiz-btn';
      btn.className='start-btn';
      btn.style.marginBottom='.5rem';
      var anchor=document.querySelector('#home-screen .start-btn');
      if(anchor)anchor.insertAdjacentElement('beforebegin',btn);
      showResumePopup();
    }
    btn.onclick=function(){
      var banner=document.getElementById('resume-quiz-banner');
      if(banner)banner.remove();
      showScreen('quiz-screen');renderQ();
    };
    btn.textContent='↩ Resume Quiz — Q'+(S.idx+1)+' / '+S.qs.length;
  }else{
    if(btn)btn.remove();
    var old=document.getElementById('resume-quiz-banner');
    if(old)old.remove();
  }
}
function showResumePopup(){
  var existing=document.getElementById('resume-quiz-banner');
  if(existing)existing.remove();
  var remaining=S.qs.length-Object.keys(S.ans||{}).length;
  var banner=document.createElement('div');
  banner.id='resume-quiz-banner';
  banner.innerHTML='<div class="rqb-icon">📝</div>'
    +'<div class="rqb-text">'
    +'<div class="rqb-title">Quiz in progress</div>'
    +'<div class="rqb-sub">Q'+(S.idx+1)+' / '+S.qs.length+' · '+remaining+' question'+(remaining!==1?'s':'')+' remaining</div>'
    +'</div>'
    +'<button class="rqb-btn" id="resume-banner-btn">↩ Resume</button>'
    +'<button class="rqb-close" id="dismiss-banner-btn" title="Dismiss">✕</button>';
  document.body.appendChild(banner);
  document.getElementById('resume-banner-btn').onclick=function(){
    banner.remove();showScreen('quiz-screen');renderQ();
  };
  document.getElementById('dismiss-banner-btn').onclick=function(){banner.remove();};
  setTimeout(function(){if(banner.parentNode)banner.remove();},7000);
}
window.goQuiz=function(){if(S.qs&&S.qs.length&&Object.keys(S.ans||{}).length<S.qs.length){showScreen('quiz-screen');renderQ();}};
function updateStats(){
  const mastered=Object.keys(S.correctMap||{}).length;
  const remaining=Math.max(0,INTEGRITY.total-mastered);
  const days=remaining===0?0:Math.ceil(remaining/Math.max(1,S.count||10));
  document.getElementById('stat-done').textContent=S.totalDone;
  document.getElementById('stat-wrong').textContent=Object.keys(S.wrongMap).length;
  document.getElementById('stat-bm').textContent=Object.keys(S.bmMap).length;
  document.getElementById('stat-acc').textContent=S.totalDone>0?Math.round(S.totalRight/S.totalDone*100)+'%':'—';
  document.getElementById('stat-remaining').textContent=remaining;
  document.getElementById('stat-days').textContent=days;
}
function toggleMenu(){const m=document.getElementById('nav-menu');if(m)m.classList.toggle('open');}
document.addEventListener('click',e=>{const m=document.getElementById('nav-menu');if(!m)return;if(m.classList.contains('open')&&!m.contains(e.target)&&!e.target.closest('.nav-hamburger'))m.classList.remove('open');});

/* ── CONFIG ── */
function selectMode(btn){document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');S.mode=btn.dataset.mode;document.getElementById('cat-row').style.display=S.mode==='category'?'flex':'none';}
function selectCount(btn){document.querySelectorAll('.count-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');S.count=parseInt(btn.dataset.n);updateStats();}
function selectCat(btn){document.querySelectorAll('#cat-chips .cat-chip').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');S.cat=btn.dataset.cat;}
function selectType(btn){document.querySelectorAll('#type-chips .cat-chip').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');S.type=btn.dataset.type;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ── SESSION ── */
function startSession(){
  let pool=[...ALL_QUESTIONS];
  if(S.mode==='wrong'){
    const ids=Object.keys(S.wrongMap).map(Number);
    pool=ALL_QUESTIONS.filter(q=>ids.includes(q.id));
    if(!pool.length){toast('No mistakes yet — keep practicing!');return;}
  }
  else if(S.mode==='bookmark'){
    const ids=Object.keys(S.bmMap).map(Number);
    pool=ALL_QUESTIONS.filter(q=>ids.includes(q.id));
    if(!pool.length){toast('Nothing saved yet — star questions while studying');return;}
  }
  else if(S.mode==='category'&&S.cat!=='all')pool=ALL_QUESTIONS.filter(q=>q.category===S.cat);
  pool=filterByType(pool,S.type);
  if(!pool.length){toast('No questions match this type filter');return;}
  shuffle(pool);
  S.qs=pool.slice(0,Math.min(S.count,pool.length));S.idx=0;S.ans={};S.sessionWrongIds=[];S.multiPending=[];
  resetTimer(false);
  S.timer.running=true;S.timer.lastTick=Date.now();
  save();
  window.dispatchEvent(new CustomEvent('studycouch:quiz-state',{detail:true}));
  showScreen('quiz-screen');renderQ();
}

/* ── QUIZ ── */
function curQ(){return S.qs[S.idx];}
function renderQ(){
  const q=curQ(),total=S.qs.length,i=S.idx,answered=S.ans[q.id];
  renderTimer();
  document.getElementById('prog-txt').textContent=`Q ${i+1} / ${total}`;
  document.getElementById('prog-fill').style.width=(i/total*100)+'%';
  const right=Object.values(S.ans).filter(a=>a.ok).length,done=Object.keys(S.ans).length;
  document.getElementById('acc-txt').textContent=done>0?`✓ ${Math.round(right/done*100)}%`:'';
  const bm=document.getElementById('bookmark-btn');
  bm.textContent=S.bmMap[q.id]?'Saved':'Save';bm.classList.toggle('active',!!S.bmMap[q.id]);
  const im=document.getElementById('important-btn');
  im.textContent=S.markMap[q.id]?'Marked':'Mark';
  im.classList.toggle('mark-active',!!S.markMap[q.id]);
  const inlineBm=document.getElementById('inline-bookmark-btn');
  inlineBm.querySelector('.q-action-main').textContent=S.bmMap[q.id]?'Saved Question':'Save Question';
  inlineBm.querySelector('.q-action-sub').textContent=S.bmMap[q.id]?'Available in Saved':'Send to Saved';
  inlineBm.classList.toggle('saved',!!S.bmMap[q.id]);
  const inlineIm=document.getElementById('inline-important-btn');
  inlineIm.querySelector('.q-action-main').textContent=S.markMap[q.id]?'Marked Important':'Mark Important';
  inlineIm.querySelector('.q-action-sub').textContent=S.markMap[q.id]?'Shown in progress':'Flag for review';
  inlineIm.classList.toggle('marked',!!S.markMap[q.id]);
  const cat=getCat(q.category);const hasPDF=!!pdfDoc;
  document.getElementById('q-meta').innerHTML=
    `<span class="q-num-badge">#${q.id}</span>`+
    `<span class="${hasPDF?'pdf-badge':'pdf-badge no-pdf'}" onclick="${hasPDF?'openPDFModal()':''}" title="${hasPDF?'View PDF page':'Import PDF first'}">📄 PDF p.${q.id}</span>`+
    `<span class="cat-pill ${cat.cls}">${cat.lbl}</span>`+
    (S.markMap[q.id]?`<span style="font-size:.63rem;background:var(--rose-lt);border:1px solid var(--rose);color:var(--rose);border-radius:6px;padding:.16rem .52rem;font-weight:700;">Marked Important</span>`:'')+
    (S.comments[q.id]?`<span style="font-size:.63rem;background:var(--amber-lt);border:1px solid var(--amber-md);color:var(--amber);border-radius:6px;padding:.16rem .52rem;font-weight:600;">✏️ Note</span>`:'');
  document.getElementById('q-text').textContent=q.question;

  // Multi-select hint
  let metaHtml=document.getElementById('q-meta').innerHTML;
  const multiHintEl=document.getElementById('multi-hint');
  if(multiHintEl)multiHintEl.remove();
  if(q.multi&&!answered){
    const hint=document.createElement('div');
    hint.id='multi-hint';hint.className='multi-hint';
    hint.innerHTML=`☑ Choose ${correctKeys(q).length} answers`;
    document.getElementById('options').before(hint);
  }

  const opts=document.getElementById('options');opts.innerHTML='';
  const submitBtn=document.getElementById('multi-submit-btn');

  if(!q.multi){
    // ── Single select ──
    submitBtn.style.display='none';
    for(const [k,v] of Object.entries(q.options)){
      const d=document.createElement('div');d.className='opt';
      d.innerHTML=`<div class="opt-key">${k}</div><div class="opt-text">${v}</div>`;
      if(answered){
        d.classList.add('revealed');
        if(correctKeys(q).includes(k))d.classList.add('correct');
        else if(k===answered.sel)d.classList.add('wrong');
      }else{d.onclick=()=>pick(k);}
      opts.appendChild(d);
    }
  } else {
    // ── Multi select ──
    const correctSet=new Set(correctKeys(q));
    const pending=S.multiPending||[];
    if(answered){
      submitBtn.style.display='none';
      const selectedSet=new Set((answered.sel||'').split(''));
      for(const [k,v] of Object.entries(q.options)){
        const d=document.createElement('div');d.className='opt revealed';
        const isCorrect=correctSet.has(k);
        const isSelected=selectedSet.has(k);
        if(isCorrect&&isSelected)d.classList.add('multi-correct');
        else if(isCorrect&&!isSelected)d.classList.add('multi-missed');
        else if(!isCorrect&&isSelected)d.classList.add('multi-wrong-sel');
        d.innerHTML=`<div class="opt-key">${isSelected?(isCorrect?'✓':'✗'):(isCorrect?'✓':k)}</div><div class="opt-text">${v}</div>`;
        opts.appendChild(d);
      }
    }else{
      submitBtn.style.display='block';
      submitBtn.disabled=true;
      for(const [k,v] of Object.entries(q.options)){
        const d=document.createElement('div');d.className='opt';
        d.dataset.key=k;
        const sel=pending.includes(k);
        if(sel)d.classList.add('multi-selected');
        d.innerHTML=`<div class="opt-key">${sel?'✓':k}</div><div class="opt-text">${v}</div>`;
        d.onclick=()=>toggleMultiOpt(k);
        opts.appendChild(d);
      }
      updateMultiSubmitBtn();
    }
  }
  const fb=document.getElementById('feedback');fb.className='feedback';
  const pdfLink=document.getElementById('fb-pdf-link');
  if(answered){
    fb.classList.add('show');
    if(answered.ok){
      fb.classList.add('fb-correct');
      document.getElementById('fb-icon').textContent='✅';
      document.getElementById('fb-title').textContent='Correct!';
      document.getElementById('fb-sub').textContent=`Answer: ${correctText(q)}`;
    }else{
      fb.classList.add('fb-wrong');
      document.getElementById('fb-icon').textContent='❌';
      document.getElementById('fb-title').textContent='Incorrect';
      const correctLetters=correctKeys(q).join(', ');
      const correctNames=correctKeys(q).map(k=>`${k}: ${q.options[k]}`).join(' · ');
      document.getElementById('fb-sub').textContent=`Correct: ${correctLetters} — ${correctNames}`;
    }
    pdfLink.style.display=pdfDoc?'inline-flex':'none';
    pdfLink.textContent=`📄 View PDF — page ${q.id}`;
  }else{pdfLink.style.display='none';}
  document.getElementById('prev-btn').style.display=i>0?'block':'none';
  const nb=document.getElementById('next-btn');
  nb.style.display=answered?'block':'none';
  nb.textContent=i===total-1?'See Results →':'Next →';
  renderQuizSide();
  renderComment();
}
function recordDaily(q){
  const d=today();
  S.dailyCount[d]=(S.dailyCount[d]||0)+1;
  if(!S.dailyCatCount[d])S.dailyCatCount[d]={};
  const ck=getCat(q.category).cls;
  S.dailyCatCount[d][ck]=(S.dailyCatCount[d][ck]||0)+1;
}
// ── Single select pick ──
function pick(key){
  const q=curQ();if(S.ans[q.id]||q.multi)return;
  const ok=keysMatch([key],correctKeys(q));
  S.ans[q.id]={sel:key,ok};S.totalDone++;recordDaily(q);
  if(ok){S.totalRight++;S.correctMap[q.id]=today();delete S.wrongMap[q.id];}
  else{S.wrongMap[q.id]=today();S.sessionWrongIds.push(q.id);}
  syncAttempt(q,[key],ok);
  save();renderQ();
  const nb=document.getElementById('next-btn');nb.classList.add('pop');setTimeout(()=>nb.classList.remove('pop'),200);
}

function syncAttempt(q,selectedAnswers,ok){
  if(!window.StudyCouchSync||typeof window.StudyCouchSync.recordAttempt!=='function')return;
  window.StudyCouchSync.recordAttempt({
    questionId:q.id,
    selectedAnswers:selectedAnswers,
    correctAnswers:correctKeys(q),
    isCorrect:ok,
    category:q.category,
    isMultiSelect:questionType(q)==='multi'
  }).then(res=>{
    if(!res.ok)console.warn('StudyCouch sync failed:',res.message);
  }).catch(err=>console.warn('StudyCouch sync failed:',err));
}
function syncSavedQuestion(qid,isSaved){
  if(!window.StudyCouchSync||typeof window.StudyCouchSync.recordSavedQuestion!=='function')return;
  window.StudyCouchSync.recordSavedQuestion(qid,isSaved).then(res=>{
    if(!res.ok)console.warn('StudyCouch saved sync failed:',res.message);
  }).catch(err=>console.warn('StudyCouch saved sync failed:',err));
}
function syncImportantQuestion(qid,isImportant){
  if(!window.StudyCouchSync||typeof window.StudyCouchSync.recordImportantQuestion!=='function')return;
  window.StudyCouchSync.recordImportantQuestion(qid,isImportant).then(res=>{
    if(!res.ok)console.warn('StudyCouch important sync failed:',res.message);
  }).catch(err=>console.warn('StudyCouch important sync failed:',err));
}
function syncQuestionNote(qid,note){
  if(!window.StudyCouchSync||typeof window.StudyCouchSync.recordQuestionNote!=='function')return;
  window.StudyCouchSync.recordQuestionNote(qid,note).then(res=>{
    if(!res.ok)console.warn('StudyCouch note sync failed:',res.message);
  }).catch(err=>console.warn('StudyCouch note sync failed:',err));
}
function syncCheckin(date,isCheckedIn){
  if(!window.StudyCouchSync||typeof window.StudyCouchSync.recordCheckin!=='function')return;
  window.StudyCouchSync.recordCheckin(date,isCheckedIn).then(res=>{
    if(!res.ok)console.warn('StudyCouch check-in sync failed:',res.message);
  }).catch(err=>console.warn('StudyCouch check-in sync failed:',err));
}
function syncClearStudyData(){
  if(!window.StudyCouchSync||typeof window.StudyCouchSync.clearStudyData!=='function'){
    return Promise.resolve({ok:true,message:'Cloud sync unavailable.'});
  }
  return window.StudyCouchSync.clearStudyData();
}
function hydrateFromCloud(){
  if(!window.StudyCouchSync||typeof window.StudyCouchSync.loadStudySnapshot!=='function')return;
  window.StudyCouchSync.loadStudySnapshot().then(res=>{
    if(!res.ok){console.warn('StudyCouch cloud load failed:',res.message);return;}
    if(mergeCloudData(res.data)){
      updateStats();renderCheckin();renderProfiles();
      toast('Cloud study progress restored');
    }
  }).catch(err=>console.warn('StudyCouch cloud load failed:',err));
}

// ── Multi-select ──
S.multiPending=[];  // keys selected but not yet submitted

function toggleMultiOpt(key){
  const q=curQ();if(S.ans[q.id])return;
  if(!S.multiPending)S.multiPending=[];
  const idx=S.multiPending.indexOf(key);
  if(idx>=0)S.multiPending.splice(idx,1);
  else S.multiPending.push(key);
  // Re-render options only (no full renderQ to preserve hint)
  for(const el of document.querySelectorAll('#options .opt')){
    const k=el.dataset.key;
    const sel=S.multiPending.includes(k);
    el.className='opt'+(sel?' multi-selected':'');
    el.querySelector('.opt-key').textContent=sel?'✓':k;
  }
  updateMultiSubmitBtn();
}

function updateMultiSubmitBtn(){
  const q=curQ();if(!q.multi)return;
  const btn=document.getElementById('multi-submit-btn');
  const need=correctKeys(q).length;
  const have=(S.multiPending||[]).length;
  btn.disabled=have!==need;
  btn.textContent=have===0?`Select ${need} answers`:have<need?`Select ${need-have} more (${have}/${need} chosen)`:`Submit ${have} answers`;
}

function submitMulti(){
  const q=curQ();if(!q.multi||S.ans[q.id])return;
  const selected=[...(S.multiPending||[])].sort();
  const sel=selected.join('');
  const ok=keysMatch(S.multiPending||[],correctKeys(q));
  S.ans[q.id]={sel,ok};S.totalDone++;recordDaily(q);
  if(ok){S.totalRight++;S.correctMap[q.id]=today();delete S.wrongMap[q.id];}
  else{S.wrongMap[q.id]=today();S.sessionWrongIds.push(q.id);}
  syncAttempt(q,selected,ok);
  S.multiPending=[];
  save();renderQ();
  const nb=document.getElementById('next-btn');nb.classList.add('pop');setTimeout(()=>nb.classList.remove('pop'),200);
}
function toggleBookmark(){
  const q=curQ();
  let isSaved=false;
  if(S.bmMap[q.id]){delete S.bmMap[q.id];toast('Removed from Saved');}
  else{S.bmMap[q.id]=today();isSaved=true;toast('Saved to Saved');}
  syncSavedQuestion(q.id,isSaved);
  save();renderQ();
}
function toggleImportant(){
  const q=curQ();
  let isImportant=false;
  if(S.markMap[q.id]){delete S.markMap[q.id];toast('Removed mark');}
  else{S.markMap[q.id]=today();isImportant=true;toast('Marked important');}
  syncImportantQuestion(q.id,isImportant);
  save();renderQ();
}
function jumpToSessionIndex(idx){
  if(idx<0||idx>=S.qs.length)return;
  S.multiPending=[];S.idx=idx;save();renderQ();
}
function renderQuizSide(){
  const grid=document.getElementById('quiz-side-grid');
  const list=document.getElementById('marked-list');
  if(!grid||!list)return;
  grid.innerHTML=S.qs.map((q,idx)=>{
    const cls=['side-q'];
    if(idx===S.idx)cls.push('current');
    if(S.ans[q.id])cls.push('done');
    if(S.bmMap[q.id])cls.push('saved');
    if(S.markMap[q.id])cls.push('marked');
    return `<button class="${cls.join(' ')}" onclick="jumpToSessionIndex(${idx})">${idx+1}</button>`;
  }).join('');
  const marked=S.qs.map((q,idx)=>({q,idx})).filter(x=>S.markMap[x.q.id]);
  list.innerHTML=marked.length?marked.map(x=>`<button class="marked-item" onclick="jumpToSessionIndex(${x.idx})">#${x.q.id} · Question ${x.idx+1}</button>`).join(''):'<div class="marked-empty">No important questions marked in this session yet.</div>';
}

/* ── COMMENTS ── */
function renderComment(){
  const q=curQ();
  const answered=!!S.ans[q.id];
  const section=document.getElementById('comment-section');
  section.style.display=answered?'block':'none';
  if(!answered)return;
  const existing=S.comments[q.id]||'';
  const ta=document.getElementById('comment-textarea');
  const clearBtn=document.getElementById('comment-clear-btn');
  const badge=document.getElementById('comment-saved-badge');
  ta.value=existing;
  clearBtn.style.display=existing?'block':'none';
  badge.classList.remove('show');
}
function onCommentInput(){
  const q=curQ();
  const ta=document.getElementById('comment-textarea');
  const clearBtn=document.getElementById('comment-clear-btn');
  clearBtn.style.display=ta.value.trim()?'block':'none';
  // auto-save on type with debounce
  clearTimeout(onCommentInput._t);
  onCommentInput._t=setTimeout(()=>{
    const text=ta.value.trim();
    if(text){S.comments[q.id]=text;}else{delete S.comments[q.id];}
    save();
    syncQuestionNote(q.id,text);
    const badge=document.getElementById('comment-saved-badge');
    badge.classList.add('show');
    setTimeout(()=>badge.classList.remove('show'),1500);
  },600);
}
function saveComment(){
  const q=curQ();
  const text=document.getElementById('comment-textarea').value.trim();
  if(text){S.comments[q.id]=text;}else{delete S.comments[q.id];}
  save();
  syncQuestionNote(q.id,text);
  const badge=document.getElementById('comment-saved-badge');
  badge.classList.add('show');
  setTimeout(()=>badge.classList.remove('show'),1500);
  document.getElementById('comment-clear-btn').style.display=text?'block':'none';
}
function clearComment(){
  const q=curQ();
  if(!confirm('Clear note for this question?'))return;
  delete S.comments[q.id];save();
  syncQuestionNote(q.id,'');
  document.getElementById('comment-textarea').value='';
  document.getElementById('comment-clear-btn').style.display='none';
  toast('Note cleared');
}
function prevQ(){if(S.idx>0){S.idx--;S.multiPending=[];save();renderQ();}}
function nextQ(){const q=curQ();if(!S.ans[q.id]){toast('Please submit an answer first');return;}S.multiPending=[];if(S.idx<S.qs.length-1){S.idx++;save();renderQ();}else showResult();}

/* ── RESULT ── */
function showResult(){
  const total=S.qs.length,correct=Object.values(S.ans).filter(a=>a.ok).length;
  const wrong=Object.values(S.ans).filter(a=>!a.ok).length;
  const pct=total>0?Math.round(correct/total*100):0;
  if(S.timer){S.timer.running=false;save();renderTimer();}

  // Auto check-in if not yet done today
  const t=today();
  const alreadyChecked=S.checkinDates.includes(t);
  if(!alreadyChecked){
    S.checkinDates.push(t);save();
  }

  document.getElementById('score-pct').textContent=pct+'%';
  document.getElementById('score-arc').style.strokeDashoffset=2*Math.PI*57*(1-pct/100);
  document.getElementById('result-title').textContent=pct>=80?'Outstanding! 🎉':pct>=60?'Good effort — keep going 📚':'More practice needed 💪';
  document.getElementById('result-sub').textContent=`${total} questions · ${pct}% accuracy`;
  document.getElementById('rs-correct').textContent=correct;
  document.getElementById('rs-wrong').textContent=wrong;

  // Checkin notice
  const ciNotice=document.getElementById('result-checkin-notice');
  ciNotice.textContent=alreadyChecked?'✓ Already checked in today':'🗓️ Auto checked in for today!';
  ciNotice.style.color=alreadyChecked?'var(--ink3)':'var(--teal)';

  // Retry wrong button
  const retryBtn=document.getElementById('result-retry-btn');
  const sessionWrongs=[...new Set(S.sessionWrongIds)];
  if(sessionWrongs.length>0){
    retryBtn.style.display='block';
    retryBtn.textContent=`Retry ${sessionWrongs.length} Mistake${sessionWrongs.length>1?'s':''} →`;
  } else {
    retryBtn.style.display='none';
  }

  window.dispatchEvent(new CustomEvent('studycouch:quiz-state',{detail:false}));
  showScreen('result-screen');
}

function retrySessionWrong(){
  const ids=[...new Set(S.sessionWrongIds)];
  if(!ids.length){toast('No mistakes to retry!');return;}
  const pool=ALL_QUESTIONS.filter(q=>ids.includes(q.id));
  shuffle(pool);
  S.qs=pool;S.idx=0;S.ans={};S.sessionWrongIds=[];
  window.dispatchEvent(new CustomEvent('studycouch:quiz-state',{detail:true}));
  save();showScreen('quiz-screen');renderQ();
  toast(`Retrying ${pool.length} mistakes — shuffled!`);
}

/* ── PROGRESS ── */
function showProgress(){weekOff=0;renderProgress();showScreen('progress-screen');}
function shiftWeek(d){weekOff+=d;if(weekOff>0)weekOff=0;renderProgress();}
function renderProgress(){
  const now=new Date();now.setHours(0,0,0,0);const td=ds(now);
  const ref=new Date(now);ref.setDate(ref.getDate()+weekOff*7);
  const ws=weekStart(ref);const we=new Date(ws);we.setDate(we.getDate()+6);
  const wlbl=weekOff===0?'This Week':weekOff===-1?'Last Week':`${SHORT_MONTHS[ws.getMonth()]} ${ws.getDate()} – ${SHORT_MONTHS[we.getMonth()]} ${we.getDate()}`;
  document.getElementById('week-lbl').textContent=wlbl;
  const nwb=document.getElementById('next-wk-btn');nwb.style.opacity=weekOff===0?'.3':'1';nwb.style.pointerEvents=weekOff===0?'none':'auto';
  const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const days=[];
  for(let i=0;i<7;i++){const d=new Date(ws);d.setDate(ws.getDate()+i);const dstr=ds(d);days.push({dstr,lbl:DAYS[i],count:S.dailyCount[dstr]||0,isToday:dstr===td});}
  const wTotal=days.reduce((s,d)=>s+d.count,0),active=days.filter(d=>d.count>0).length;
  const avg=active>0?(wTotal/active).toFixed(1):0;
  const maxC=Math.max(...days.map(d=>d.count),1);
  const heat=[];for(let i=89;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const dstr=ds(d);heat.push({dstr,count:S.dailyCount[dstr]||0,isToday:dstr===td});}
  const catTot={cc:0,sc:0,ct:0,bp:0,mi:0};
  for(const dc of Object.values(S.dailyCatCount))for(const[k,v]of Object.entries(dc))if(catTot[k]!==undefined)catTot[k]+=v;
  const catSum=Object.values(catTot).reduce((a,b)=>a+b,0)||1;
  document.getElementById('prog-body').innerHTML=`
  <div class="summary-row">
    <div class="s-card"><span class="s-num amber">${wTotal}</span><span class="s-lbl">This Week</span></div>
    <div class="s-card"><span class="s-num teal">${active}</span><span class="s-lbl">Active Days</span></div>
    <div class="s-card"><span class="s-num slate">${avg}</span><span class="s-lbl">Avg / Day</span></div>
    <div class="s-card"><span class="s-num rose">${streak()}</span><span class="s-lbl">Day Streak</span></div>
  </div>
  <div class="chart-card">
    <div class="chart-title">// Daily Questions This Week</div>
    <div class="bar-chart" id="bar-chart"></div>
  </div>
  <div class="heatmap-card">
    <div class="chart-title">// Last 90 Days Activity</div>
    <div class="hm-grid" id="hm-grid"></div>
    <div class="hm-legend">Less <div class="lc l0"></div><div class="lc l1"></div><div class="lc l2"></div><div class="lc l3"></div><div class="lc l4"></div> More</div>
  </div>
  <div class="breakdown-card">
    <div class="chart-title">// Questions by Domain (All Time)</div>
    ${CATS.map(c=>{const cnt=catTot[c.cls]||0;const pct=Math.round(cnt/catSum*100);return `<div class="bd-row"><div class="bd-label" style="color:${c.color}">${c.lbl}</div><div class="bd-bar-wrap"><div class="bd-bar" style="width:${pct}%;background:${c.color}55"></div></div><div class="bd-nums">${cnt} · ${pct}%</div></div>`;}).join('')}
  </div>`;
  const bc=document.getElementById('bar-chart');
  days.forEach(d=>{const pct=d.count/maxC*100;const col=document.createElement('div');col.className='bar-col';col.innerHTML=`<div class="bar-wrap"><div class="${d.count===0?'bar zero-bar':d.isToday?'bar today-bar':'bar'}" style="height:${Math.max(pct,2)}%;width:100%"><span class="bar-val${d.count>0?(d.isToday?' today':' active'):''}">${d.count>0?d.count:''}</span></div></div><div class="bar-day${d.isToday?' today':''}">${d.lbl}</div><div class="bar-date">${d.dstr.slice(5)}</div>`;bc.appendChild(col);});
  const hg=document.getElementById('hm-grid');
  heat.forEach(d=>{const lvl=d.count===0?0:d.count<3?1:d.count<8?2:d.count<15?3:4;const el=document.createElement('div');el.className='hm-cell lvl'+lvl+(d.isToday?' today-cell':'');el.dataset.tip=`${d.dstr}: ${d.count} questions`;hg.appendChild(el);});
}

/* ── INTEGRITY CHECK ── */
function showCheck(){renderCheck();showScreen('check-screen');}
function renderCheck(){
  document.getElementById('check-grid').style.display='none';
  document.getElementById('check-log').style.display='none';
}
function runCheck(){
  const grid=document.getElementById('check-grid');
  const log=document.getElementById('check-log');
  const logItems=document.getElementById('check-log-items');
  grid.style.display='grid';log.style.display='block';
  logItems.innerHTML='';
  const logs=[];
  function logLine(icon,text){logs.push(`<div class="check-log-item"><span class="log-icon">${icon}</span><div class="log-text">${text}</div></div>`);}

  // 1. Total count
  const total=ALL_QUESTIONS.length;
  const expectedTotal=719;
  const totalOk=total===expectedTotal;
  logLine(totalOk?'✅':'❌',`<strong>Total count:</strong> Found ${total} questions (expected ${expectedTotal})`);

  // 2. ID range
  const ids=ALL_QUESTIONS.map(q=>q.id).sort((a,b)=>a-b);
  const idMin=ids[0],idMax=ids[ids.length-1];
  const rangeOk=idMin===INTEGRITY.idMin&&idMax===INTEGRITY.idMax;
  logLine(rangeOk?'✅':'⚠️',`<strong>ID range:</strong> #${idMin} → #${idMax} (expected #${INTEGRITY.idMin} → #${INTEGRITY.idMax})`);

  // 3. Missing IDs
  const idSet=new Set(ids);
  const missing=[];
  for(let i=idMin;i<=idMax;i++){if(!idSet.has(i))missing.push(i);}
  const missingOk=missing.length===0;
  logLine(missingOk?'✅':'❌',`<strong>Missing IDs:</strong> ${missingOk?'None — all IDs present':missing.slice(0,20).join(', ')+(missing.length>20?` … (+${missing.length-20} more)`:'')}`)

  // 4. Duplicate IDs
  const dupMap={};ids.forEach(id=>{dupMap[id]=(dupMap[id]||0)+1;});
  const dups=Object.entries(dupMap).filter(([,v])=>v>1).map(([k])=>Number(k));
  const dupOk=dups.length===0;
  logLine(dupOk?'✅':'❌',`<strong>Duplicate IDs:</strong> ${dupOk?'None':dups.join(', ')}`);

  // 5. Category counts
  const catCounts={};ALL_QUESTIONS.forEach(q=>{catCounts[q.category]=(catCounts[q.category]||0)+1;});
  let catOk=true;
  const catDetails=CATS.map(c=>{
    const got=catCounts[c.key]||0;const exp=INTEGRITY.categories[c.key]||0;
    const ok=got===exp;if(!ok)catOk=false;
    return `${c.lbl}: ${got}/${exp}${ok?' ✓':' ✗'}`;
  }).join(' · ');
  logLine(catOk?'✅':'❌',`<strong>Domain breakdown:</strong> ${catDetails}`);

  // 6. Structural checks
  let structIssues=0;
  ALL_QUESTIONS.forEach(q=>{
    if(!q.question||!q.question.trim()||!q.options||Object.keys(q.options).length<2||!correctKeys(q).length||!correctKeys(q).every(k=>k in q.options))structIssues++;
  });
  const structOk=structIssues===0;
  logLine(structOk?'✅':'❌',`<strong>Structure integrity:</strong> ${structOk?`All ${total} questions well-formed`:`${structIssues} questions with missing fields or invalid answers`}`);

  // 7. Options completeness
  let optIssues=0;
  ALL_QUESTIONS.forEach(q=>{if(Object.keys(q.options).length<4)optIssues++;});
  logLine(optIssues===0?'✅':'⚠️',`<strong>Options completeness:</strong> ${optIssues===0?'All questions have 4 options':`${optIssues} questions have fewer than 4 options`}`);

  // 7. Multi-select questions
  const multiCount=ALL_QUESTIONS.filter(q=>q.multi).length;
  const multiOk=multiCount===INTEGRITY.multiCount;
  logLine(multiOk?'✅':'⚠️',`<strong>Multi-select questions:</strong> Found ${multiCount} (expected ${INTEGRITY.multiCount}) — these require choosing ${multiCount>0?'2+':''} answers`);

  logItems.innerHTML=logs.join('');

  // Summary cards
  const allOk=totalOk&&rangeOk&&missingOk&&dupOk&&catOk&&structOk;
  grid.innerHTML=`
    <div class="check-card ${totalOk?'pass':'fail'}">
      <div class="check-status"><span class="check-icon">${totalOk?'✅':'❌'}</span><span class="check-label">Total Questions</span></div>
      <div class="check-value ${totalOk?'green':'red'}">${total}</div>
      <div class="check-detail">Expected: ${expectedTotal} · ${totalOk?'✓ Correct':'✗ Mismatch'}</div>
    </div>
    <div class="check-card ${missingOk&&dupOk?'pass':'fail'}">
      <div class="check-status"><span class="check-icon">${missingOk&&dupOk?'✅':'❌'}</span><span class="check-label">ID Integrity</span></div>
      <div class="check-value ${missingOk&&dupOk?'green':'red'}">${missingOk&&dupOk?'Clean':missing.length+dups.length+' issues'}</div>
      <div class="check-detail">Missing: ${missing.length} · Duplicates: ${dups.length}</div>
    </div>
    <div class="check-card ${catOk?'pass':'warn'}">
      <div class="check-status"><span class="check-icon">${catOk?'✅':'⚠️'}</span><span class="check-label">Domain Split</span></div>
      <div class="check-value ${catOk?'green':'amber'}">${catOk?'5 / 5':'Check log'}</div>
      <div class="check-detail">${CATS.map(c=>`${c.lbl.split(' ')[0]}: ${catCounts[c.key]||0}`).join(' · ')}</div>
    </div>
    <div class="check-card ${structOk?'pass':'fail'}">
      <div class="check-status"><span class="check-icon">${structOk?'✅':'❌'}</span><span class="check-label">Data Structure</span></div>
      <div class="check-value ${structOk?'green':'red'}">${structOk?'100%':Math.round((1-structIssues/total)*100)+'%'}</div>
      <div class="check-detail">${structOk?'All fields valid':`${structIssues} malformed questions`}</div>
    </div>
    <div class="check-card ${allOk?'pass':'warn'}" style="grid-column:1/-1">
      <div class="check-status"><span class="check-icon">${allOk?'✅':'⚠️'}</span><span class="check-label">Overall Result</span></div>
      <div class="check-value ${allOk?'green':'amber'}">${allOk?'All checks passed':'Issues found'}</div>
      <div class="check-detail">${allOk?'Your question bank is complete and intact. All 719 CLF-C02 questions are present and correctly structured.':'See the check log below for details.'}</div>
    </div>`;
  toast(allOk?'✅ All checks passed!':'⚠️ Some issues found — see log');
}

/* ── PDF ── */
function loadPDF(input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();r.onload=async e=>{
    try{pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(e.target.result)}).promise;
      document.getElementById('total-pgs').textContent=pdfDoc.numPages;
      document.getElementById('pdf-loaded-badge').textContent=`✓ ${file.name}`;
      document.getElementById('pdf-loaded-badge').style.display='inline';
      toast(`✅ PDF loaded — ${pdfDoc.numPages} pages`);}
    catch(e){toast('⚠️ Could not load PDF');}
  };r.readAsArrayBuffer(file);
}
function openPDFModal(){
  const q=curQ();document.getElementById('pdf-modal').classList.add('show');
  if(!pdfDoc){document.getElementById('pdf-no-file').style.display='flex';document.getElementById('pdf-canvas').style.display='none';document.getElementById('modal-nav').style.display='none';return;}
  document.getElementById('pdf-no-file').style.display='none';document.getElementById('pdf-canvas').style.display='block';document.getElementById('modal-nav').style.display='flex';
  document.getElementById('modal-ttl').textContent=`📄 PDF Source — Page ${q.id}`;
  pdfPage=q.id;document.getElementById('pg-input').value=pdfPage;renderPDFPage(pdfPage);
}
function closePDF(){document.getElementById('pdf-modal').classList.remove('show');}
async function renderPDFPage(n){
  if(!pdfDoc)return;n=Math.max(1,Math.min(n,pdfDoc.numPages));pdfPage=n;
  document.getElementById('pg-input').value=n;document.getElementById('modal-ttl').textContent=`📄 PDF Source — Page ${n}`;
  if(pdfTask){try{pdfTask.cancel();}catch(e){}}
  const page=await pdfDoc.getPage(n);const canvas=document.getElementById('pdf-canvas');const wrap=document.getElementById('pdf-canvas-wrap');
  const cw=Math.min(wrap.clientWidth-40,820);const vp=page.getViewport({scale:1});const sv=page.getViewport({scale:cw/vp.width});
  canvas.width=sv.width;canvas.height=sv.height;pdfTask=page.render({canvasContext:canvas.getContext('2d'),viewport:sv});await pdfTask.promise;
}
function pdfDelta(d){if(pdfDoc)renderPDFPage(pdfPage+d);}
function goPage(v){const n=parseInt(v);if(!isNaN(n))renderPDFPage(n);}
document.getElementById('pdf-modal').addEventListener('click',e=>{if(e.target===document.getElementById('pdf-modal'))closePDF();});

/* ── LISTS — date-aware ── */

// Get unique dates from a map, sorted newest first
function getDates(map){
  return [...new Set(Object.values(map))].sort().reverse();
}
// Get dates within a week string 'YYYY-WW' or exact date string 'YYYY-MM-DD'
function filterByPeriod(map,period){
  if(!period||period==='all') return Object.keys(map).map(Number);
  if(period.length===10){// exact date
    return Object.entries(map).filter(([,d])=>d===period).map(([id])=>Number(id));
  }
  // week: 'week:YYYY-MM-DD' where the date is Monday
  if(period.startsWith('week:')){
    const ws=new Date(period.slice(5));
    const we=new Date(ws);we.setDate(ws.getDate()+6);
    return Object.entries(map).filter(([,d])=>{
      const dd=new Date(d);return dd>=ws&&dd<=we;
    }).map(([id])=>Number(id));
  }
  return Object.keys(map).map(Number);
}

function buildDateFilters(map, filterId, bodyId, isWrong){
  const fb=document.getElementById(filterId);
  const allIds=Object.keys(map).map(Number);
  const typeState=isWrong?'reviewType':'bmType';
  const periodState=isWrong?'reviewPeriod':'bmPeriod';
  const activeType=S[typeState]||'all';
  const activePeriod=S[periodState]||'all';

  // Build week buckets
  const dates=getDates(map);
  const weeks={};
  dates.forEach(d=>{
    const ws=weekStart(new Date(d));
    const wk='week:'+ds(ws);
    if(!weeks[wk])weeks[wk]={label:'',dates:[]};
    weeks[wk].dates.push(d);
    const we=new Date(ws);we.setDate(ws.getDate()+6);
    weeks[wk].label=`${SHORT_MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}`;
  });

  let chips=`<button class="filter-chip ${activeType==='all'?'active':''}" data-type="all" onclick="applyListType(this,'${filterId}','${bodyId}',${isWrong})">All Types (${allIds.length})</button>`;
  ['single','multi'].forEach(t=>{
    const cnt=ALL_QUESTIONS.filter(q=>allIds.includes(q.id)&&questionType(q)===t).length;
    const lbl=t==='single'?'Single':'Multi';
    chips+=`<button class="filter-chip ${activeType===t?'active':''}" data-type="${t}" onclick="applyListType(this,'${filterId}','${bodyId}',${isWrong})">${lbl} (${cnt})</button>`;
  });
  chips+=`<button class="filter-chip ${activePeriod==='all'?'active':''}" data-period="all" onclick="applyPeriod(this,'${filterId}','${bodyId}',${isWrong})">All Dates (${allIds.length})</button>`;

  // Day chips (up to 7 recent days)
  dates.slice(0,7).forEach(d=>{
    const cnt=Object.values(map).filter(v=>v===d).length;
    const label=d===today()?`Today (${cnt})`:d.slice(5);
    chips+=`<button class="filter-chip ${activePeriod===d?'active':''}" data-period="${d}" onclick="applyPeriod(this,'${filterId}','${bodyId}',${isWrong})">${label} (${cnt})</button>`;
  });

  // Week chips
  Object.entries(weeks).forEach(([wk,info])=>{
    const cnt=filterByPeriod(map,wk).length;
    chips+=`<button class="filter-chip filter-chip-week ${activePeriod===wk?'active':''}" data-period="${wk}" onclick="applyPeriod(this,'${filterId}','${bodyId}',${isWrong})">W: ${info.label} (${cnt})</button>`;
  });

  fb.innerHTML=chips;
}

function applyListType(btn,filterId,bodyId,isWrong){
  const typeState=isWrong?'reviewType':'bmType';
  S[typeState]=btn.dataset.type;
  const activePeriod=S[isWrong?'reviewPeriod':'bmPeriod']||'all';
  buildDateFilters(isWrong?S.wrongMap:S.bmMap,filterId,bodyId,isWrong);
  renderFilteredList(filterId,bodyId,isWrong,activePeriod);
}

function applyPeriod(btn,filterId,bodyId,isWrong){
  const periodState=isWrong?'reviewPeriod':'bmPeriod';
  S[periodState]=btn.dataset.period;
  document.querySelectorAll('#'+filterId+' .filter-chip[data-period]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderFilteredList(filterId,bodyId,isWrong,btn.dataset.period);
}

function renderFilteredList(filterId,bodyId,isWrong,period){
  const map=isWrong?S.wrongMap:S.bmMap;
  const type=S[isWrong?'reviewType':'bmType']||'all';
  const ids=filterByPeriod(map,period);
  const pool=filterByType(ALL_QUESTIONS.filter(q=>ids.includes(q.id)),type);
  // Sort by date desc, then by id
  pool.sort((a,b)=>{
    const da=map[a.id]||'',db=map[b.id]||'';
    return da<db?1:da>db?-1:a.id-b.id;
  });
  const body=document.getElementById(bodyId);
  renderDateCards(pool,body,isWrong,map,period);
  // Update practice-these button
  updatePracticeBtn(bodyId,pool,isWrong);
}

function updatePracticeBtn(bodyId,pool,isWrong){
  const btnId=isWrong?'practice-wrong-btn':'practice-bm-btn';
  const btn=document.getElementById(btnId);
  if(!btn)return;
  if(pool.length>0){
    btn.style.display='block';
    btn.textContent=`▶ Practice these ${pool.length} question${pool.length>1?'s':''}`;
    btn.onclick=()=>practicePool(pool);
  } else {
    btn.style.display='none';
  }
}

function practicePool(pool){
  if(!pool.length){toast('No questions to practice');return;}
  shuffle([...pool]);// shuffle a copy, set session
  const shuffled=shuffle([...pool]);
  S.qs=shuffled;S.idx=0;S.ans={};S.sessionWrongIds=[];S.multiPending=[];
  window.dispatchEvent(new CustomEvent('studycouch:quiz-state',{detail:true}));
  showScreen('quiz-screen');renderQ();
  toast(`Starting ${shuffled.length} questions — shuffled!`);
}

function renderDateCards(items,body,isWrong,map,period){
  if(!items.length){
    body.innerHTML=`<div class="empty-state"><span class="empty-icon">${isWrong?'✨':'⭐'}</span><p>No questions for this period.</p></div>`;
    return;
  }
  // Group by date for display
  const byDate={};
  items.forEach(q=>{
    const d=map[q.id]||'—';
    if(!byDate[d])byDate[d]=[];
    byDate[d].push(q);
  });
  let html='';
  Object.entries(byDate).sort((a,b)=>a[0]<b[0]?1:-1).forEach(([date,qs])=>{
    const dLabel=date===today()?'Today':date;
    html+=`<div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3);margin:.9rem 0 .4rem;padding-bottom:.3rem;border-bottom:1px solid var(--border);">${dLabel} · ${qs.length} question${qs.length>1?'s':''}</div>`;
    qs.forEach(q=>{
      const cat=getCat(q.category);const txt=q.question.length>110?q.question.substring(0,110)+'…':q.question;
      const removeAction=isWrong?`removeWrong(${q.id},'${period}','${isWrong?'review-filter':'bm-filter'}','${isWrong?'review-body':'bm-body'}',${isWrong})`:`removeBm(${q.id},'${period}','${isWrong?'review-filter':'bm-filter'}','${isWrong?'review-body':'bm-body'}',${isWrong})`;
      const commentText=S.comments[q.id];
      html+=`<div class="q-card" id="qcard-${isWrong?'w':'b'}-${q.id}">
        <div class="q-card-top">
          <div class="q-card-txt" onclick="jumpTo(${q.id})">${txt}</div>
          <div style="display:flex;align-items:center;gap:.4rem;flex-shrink:0">
            <div class="q-card-badge">#${q.id}</div>
            <button class="remove-btn" onclick="${isWrong?`removeWrong(${q.id})`:`removeBm(${q.id})`}" title="${isWrong?'Remove from mistakes':'Remove from saved'}">✕</button>
          </div>
        </div>
        <div class="q-card-meta">
          <span class="cat-pill ${cat.cls}" style="font-size:.62rem">${cat.lbl}</span>
          <span class="tag">${questionTypeLabel(q)}</span>
          ${isWrong?'<span class="tag wrong-tag">Mistake</span>':''}
          ${S.bmMap[q.id]?'<span class="tag bm-tag">★ Saved</span>':''}
          <span class="tag pdf-tag">📄 p.${q.id}</span>
          ${commentText?'<span style="font-size:.62rem;background:var(--amber-lt);border:1px solid var(--amber-md);color:var(--amber);border-radius:5px;padding:.08rem .42rem;font-weight:600;">✏️</span>':''}
        </div>
        ${commentText?`<div class="comment-snippet">${commentText.length>80?commentText.substring(0,80)+'…':commentText}</div>`:''}
      </div>`;
    });
  });
  body.innerHTML=html;
}

function showReview(){
  const map=S.wrongMap;
  const ids=Object.keys(map).map(Number);
  const pool=ALL_QUESTIONS.filter(q=>ids.includes(q.id));
  pool.sort((a,b)=>{const da=map[a.id]||'',db=map[b.id]||'';return da<db?1:da>db?-1:0;});
  document.getElementById('review-title').textContent=`❌ Mistakes (${ids.length})`;
  S.reviewType=S.reviewType||'all';S.reviewPeriod='all';
  buildDateFilters(map,'review-filter','review-body',true);
  renderFilteredList('review-filter','review-body',true,'all');
  showScreen('review-screen');
}

function removeWrong(id){
  delete S.wrongMap[id];save();
  // Refresh
  showReview();updateStats();toast('Removed from mistakes');
}

function showBookmarks(){
  const map=S.bmMap;
  const ids=Object.keys(map).map(Number);
  const pool=ALL_QUESTIONS.filter(q=>ids.includes(q.id));
  pool.sort((a,b)=>{const da=map[a.id]||'',db=map[b.id]||'';return da<db?1:da>db?-1:0;});
  document.getElementById('bm-title').textContent=`⭐ Saved Questions (${ids.length})`;
  S.bmType=S.bmType||'all';S.bmPeriod='all';
  buildDateFilters(map,'bm-filter','bm-body',false);
  renderFilteredList('bm-filter','bm-body',false,'all');
  showScreen('bookmarks-screen');
}

function removeBm(id){
  delete S.bmMap[id];save();
  showBookmarks();updateStats();toast('Removed from saved');
}

function jumpTo(id){const q=ALL_QUESTIONS.find(x=>x.id===id);if(!q)return;S.qs=[q];S.idx=0;S.ans={};S.sessionWrongIds=[];S.multiPending=[];save();window.dispatchEvent(new CustomEvent('studycouch:quiz-state',{detail:true}));showScreen('quiz-screen');renderQ();}

/* ── RESET ALL ── */
function resetAllData(){
  if(!confirm('Reset ALL data? This clears this account progress, mistakes, saved questions, notes, and check-ins locally and in the cloud. New records will start after this reset. Cannot be undone.'))return;
  localStorage.removeItem(profileKey());localStorage.removeItem('clf_en2');
  resetStudyData(true);
  updateStats();renderCheckin();renderProfiles();renderProgress();
  toast('Clearing cloud data...');
  syncClearStudyData().then(res=>{
    if(!res.ok){toast('Local data reset. Cloud reset failed.');console.warn('StudyCouch cloud clear failed:',res.message);return;}
    toast('✓ All data reset');
  }).catch(err=>{
    toast('Local data reset. Cloud reset failed.');
    console.warn('StudyCouch cloud clear failed:',err);
  });
}

/* ── TOAST ── */
let tTimer=null;
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(tTimer);tTimer=setTimeout(()=>t.classList.remove('show'),2200);}

/* ── INIT ── */
load();updateStats();renderCheckin();
startTimerLoop();
if(S.currentScreen==='quiz-screen'&&S.qs&&S.qs.length){
  showScreen('quiz-screen');renderQ();
}else if(S.currentScreen==='progress-screen'){
  showProgress();
}else if(S.currentScreen==='review-screen'){
  showReview();
}else if(S.currentScreen==='bookmarks-screen'){
  showBookmarks();
}else if(S.currentScreen==='check-screen'){
  showCheck();
}else{
  window.dispatchEvent(new CustomEvent('studycouch:screen-change',{detail:'home-screen'}));
}
hydrateFromCloud();

window.restoreCurrentScreen=function(){
  if(S.currentScreen==='quiz-screen'&&S.qs&&S.qs.length){showScreen('quiz-screen');renderQ();}
  else if(S.currentScreen==='progress-screen'){showProgress();}
  else if(S.currentScreen==='review-screen'){showReview();}
  else if(S.currentScreen==='bookmarks-screen'){showBookmarks();}
  else if(S.currentScreen==='check-screen'){showCheck();}
  else{showScreen('home-screen');updateStats();renderCheckin();renderProfiles();renderResumeBtn();}
};

