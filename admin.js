/* ============================================================
   MoKnight — لوحة الأدمن (رفع / تعديل / إخفاء / حذف الأعمال)
   ------------------------------------------------------------
   - بتستخدم نفس Supabase ونفس تسجيل الدخول بتاع التعليقات.
   - الزوار بيشوفوا الأعمال المنشورة بس، والأدمن بس بيشوف الأزرار.
   - لازم تشغّل ملف admin-setup.sql مرة واحدة في Supabase.
   ============================================================ */
(function(){
'use strict';
const API = window.MK_API;
if(!API){ console.warn('admin.js: MK_API مش موجود — تأكد إنك ضفت السطر في script.js'); return; }
if(typeof COMMENTS_CONFIG === 'undefined' || !COMMENTS_CONFIG.SUPABASE_URL){ return; }

const BASE = COMMENTS_CONFIG.SUPABASE_URL.replace(/\/+$/,'');
const KEY = COMMENTS_CONFIG.SUPABASE_ANON_KEY;
const BUCKET = 'media';
const LS_ADMIN = 'moknight_admin';        // نفس مفتاح التعليقات
const P = API.projects;
const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const CATS = [['editing','مونتاج'],['motion','موشن جرافيك'],['thumb','صور مصغّرة'],['short','فيديو قصير'],['long','فيديو طويل'],['other','أخرى']];
const ARS = [['16:9','أفقي 16:9'],['9:16','عمودي 9:16'],['1:1','مربع 1:1']];

const IC = {
  plus:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
  edit:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  eye:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 5.1A10.7 10.7 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/></svg>',
  trash:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14"/></svg>'
};

/* ---------- الجلسة (نفس تسجيل دخول التعليقات) ---------- */
const getSession = () => { try{ return JSON.parse(localStorage.getItem(LS_ADMIN)||'null'); }catch(e){ return null; } };
const setSession = s => { try{ s ? localStorage.setItem(LS_ADMIN, JSON.stringify(s)) : localStorage.removeItem(LS_ADMIN); }catch(e){} };
function jwtExp(t){ try{ return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp; }catch(e){ return 0; } }
async function token(force){
  let s = getSession(); if(!s) return null;
  if(force || jwtExp(s.access) - Date.now()/1000 < 60){
    const r = await fetch(BASE+'/auth/v1/token?grant_type=refresh_token', { method:'POST', headers:{apikey:KEY,'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:s.refresh}) });
    if(!r.ok){ setSession(null); throw new Error('auth'); }
    const j = await r.json(); s = { access:j.access_token, refresh:j.refresh_token }; setSession(s);
  }
  return s.access;
}
async function rest(path, opts){
  opts = opts || {};
  const go = async force => {
    const h = Object.assign({ apikey:KEY, 'Content-Type':'application/json' }, opts.headers||{});
    const tk = getSession() ? await token(force) : null;
    if(tk) h.Authorization = 'Bearer '+tk; else if(/^eyJ/.test(KEY)) h.Authorization = 'Bearer '+KEY;
    return fetch(BASE+'/rest/v1/'+path, Object.assign({}, opts, { headers:h }));
  };
  let r = await go(false);
  if(r.status===401 && getSession()) r = await go(true);
  return r;
}

/* ---------- تخزين الملفات ---------- */
const pubUrl = path => BASE+'/storage/v1/object/public/'+BUCKET+'/'+path;
function upload(path, blob, onProg){
  return new Promise(async (res, rej)=>{
    let tk; try{ tk = await token(false); }catch(e){ return rej(new Error('سجّل دخول الأدمن تاني')); }
    if(!tk) return rej(new Error('سجّل دخول الأدمن تاني'));
    const x = new XMLHttpRequest();
    x.open('POST', BASE+'/storage/v1/object/'+BUCKET+'/'+path);
    x.setRequestHeader('apikey', KEY); x.setRequestHeader('Authorization', 'Bearer '+tk);
    x.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    x.setRequestHeader('cache-control', 'max-age=31536000');
    if(onProg) x.upload.onprogress = e => { if(e.lengthComputable) onProg(e.loaded/e.total); };
    x.onload = () => {
      if(x.status>=200 && x.status<300) return res(path);
      let m = ''; try{ m = JSON.parse(x.responseText).message || ''; }catch(e){}
      if(x.status===413 || /exceeded|too large/i.test(m)) m = 'حجم الملف أكبر من المسموح في Supabase (الباقة المجانية 50MB)';
      else if(x.status===401 || x.status===403) m = 'مفيش صلاحية — اتأكد من الإيميل في ملف SQL وإنك مسجّل دخول';
      rej(new Error(m || ('فشل الرفع ('+x.status+')')));
    };
    x.onerror = () => rej(new Error('مشكلة في الاتصال أثناء الرفع'));
    x.send(blob);
  });
}
async function removeFiles(paths){
  const tk = await token(false).catch(()=>null); if(!tk) return;
  await Promise.all(paths.filter(Boolean).map(p => fetch(BASE+'/storage/v1/object/'+BUCKET+'/'+p, { method:'DELETE', headers:{ apikey:KEY, Authorization:'Bearer '+tk } }).catch(()=>{})));
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const extOf = f => { const m = /\.([a-z0-9]{2,5})$/i.exec(f.name||''); return m ? m[1].toLowerCase() : 'mp4'; };

/* ---------- تحميل الأعمال من قاعدة البيانات ---------- */
const toProject = r => ({
  id:'db'+r.id, dbId:r.id, _db:true, title_ar:r.title_ar||'', title_en:r.title_en||'', desc:r.descr||'',
  cat:r.cat||'other', ar:r.ar||'16:9', dur:r.dur||'', soft:r.soft||'', status:r.status||'published',
  thumb:r.thumb||'', video:r.video||'', video_path:r.video_path||'', thumb_path:r.thumb_path||''
});
async function loadDB(){
  try{
    const r = await rest('projects?select=*&order=created_at.desc&limit=300');
    if(!r.ok) return;
    const rows = await r.json();
    for(let i=P.length-1;i>=0;i--) if(P[i]._db) P.splice(i,1);
    P.unshift.apply(P, rows.map(toProject));
    API.rerender(); decorate();
  }catch(e){}
}

/* ---------- Toast ---------- */
let tt;
function toast(msg, bad){
  const e = $('toast'); if(!e) return;
  e.textContent = msg; e.classList.toggle('err', !!bad); e.classList.add('show');
  clearTimeout(tt); tt = setTimeout(()=>e.classList.remove('show'), 3500);
}

/* ---------- أزرار الكروت (تعديل / إخفاء / حذف) ---------- */
function decorate(){
  if(!window.MK_ADMIN) return;
  document.querySelectorAll('#grid .pcard, #latestGrid .pcard').forEach(card=>{
    if(card.querySelector('.mk-bar')) return;
    const p = P.find(x => x.id === card.getAttribute('data-id'));
    if(!p || !p._db) return;
    card.classList.toggle('mk-draft', p.status !== 'published');
    const bar = document.createElement('div'); bar.className = 'mk-bar';
    bar.innerHTML =
      (p.status !== 'published' ? '<span class="mk-badge">مخفي</span>' : '') +
      '<button type="button" data-a="edit" title="تعديل">'+IC.edit+'</button>'+
      '<button type="button" data-a="vis" title="'+(p.status==='published'?'إخفاء':'إظهار')+'">'+(p.status==='published'?IC.eyeoff:IC.eye)+'</button>'+
      '<button type="button" data-a="del" class="mk-del" title="حذف">'+IC.trash+'</button>';
    ['click','keydown','pointerdown'].forEach(ev => bar.addEventListener(ev, e => e.stopPropagation()));
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      const a = b.getAttribute('data-a');
      if(a==='edit') openForm(p); else if(a==='vis') toggleVis(p); else if(a==='del') delProject(p, b);
    });
    card.appendChild(bar);
  });
}
['grid','latestGrid'].forEach(id => { const el = $(id); if(el) new MutationObserver(decorate).observe(el, { childList:true }); });

async function toggleVis(p){
  const next = p.status === 'published' ? 'draft' : 'published';
  try{
    const r = await rest('projects?id=eq.'+encodeURIComponent(p.dbId), { method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify({ status:next }) });
    if(!r.ok || !(await r.json()).length) throw 0;
    p.status = next; API.rerender(); decorate();
    toast(next==='published' ? 'العمل ظاهر دلوقتي للزوار' : 'العمل اتخفى عن الزوار');
  }catch(e){ toast('معرفتش أغيّر الحالة (تأكد إنك مسجّل دخول)', true); }
}
async function delProject(p, btn){
  if(!btn.classList.contains('armed')){
    btn.classList.add('armed'); btn.insertAdjacentHTML('beforeend','<span> تأكيد الحذف؟</span>');
    setTimeout(()=>{ if(btn.isConnected){ btn.classList.remove('armed'); const s = btn.querySelector('span'); if(s) s.remove(); } }, 3000);
    return;
  }
  btn.disabled = true;
  try{
    const r = await rest('projects?id=eq.'+encodeURIComponent(p.dbId), { method:'DELETE', headers:{Prefer:'return=representation'} });
    if(!r.ok || !(await r.json()).length) throw 0;
    await removeFiles([p.video_path, p.thumb_path]);
    const i = P.indexOf(p); if(i>-1) P.splice(i,1);
    API.rerender(); decorate(); toast('تم حذف العمل');
  }catch(e){ btn.disabled = false; toast('معرفتش أحذف (تأكد إنك مسجّل دخول)', true); }
}

/* ---------- نافذة الإضافة / التعديل ---------- */
let mode = 'add', editing = null, vidFile = null, thumbBlob = null, thumbChanged = false, busy = false;
const opts = list => list.map(o => '<option value="'+o[0]+'">'+o[1]+'</option>').join('');

function buildModal(){
  if($('mkOv')) return;
  const ov = document.createElement('div');
  ov.className = 'cm-ov'; ov.id = 'mkOv'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-hidden','true');
  ov.innerHTML =
   '<div class="cm-modal mk-modal">'+
     '<button type="button" class="cm-x" id="mkClose" aria-label="close">&times;</button>'+
     '<h3 class="cm-mtitle" id="mkTitle"></h3>'+
     '<div id="mkVidWrap"><label class="mk-file"><input type="file" id="mkVid" accept="video/*" hidden><span id="mkVidName">اختر ملف الفيديو من جهازك</span></label></div>'+
     '<div class="mk-thumbrow"><div class="mk-thumb" id="mkThumb"><span>صورة مصغّرة</span></div>'+
       '<div class="mk-thumbside"><button type="button" class="mk-link" id="mkPick">اختار صورة مصغّرة بنفسي</button><input type="file" id="mkImg" accept="image/*" hidden>'+
       '<small>لو ما اخترتش، هتتاخد تلقائي من الفيديو</small></div></div>'+
     '<input id="mkTa" class="cm-input" type="text" placeholder="الاسم بالعربي" maxlength="80">'+
     '<input id="mkTe" class="cm-input" type="text" placeholder="الاسم بالإنجليزي (Project name)" maxlength="80" dir="ltr">'+
     '<textarea id="mkDesc" class="cm-input" rows="3" placeholder="وصف قصير" maxlength="300" style="min-height:70px"></textarea>'+
     '<div class="mk-two"><select id="mkCat" class="cm-input mk-sel">'+opts(CATS)+'</select><select id="mkAr" class="cm-input mk-sel">'+opts(ARS)+'</select></div>'+
     '<div class="mk-two"><input id="mkDur" class="cm-input" type="text" placeholder="المدة 00:30" maxlength="10" dir="ltr"><select id="mkStatus" class="cm-input mk-sel"><option value="published">ظاهر للزوار</option><option value="draft">مخفي (مسودة)</option></select></div>'+
     '<input id="mkSoft" class="cm-input" type="text" placeholder="البرامج: Premiere Pro, After Effects" maxlength="120" dir="ltr">'+
     '<div class="mk-bar-wrap" id="mkProgWrap" hidden><div class="mk-prog"><i id="mkProg"></i></div></div>'+
     '<div id="mkStatusMsg" class="cm-status" role="status" aria-live="polite"></div>'+
     '<div class="cm-actions"><button type="button" class="btn ghost" id="mkCancel">إلغاء</button><button type="button" class="btn primary" id="mkSave">حفظ</button></div>'+
   '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if(e.target===ov && !busy) closeForm(); });
  $('mkClose').onclick = $('mkCancel').onclick = () => { if(!busy) closeForm(); };
  $('mkVid').onchange = e => onVideo(e.target.files[0]);
  $('mkPick').onclick = () => $('mkImg').click();
  $('mkImg').onchange = onImg;
  $('mkSave').onclick = save;
  document.addEventListener('keydown', e => { if(e.key==='Escape' && ov.classList.contains('open') && !busy) closeForm(); });
}
const say = (m, bad) => { const e = $('mkStatusMsg'); e.textContent = m||''; e.className = 'cm-status' + (bad?' bad':' good'); };
function showThumb(src){ $('mkThumb').innerHTML = src ? '<img src="'+esc(src)+'" alt="">' : '<span>صورة مصغّرة</span>'; }
let thumbObj = null;
function setThumbBlob(b){ if(thumbObj) URL.revokeObjectURL(thumbObj); thumbBlob = b; thumbObj = b ? URL.createObjectURL(b) : null; showThumb(thumbObj); }

function openForm(p){
  buildModal();
  mode = p ? 'edit' : 'add'; editing = p || null; vidFile = null; thumbChanged = false;
  setThumbBlob(null); $('mkVid').value = ''; $('mkImg').value = '';
  $('mkTitle').textContent = p ? 'تعديل العمل' : 'إضافة عمل جديد';
  $('mkVidWrap').hidden = !!p;
  $('mkVidName').textContent = 'اختر ملف الفيديو من جهازك';
  $('mkTa').value = p ? p.title_ar : ''; $('mkTe').value = p ? p.title_en : '';
  $('mkDesc').value = p ? p.desc : ''; $('mkCat').value = p ? p.cat : 'short';
  $('mkAr').value = p ? p.ar : '16:9'; $('mkDur').value = p ? p.dur : '';
  $('mkStatus').value = p ? p.status : 'published'; $('mkSoft').value = p ? p.soft : '';
  if(p) showThumb(p.thumb);
  $('mkProgWrap').hidden = true; $('mkProg').style.width = '0'; say('');
  $('mkSave').textContent = p ? 'حفظ التعديلات' : 'رفع ونشر';
  const ov = $('mkOv'); ov.classList.add('open'); ov.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden';
}
function closeForm(){
  const ov = $('mkOv'); if(!ov) return;
  ov.classList.remove('open'); ov.setAttribute('aria-hidden','true');
  const pf = document.querySelector('.portfolio-page.show'); document.body.style.overflow = pf ? 'hidden' : '';
}

/* قراءة بيانات الفيديو: النسبة + المدة + صورة مصغّرة من لقطة */
function probe(file){
  return new Promise(res => {
    const url = URL.createObjectURL(file), v = document.createElement('video'), out = {}; let done = false;
    const fin = () => { if(done) return; done = true; URL.revokeObjectURL(url); res(out); };
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = () => {
      out.w = v.videoWidth; out.h = v.videoHeight; out.d = v.duration;
      try{ v.currentTime = Math.min(1, (v.duration||2)/3); }catch(e){ fin(); }
    };
    v.onseeked = () => {
      try{
        const sc = Math.min(1, 720/Math.max(v.videoWidth, v.videoHeight)), c = document.createElement('canvas');
        c.width = Math.round(v.videoWidth*sc); c.height = Math.round(v.videoHeight*sc);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(b => { out.thumb = b; fin(); }, 'image/jpeg', .85);
      }catch(e){ fin(); }
    };
    v.onerror = fin; setTimeout(fin, 20000); v.src = url;
  });
}
const fmtDur = s => { s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60, p = n => String(n).padStart(2,'0'); return h ? h+':'+p(m)+':'+p(x) : p(m)+':'+p(x); };
const fmtSize = b => b > 1048576 ? (b/1048576).toFixed(1)+' MB' : Math.round(b/1024)+' KB';

async function onVideo(f){
  if(!f) return;
  if(!/^video\//.test(f.type) && !/\.(mp4|mov|webm|mkv|m4v)$/i.test(f.name)) return say('الملف لازم يكون فيديو', true);
  vidFile = f; $('mkVidName').textContent = f.name + '  ('+fmtSize(f.size)+')';
  say('بقرأ بيانات الفيديو...');
  const m = await probe(f);
  if(m.w && m.h){ const r = m.w/m.h; $('mkAr').value = r >= 1.2 ? '16:9' : r <= .8 ? '9:16' : '1:1'; }
  if(m.d && isFinite(m.d)) $('mkDur').value = fmtDur(m.d);
  if(m.thumb && !thumbChanged) setThumbBlob(m.thumb);
  say(m.w ? 'تم — راجع البيانات واضغط رفع' : 'المتصفح مقدرش يقرأ الفيديو، اكتب المدة والنسبة بإيدك', !m.w);
}
function onImg(e){
  const f = e.target.files[0]; e.target.value = ''; if(!f || !/^image\//.test(f.type)) return;
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const sc = Math.min(1, 720/Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width*sc); c.height = Math.round(img.height*sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    c.toBlob(b => { thumbChanged = true; setThumbBlob(b); }, 'image/jpeg', .88);
  };
  img.onerror = () => { URL.revokeObjectURL(url); say('الصورة مش مقروءة', true); };
  img.src = url;
}

async function save(){
  if(busy) return;
  const ta = $('mkTa').value.trim(), te = $('mkTe').value.trim();
  if(mode==='add' && !vidFile) return say('اختار ملف الفيديو الأول', true);
  if(!ta && !te) return say('اكتب اسم للعمل (عربي أو إنجليزي)', true);
  const row = {
    title_ar: ta || te, title_en: te || ta, descr: $('mkDesc').value.trim(),
    cat: $('mkCat').value, ar: $('mkAr').value, dur: $('mkDur').value.trim(),
    soft: $('mkSoft').value.trim(), status: $('mkStatus').value
  };
  busy = true; const btn = $('mkSave'); btn.disabled = true; say('');
  const prog = $('mkProg'); $('mkProgWrap').hidden = true;
  const up = [];
  try{
    if(mode==='add'){
      $('mkProgWrap').hidden = false; btn.textContent = 'جاري رفع الفيديو...';
      const vp = 'videos/'+uid()+'.'+extOf(vidFile);
      await upload(vp, vidFile, f => { prog.style.width = Math.round(f*95)+'%'; }); up.push(vp);
      row.video = pubUrl(vp); row.video_path = vp;
      if(thumbBlob){ const tp = 'thumbs/'+uid()+'.jpg'; await upload(tp, thumbBlob); up.push(tp); row.thumb = pubUrl(tp); row.thumb_path = tp; }
      prog.style.width = '98%'; btn.textContent = 'بحفظ البيانات...';
      const r = await rest('projects', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(row) });
      if(!r.ok) throw new Error('معرفتش أحفظ البيانات — اتأكد إنك شغّلت ملف admin-setup.sql');
      prog.style.width = '100%';
    }else{
      btn.textContent = 'بحفظ...';
      let oldThumb = null;
      if(thumbChanged && thumbBlob){
        const tp = 'thumbs/'+uid()+'.jpg'; await upload(tp, thumbBlob); up.push(tp);
        row.thumb = pubUrl(tp); row.thumb_path = tp; oldThumb = editing.thumb_path;
      }
      const r = await rest('projects?id=eq.'+encodeURIComponent(editing.dbId), { method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(row) });
      if(!r.ok || !(await r.json()).length) throw new Error('معرفتش أحفظ التعديل (تأكد إنك مسجّل دخول)');
      if(oldThumb) removeFiles([oldThumb]);
    }
    busy = false; btn.disabled = false; closeForm();
    toast(mode==='add' ? 'تم رفع العمل ✓' : 'تم حفظ التعديلات ✓');
    await loadDB();
  }catch(e){
    if(up.length) removeFiles(up);               // نظّف اللي اترفع لو حصلت مشكلة
    say(e.message || 'حصلت مشكلة، حاول تاني', true);
    busy = false; btn.disabled = false; btn.textContent = mode==='add' ? 'رفع ونشر' : 'حفظ التعديلات';
  }
}

/* ---------- علامة الأدمن في الشريط العلوي ---------- */
function mountButtons(){
  document.querySelectorAll('#nav .navctrls, .pfnav .navctrls').forEach(box => {
    if(box.querySelector('.mk-addbtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pillbtn mk-addbtn'; b.title = 'إضافة عمل جديد';
    b.innerHTML = IC.plus + '<span>إضافة عمل</span>';
    b.onclick = () => openForm(null);
    box.insertBefore(b, box.firstChild);
  });
}
function unmountButtons(){ document.querySelectorAll('.mk-addbtn,.mk-bar').forEach(e => e.remove()); document.querySelectorAll('.mk-draft').forEach(e => e.classList.remove('mk-draft')); }

let adminOn = null;
function sync(){
  const on = !!getSession();
  if(on === adminOn) return;
  adminOn = on; window.MK_ADMIN = on;
  if(on) mountButtons(); else { unmountButtons(); closeForm(); }
  loadDB();
}

/* ---------- ستايل ---------- */
const css = document.createElement('style');
css.textContent = `
.mk-addbtn{display:inline-flex;align-items:center;gap:6px;color:#fff!important;border-color:transparent!important;font-weight:700;cursor:pointer;font-family:inherit;
  background:linear-gradient(90deg,var(--blue),var(--purple))!important;box-shadow:0 6px 18px -6px color-mix(in srgb,var(--blue) 70%,transparent)}
.mk-addbtn:hover{box-shadow:0 8px 26px -4px color-mix(in srgb,var(--purple) 75%,transparent)}
.mk-bar{position:absolute;top:8px;inset-inline-start:8px;z-index:4;display:flex;gap:6px;align-items:center;direction:ltr}
.mk-bar button{display:inline-flex;align-items:center;gap:4px;height:32px;min-width:32px;justify-content:center;padding:0 8px;border-radius:100px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;
  border:1px solid rgba(255,255,255,.25);background:rgba(8,12,24,.72);color:#fff;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:.25s}
.mk-bar button:hover{background:color-mix(in srgb,var(--blue) 70%,#000);box-shadow:0 0 18px color-mix(in srgb,var(--blue) 60%,transparent)}
.mk-bar .mk-del:hover,.mk-bar .mk-del.armed{background:#ff6b7a;border-color:#ff6b7a;box-shadow:0 0 18px rgba(255,107,122,.6)}
.mk-badge{padding:5px 10px;border-radius:100px;font-size:11px;font-weight:800;background:#f5a524;color:#1a1200}
.pcard{position:relative}
.pcard.mk-draft{opacity:.6}
.pcard.mk-draft:hover{opacity:1}
.mk-modal{max-height:100%;gap:12px}
.mk-file{display:flex;align-items:center;justify-content:center;text-align:center;padding:20px 14px;border:1.5px dashed var(--border2);border-radius:14px;cursor:pointer;
  color:var(--text2);font-size:14px;transition:.25s;overflow-wrap:anywhere}
.mk-file:hover{border-color:var(--blue);color:var(--text);background:color-mix(in srgb,var(--blue) 8%,transparent)}
.mk-thumbrow{display:flex;gap:14px;align-items:center}
.mk-thumb{width:92px;height:64px;flex-shrink:0;border-radius:10px;border:1px dashed var(--border2);overflow:hidden;display:flex;align-items:center;justify-content:center;
  font-size:11px;color:var(--text3);text-align:center;background:color-mix(in srgb,var(--bg) 40%,transparent)}
.mk-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.mk-thumbside{display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.mk-thumbside small{color:var(--text3);font-size:12px}
.mk-link{background:none;border:0;padding:0;color:var(--blue);text-decoration:underline;cursor:pointer;font-size:13.5px;font-weight:600;font-family:inherit}
.mk-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mk-sel{appearance:auto;cursor:pointer}
.mk-sel option{background:var(--card);color:var(--text)}
.mk-prog{height:8px;border-radius:100px;background:color-mix(in srgb,var(--text) 12%,transparent);overflow:hidden}
.mk-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--blue),var(--purple));transition:width .2s}
@media (max-width:640px){.mk-addbtn span{display:none}.mk-addbtn{padding:8px 11px}.mk-two{grid-template-columns:1fr}}
`;
document.head.appendChild(css);

/* ---------- تشغيل ---------- */
adminOn = !!getSession(); window.MK_ADMIN = adminOn;
if(adminOn) mountButtons();
loadDB();
setInterval(sync, 1000);            // بيلقط الدخول/الخروج اللي بيحصل من قسم التعليقات
})();
