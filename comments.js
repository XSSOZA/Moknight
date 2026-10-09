/* ============================================================
   MoKnight — قسم التعليقات
   ------------------------------------------------------------
   عشان التعليقات تظهر لكل الزوار لازم قاعدة بيانات (Supabase).
   الخطوات في ملف SETUP-AR.md — المطلوب بس تحط الـ URL هنا:
   ============================================================ */
const COMMENTS_CONFIG = {
  SUPABASE_URL: 'https://qiqyttbhctxhyhrlghdr.supabase.co',   // مثال: 'https://abcdxyz.supabase.co'   <-- حط الرابط بتاعك هنا
  SUPABASE_ANON_KEY: 'sb_publishable_MJLyNGdLVT7C_vgOYownWg_MZinUNS5'   // الـ publishable key (آمن إنه يبان في الموقع)
};
/* لو الـ URL فاضي: التعليقات بتتخزن في متصفح الزائر نفسه بس (وضع تجريبي). */

(function(){
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ONLINE = !!(COMMENTS_CONFIG.SUPABASE_URL && COMMENTS_CONFIG.SUPABASE_ANON_KEY);
const API = COMMENTS_CONFIG.SUPABASE_URL.replace(/\/+$/,'') + '/rest/v1/comments';
const HEAD = { apikey: COMMENTS_CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
// المفاتيح القديمة (eyJ...) محتاجة Authorization، المفاتيح الجديدة (sb_publishable_...) لا
if(/^eyJ/.test(COMMENTS_CONFIG.SUPABASE_ANON_KEY)) HEAD.Authorization = 'Bearer ' + COMMENTS_CONFIG.SUPABASE_ANON_KEY;
const LS_KEY = 'moknight_comments_local', LS_LAST = 'moknight_comment_last';
const AVATAR_PREFIX = 'data:image/jpeg;base64,';
const MAX_NAME = 40, MAX_MSG = 500, COOLDOWN_MS = 30000, PAGE = 6;
const PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';

const TXT = {
  ar:{ title:'التعليقات', sub:'اترك رأيك أو تعليقك على أعمالي', add:'أضف تعليقًا', mtitle:'أضف تعليقك',
       name:'اسمك', msg:'اكتب تعليقك...', photo:'اختر صورة (اختياري)', remove:'إزالة', cancel:'إلغاء',
       send:'إرسال التعليق', sending:'جاري الإرسال...', more:'عرض المزيد', empty:'مفيش تعليقات لسه — كن أول واحد يعلّق!',
       errName:'اكتب اسمك الأول', errMsg:'اكتب تعليق الأول', errWait:'استنى شوية قبل ما تبعت تعليق تاني',
       errImg:'الملف لازم يكون صورة', errNet:'حصلت مشكلة في الاتصال، حاول تاني', ok:'تم نشر تعليقك ✓ شكرًا ليك',
       loading:'جاري تحميل التعليقات...', local:'وضع تجريبي: التعليقات بتظهر عندك أنت بس لحد ما يتم ربط قاعدة البيانات.', loc:'ar-EG' },
  en:{ title:'Comments', sub:'Leave your thoughts about my work', add:'Add a comment', mtitle:'Add your comment',
       name:'Your name', msg:'Write your comment...', photo:'Choose a photo (optional)', remove:'Remove', cancel:'Cancel',
       send:'Post comment', sending:'Posting...', more:'Show more', empty:'No comments yet — be the first!',
       errName:'Please enter your name', errMsg:'Please write a comment', errWait:'Please wait a moment before posting again',
       errImg:'File must be an image', errNet:'Connection problem, please try again', ok:'Comment posted ✓ Thank you',
       loading:'Loading comments...', local:'Demo mode: comments are visible only to you until the database is connected.', loc:'en-US' }
};
const L = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');
const T = k => TXT[L()][k];

let avatarData = null, list = [], shown = PAGE, freshId = null, loaded = false, loadFailed = false, lastRefresh = 0;

/* ---------- storage ---------- */
async function loadComments(){
  if(!ONLINE){
    try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return []; }
  }
  const r = await fetch(API + '?select=id,name,message,avatar,created_at&order=created_at.desc&limit=100', { headers: HEAD });
  if(!r.ok) throw new Error('load');
  return r.json();
}
async function saveComment(c){
  if(!ONLINE){
    const all = await loadComments(); all.unshift(Object.assign({id:'l'+Date.now(), created_at:new Date().toISOString()}, c));
    try{ localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0,100))); }catch(e){}
    return all[0];
  }
  const r = await fetch(API, { method:'POST', headers:Object.assign({Prefer:'return=representation'},HEAD), body:JSON.stringify(c) });
  if(!r.ok) throw new Error('save');
  const j = await r.json(); return j[0];
}

/* ---------- image: crop to square + shrink to 96px ---------- */
function processImage(file){
  return new Promise((res,rej)=>{
    if(!file || !/^image\//.test(file.type)) return rej(new Error('type'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = ()=>{
      const S = 96, c = document.createElement('canvas'); c.width = c.height = S;
      const side = Math.min(img.width, img.height), sx = (img.width-side)/2, sy = (img.height-side)/2;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0,0,S,S); g.drawImage(img, sx, sy, side, side, 0, 0, S, S);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .82));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); rej(new Error('type')); };
    img.src = url;
  });
}

/* ---------- render ---------- */
function avatarHTML(c){
  if(c.avatar && String(c.avatar).indexOf(AVATAR_PREFIX)===0 && /^[A-Za-z0-9+\/=]+$/.test(String(c.avatar).slice(AVATAR_PREFIX.length)))
    return '<img class="cm-av" src="'+c.avatar+'" alt="">';
  const ch = (Array.from(String(c.name||'?').trim())[0]||'?').toUpperCase();
  return '<div class="cm-av cm-av-ph">'+esc(ch)+'</div>';
}
function render(){
  const box = $('cmList'); if(!box) return;
  $('cmCountN').textContent = list.length ? list.length : '';
  $('cmCountN').hidden = !list.length;
  if(!loaded){ box.innerHTML = '<div class="cm-empty">'+T('loading')+'</div>'; $('cmMore').hidden = true; return; }
  if(loadFailed && !list.length){ box.innerHTML = '<div class="cm-empty">'+T('errNet')+'</div>'; $('cmMore').hidden = true; return; }
  if(!list.length){ box.innerHTML = '<div class="cm-empty">'+T('empty')+'</div>'; $('cmMore').hidden = true; return; }
  box.innerHTML = list.slice(0, shown).map(c=>{
    const d = new Date(c.created_at);
    const date = isNaN(d) ? '' : d.toLocaleDateString(T('loc'), {year:'numeric',month:'short',day:'numeric'});
    return '<article class="cm-item'+(String(c.id)===String(freshId)?' fresh':'')+'" id="cm-'+esc(c.id)+'">'+avatarHTML(c)+
      '<div class="cm-body"><div class="cm-head"><strong class="cm-name">'+esc(c.name)+'</strong><span class="cm-date">'+date+'</span></div>'+
      '<p class="cm-text">'+esc(c.message)+'</p></div></article>';
  }).join('');
  const rest = list.length - shown;
  $('cmMore').hidden = rest <= 0;
  if(rest > 0) $('cmMore').textContent = T('more') + ' (' + rest + ')';
}
function texts(){
  $('cmTitleTxt').textContent = T('title'); $('cmSub').textContent = T('sub');
  $('cmAddTxt').textContent = T('add'); $('cmMTitle').textContent = T('mtitle');
  $('cmName').placeholder = T('name'); $('cmMsg').placeholder = T('msg');
  $('cmPhotoLbl').textContent = T('photo'); $('cmRemove').textContent = T('remove');
  $('cmCancel').textContent = T('cancel'); $('cmSend').textContent = T('send');
  $('cmLocal').textContent = ONLINE ? '' : T('local');
  $('cmLocal').style.display = ONLINE ? 'none' : 'block';
  $('cmCount').textContent = $('cmMsg').value.length + '/' + MAX_MSG;
  render();
}
function say(msg, bad){ const e=$('cmStatus'); e.textContent = msg||''; e.className = 'cm-status' + (bad?' bad':' good'); }
function flash(msg, bad){ const e=$('cmFlash'); e.textContent = msg||''; e.className = 'cm-flash' + (bad?' bad':' good'); if(msg) setTimeout(()=>{ if(e.textContent===msg) e.textContent=''; }, 6000); }

/* ---------- modal ---------- */
function openModal(){
  const ov = $('cmOverlay'); say('');
  ov.classList.add('open'); ov.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  setTimeout(()=>{ try{ $('cmName').focus({preventScroll:true}); }catch(e){} }, 60);
}
function closeModal(){
  const ov = $('cmOverlay'); if(!ov.classList.contains('open')) return;
  ov.classList.remove('open'); ov.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}
function resetAvatar(){
  avatarData = null; $('cmRemove').hidden = true; $('cmPrev').classList.add('cm-av-ph'); $('cmPrev').innerHTML = PLUS;
}
async function refresh(){
  if(!ONLINE || Date.now()-lastRefresh < 30000) return;
  lastRefresh = Date.now();
  try{ list = await loadComments(); loadFailed = false; render(); }catch(e){}
}

/* ---------- init ---------- */
function build(){
  const sec = document.createElement('section'); sec.id = 'comments';
  sec.innerHTML =
   '<div class="secbar"><div>'+
     '<h2 class="sectitle"><span id="cmTitleTxt"></span><span class="cm-count-n" id="cmCountN" hidden></span></h2>'+
     '<p class="secsub" id="cmSub" style="margin-bottom:0"></p></div>'+
     '<button type="button" class="btn primary cm-add" id="cmAdd">'+PLUS.replace('width="22" height="22"','width="18" height="18"')+'<span id="cmAddTxt"></span></button>'+
   '</div>'+
   '<div id="cmFlash" class="cm-flash" role="status" aria-live="polite"></div>'+
   '<div id="cmList" class="cm-grid"></div>'+
   '<button type="button" class="btn ghost cm-more" id="cmMore" hidden></button>'+
   '<div id="cmLocal" class="cm-local"></div>';
  const contact = $('contact'); contact.parentNode.insertBefore(sec, contact);

  const ov = document.createElement('div');
  ov.className = 'cm-ov'; ov.id = 'cmOverlay'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-hidden','true'); ov.setAttribute('aria-labelledby','cmMTitle');
  ov.innerHTML =
   '<div class="cm-modal">'+
     '<button type="button" class="cm-x" id="cmClose" aria-label="close">&times;</button>'+
     '<h3 class="cm-mtitle" id="cmMTitle"></h3>'+
     '<div class="cm-row">'+
       '<label class="cm-photo"><input type="file" id="cmFile" accept="image/*" hidden>'+
         '<div id="cmPrev" class="cm-av cm-av-ph cm-prev">'+PLUS+'</div><span id="cmPhotoLbl"></span></label>'+
       '<button type="button" class="cm-remove" id="cmRemove" hidden></button>'+
     '</div>'+
     '<input id="cmName" class="cm-input" type="text" maxlength="'+MAX_NAME+'" autocomplete="nickname">'+
     '<input id="cmWebsite" type="text" tabindex="-1" autocomplete="off" class="cm-hp" aria-hidden="true">'+
     '<textarea id="cmMsg" class="cm-input" rows="4" maxlength="'+MAX_MSG+'"></textarea>'+
     '<div class="cm-meta"><div id="cmStatus" class="cm-status" role="status" aria-live="polite"></div><span class="cm-count" id="cmCount"></span></div>'+
     '<div class="cm-actions"><button type="button" class="btn ghost" id="cmCancel"></button><button type="button" class="btn primary cm-send" id="cmSend"></button></div>'+
   '</div>';
  document.body.appendChild(ov);

  $('cmAdd').addEventListener('click', openModal);
  $('cmClose').addEventListener('click', closeModal);
  $('cmCancel').addEventListener('click', closeModal);
  ov.addEventListener('click', e=>{ if(e.target===ov) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
  $('cmMore').addEventListener('click', ()=>{ shown += PAGE; render(); });
  $('cmName').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); $('cmMsg').focus(); } });
  $('cmMsg').addEventListener('input', ()=>{ $('cmCount').textContent = $('cmMsg').value.length+'/'+MAX_MSG; });
  $('cmFile').addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    try{ avatarData = await processImage(f); $('cmPrev').innerHTML = '<img src="'+avatarData+'" alt="">'; $('cmPrev').classList.remove('cm-av-ph'); $('cmRemove').hidden = false; say(''); }
    catch(err){ say(T('errImg'), true); }
    e.target.value = '';
  });
  $('cmRemove').addEventListener('click', resetAvatar);
  $('cmSend').addEventListener('click', submit);
  new MutationObserver(texts).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) refresh(); });
  texts();
  lastRefresh = Date.now();
  loadComments().then(r=>{ list = r; loaded = true; render(); }).catch(()=>{ list = []; loaded = true; loadFailed = true; render(); });
}

async function submit(){
  if($('cmWebsite').value) return;                          // honeypot (بوتات)
  const name = $('cmName').value.trim().slice(0,MAX_NAME), message = $('cmMsg').value.trim().slice(0,MAX_MSG);
  if(!name) return say(T('errName'), true);
  if(!message) return say(T('errMsg'), true);
  let last = 0; try{ last = +(localStorage.getItem(LS_LAST)||0); }catch(e){}
  if(Date.now()-last < COOLDOWN_MS) return say(T('errWait'), true);
  const btn = $('cmSend'); btn.disabled = true; btn.textContent = T('sending'); say('');
  try{
    const c = await saveComment({ name, message, avatar: avatarData });
    list.unshift(c); freshId = c.id; loadFailed = false; render();
    $('cmMsg').value = ''; $('cmCount').textContent = '0/'+MAX_MSG; resetAvatar();
    try{ localStorage.setItem(LS_LAST, String(Date.now())); }catch(e){}
    closeModal(); flash(T('ok'));
    const el = $('cm-'+c.id); if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(()=>{ freshId = null; const x = $('cm-'+c.id); if(x) x.classList.remove('fresh'); }, 5000);
  }catch(e){ say(T('errNet'), true); }
  btn.disabled = false; btn.textContent = T('send');
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
