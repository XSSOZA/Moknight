/* ============================================================
   MoKnight — قسم التعليقات
   ------------------------------------------------------------
   عشان التعليقات تظهر لكل الزوار لازم قاعدة بيانات.
   املا القيمتين دول من Supabase (Project Settings > API):
   ============================================================ */
const COMMENTS_CONFIG = {
  SUPABASE_URL: 'https://qiqyttbhctxhyhrlghdr.supabase.co',       // مثال: 'https://abcdxyz.supabase.co'
  SUPABASE_ANON_KEY: 'sb_publishable_MJLyNGdLVT7C_vgOYownWg_MZinUNS5'   // الـ anon public key
};
/* لو سيبتهم فاضيين: التعليقات بتتخزن في متصفح الزائر نفسه بس (للتجربة). */

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
const MAX_NAME = 40, MAX_MSG = 500, COOLDOWN_MS = 30000;

const TXT = {
  ar:{ title:'التعليقات', sub:'اترك رأيك أو تعليقك على أعمالي', name:'اسمك', msg:'اكتب تعليقك...', photo:'اختر صورة (اختياري)',
       remove:'إزالة', send:'إرسال التعليق', sending:'جاري الإرسال...', empty:'مفيش تعليقات لسه — كن أول واحد يعلّق!',
       errName:'اكتب اسمك الأول', errMsg:'اكتب تعليق الأول', errWait:'استنى شوية قبل ما تبعت تعليق تاني',
       errImg:'الملف لازم يكون صورة', errNet:'حصلت مشكلة في الاتصال، حاول تاني', ok:'تم نشر تعليقك ✓',
       loading:'جاري تحميل التعليقات...', local:'وضع تجريبي: التعليقات بتظهر عندك أنت بس لحد ما يتم ربط قاعدة البيانات.', loc:'ar-EG' },
  en:{ title:'Comments', sub:'Leave your thoughts about my work', name:'Your name', msg:'Write your comment...', photo:'Choose a photo (optional)',
       remove:'Remove', send:'Post comment', sending:'Posting...', empty:'No comments yet — be the first!',
       errName:'Please enter your name', errMsg:'Please write a comment', errWait:'Please wait a moment before posting again',
       errImg:'File must be an image', errNet:'Connection problem, please try again', ok:'Comment posted ✓',
       loading:'Loading comments...', local:'Demo mode: comments are visible only to you until the database is connected.', loc:'en-US' }
};
const L = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');
const T = k => TXT[L()][k];

let avatarData = null, list = [];

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
  if(!list.length){ box.innerHTML = '<div class="cm-empty">'+T('empty')+'</div>'; return; }
  box.innerHTML = list.map(c=>{
    const d = new Date(c.created_at);
    const date = isNaN(d) ? '' : d.toLocaleDateString(T('loc'), {year:'numeric',month:'short',day:'numeric'});
    return '<article class="cm-item">'+avatarHTML(c)+
      '<div class="cm-body"><div class="cm-head"><strong class="cm-name">'+esc(c.name)+'</strong><span class="cm-date">'+date+'</span></div>'+
      '<p class="cm-text">'+esc(c.message)+'</p></div></article>';
  }).join('');
}
function texts(){
  $('cmTitle').textContent = T('title'); $('cmSub').textContent = T('sub');
  $('cmName').placeholder = T('name'); $('cmMsg').placeholder = T('msg');
  $('cmPhotoLbl').textContent = T('photo'); $('cmRemove').textContent = T('remove');
  $('cmSend').textContent = T('send'); $('cmLocal').textContent = ONLINE ? '' : T('local');
  $('cmLocal').style.display = ONLINE ? 'none' : 'block';
  $('cmCount').textContent = $('cmMsg').value.length + '/' + MAX_MSG;
  render();
}
function say(msg, bad){ const e=$('cmStatus'); e.textContent = msg||''; e.className = 'cm-status' + (bad?' bad':' good'); }

/* ---------- init ---------- */
function build(){
  const sec = document.createElement('section'); sec.id = 'comments';
  sec.innerHTML =
   '<h2 class="sectitle" id="cmTitle"></h2><p class="secsub" id="cmSub"></p>'+
   '<div class="cm-wrap">'+
    '<div class="cm-form">'+
      '<div class="cm-row">'+
        '<label class="cm-photo"><input type="file" id="cmFile" accept="image/*" hidden>'+
          '<div id="cmPrev" class="cm-av cm-av-ph cm-prev"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></div>'+
          '<span id="cmPhotoLbl"></span></label>'+
        '<button type="button" class="cm-remove" id="cmRemove" hidden></button>'+
      '</div>'+
      '<input id="cmName" class="cm-input" type="text" maxlength="'+MAX_NAME+'" autocomplete="nickname">'+
      '<input id="cmWebsite" type="text" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;opacity:0;height:0" aria-hidden="true">'+
      '<textarea id="cmMsg" class="cm-input" rows="4" maxlength="'+MAX_MSG+'"></textarea>'+
      '<div class="cm-foot"><span class="cm-count" id="cmCount"></span><button type="button" class="btn primary cm-send" id="cmSend"></button></div>'+
      '<div id="cmStatus" class="cm-status"></div><div id="cmLocal" class="cm-local"></div>'+
    '</div>'+
    '<div id="cmList" class="cm-list"></div>'+
   '</div>';
  const contact = $('contact'); contact.parentNode.insertBefore(sec, contact);

  $('cmMsg').addEventListener('input', ()=>{ $('cmCount').textContent = $('cmMsg').value.length+'/'+MAX_MSG; });
  $('cmFile').addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    try{ avatarData = await processImage(f); $('cmPrev').innerHTML = '<img src="'+avatarData+'" alt="">'; $('cmPrev').classList.remove('cm-av-ph'); $('cmRemove').hidden = false; say(''); }
    catch(err){ say(T('errImg'), true); }
    e.target.value = '';
  });
  $('cmRemove').addEventListener('click', ()=>{
    avatarData = null; $('cmRemove').hidden = true; $('cmPrev').classList.add('cm-av-ph');
    $('cmPrev').innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
  });
  $('cmSend').addEventListener('click', submit);
  new MutationObserver(texts).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  texts();
  $('cmList').innerHTML = '<div class="cm-empty">'+T('loading')+'</div>';
  loadComments().then(r=>{ list = r; render(); }).catch(()=>{ list = []; render(); say(T('errNet'), true); });
}

async function submit(){
  if($('cmWebsite').value) return;                          // honeypot (بوتات)
  const name = $('cmName').value.trim().slice(0,MAX_NAME), message = $('cmMsg').value.trim().slice(0,MAX_MSG);
  if(!name) return say(T('errName'), true);
  if(!message) return say(T('errMsg'), true);
  const last = +(localStorage.getItem(LS_LAST)||0);
  if(Date.now()-last < COOLDOWN_MS) return say(T('errWait'), true);
  const btn = $('cmSend'); btn.disabled = true; btn.textContent = T('sending'); say('');
  try{
    const c = await saveComment({ name, message, avatar: avatarData });
    list.unshift(c); render();
    $('cmMsg').value = ''; $('cmCount').textContent = '0/'+MAX_MSG; $('cmRemove').click();
    try{ localStorage.setItem(LS_LAST, String(Date.now())); }catch(e){}
    say(T('ok'));
  }catch(e){ say(T('errNet'), true); }
  btn.disabled = false; btn.textContent = T('send');
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
