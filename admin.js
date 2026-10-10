/* ============================================================
   MoKnight — لوحة الأدمن (رفع / تعديل / إخفاء / حذف الأعمال)
   v2: عربي + إنجليزي، قوايم بتتمدد من النص، اختيار البرامج، حركات
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

/* ---------- القوايم (القيمة، عربي، إنجليزي) ---------- */
const CATS = [['editing','مونتاج','Video Editing'],['motion','موشن جرافيك','Motion Graphics'],['thumb','صور مصغّرة','Thumbnails'],['short','فيديو قصير','Short Video'],['long','فيديو طويل','Long Video'],['other','أخرى','Other']];
const ARS  = [['16:9','أفقي 16:9','Horizontal 16:9'],['9:16','عمودي 9:16','Vertical 9:16'],['1:1','مربع 1:1','Square 1:1']];
const STAT = [['published','ظاهر للزوار','Visible to visitors'],['draft','مخفي (مسودة)','Hidden (draft)']];
const LISTS = { cat:CATS, ar:ARS, status:STAT };
/* البرامج اللي تختار منها — تقدر تزوّد عليها هنا */
const SOFT = ['Premiere Pro','After Effects','Photoshop','Illustrator'];

/* ---------- النصوص ---------- */
const TX = {
  ar:{
    add:'إضافة عمل', addT:'إضافة عمل جديد', editT:'تعديل العمل',
    pickVid:'اختر ملف الفيديو من جهازك', thumb:'صورة مصغّرة', pickThumb:'اختار صورة مصغّرة بنفسي', thumbHint:'لو ما اخترتش، هتتاخد تلقائي من الفيديو',
    nameAr:'الاسم بالعربي', nameEn:'الاسم بالإنجليزي (Project name)', desc:'وصف قصير',
    lCat:'التصنيف', lAr:'شكل الفيديو', lDur:'المدة', lStatus:'الحالة', lSoft:'البرامج المستخدمة (تقدر تختار أكتر من واحد)',
    cancel:'إلغاء', upload:'رفع ونشر', saveEdit:'حفظ التعديلات',
    uploading:'جاري رفع الفيديو...', saving:'بحفظ البيانات...', savingShort:'بحفظ...',
    reading:'بقرأ بيانات الفيديو...', readOk:'تم — راجع البيانات واضغط رفع', readFail:'المتصفح مقدرش يقرأ الفيديو، اكتب المدة والنسبة بإيدك',
    notVideo:'الملف لازم يكون فيديو', pickFirst:'اختار ملف الفيديو الأول', needName:'اكتب اسم للعمل (عربي أو إنجليزي)',
    errSave:'معرفتش أحفظ البيانات — اتأكد إنك شغّلت ملف admin-setup.sql', errEdit:'معرفتش أحفظ التعديل (تأكد إنك مسجّل دخول)',
    errImg:'الصورة مش مقروءة', relogin:'سجّل دخول الأدمن تاني', tooBig:'حجم الملف أكبر من المسموح في Supabase (الباقة المجانية 50MB)',
    noPerm:'مفيش صلاحية — اتأكد من الإيميل في ملف SQL وإنك مسجّل دخول', conn:'مشكلة في الاتصال أثناء الرفع', failUp:'فشل الرفع', errGen:'حصلت مشكلة، حاول تاني',
    done:'تم رفع العمل ✓', doneEdit:'تم حفظ التعديلات ✓', shown:'العمل ظاهر دلوقتي للزوار', hidden:'العمل اتخفى عن الزوار',
    errVis:'معرفتش أغيّر الحالة (تأكد إنك مسجّل دخول)', deleted:'تم حذف العمل', errDel:'معرفتش أحذف (تأكد إنك مسجّل دخول)',
    edit:'تعديل', hide:'إخفاء', show:'إظهار', del:'حذف', sure:'تأكيد الحذف؟', badge:'مخفي',
    nameTaken:'الاسم ده مستخدم قبل كده، اختار اسم تاني', dailyLimit:'ينفع تكتب تعليق واحد بس كل 24 ساعة'
  },
  en:{
    add:'Add work', addT:'Add a new work', editT:'Edit work',
    pickVid:'Choose a video file from your device', thumb:'Thumbnail', pickThumb:'Choose my own thumbnail', thumbHint:'If you skip it, a frame from the video is used',
    nameAr:'Title in Arabic', nameEn:'Title in English', desc:'Short description',
    lCat:'Category', lAr:'Video shape', lDur:'Duration', lStatus:'Status', lSoft:'Tools used (pick as many as you like)',
    cancel:'Cancel', upload:'Upload & publish', saveEdit:'Save changes',
    uploading:'Uploading video...', saving:'Saving details...', savingShort:'Saving...',
    reading:'Reading video info...', readOk:'Done — review the details and hit upload', readFail:"Couldn't read the video, enter duration and shape manually",
    notVideo:'The file must be a video', pickFirst:'Choose a video file first', needName:'Enter a title (Arabic or English)',
    errSave:"Couldn't save the details — make sure you ran admin-setup.sql", errEdit:"Couldn't save the changes (make sure you're signed in)",
    errImg:"Couldn't read that image", relogin:'Please sign in as admin again', tooBig:'File is larger than Supabase allows (free plan: 50MB)',
    noPerm:'No permission — check the email in the SQL file and that you are signed in', conn:'Connection problem while uploading', failUp:'Upload failed', errGen:'Something went wrong, try again',
    done:'Work uploaded ✓', doneEdit:'Changes saved ✓', shown:'The work is now visible to visitors', hidden:'The work is now hidden from visitors',
    errVis:"Couldn't change visibility (make sure you're signed in)", deleted:'Work deleted', errDel:"Couldn't delete (make sure you're signed in)",
    edit:'Edit', hide:'Hide', show:'Show', del:'Delete', sure:'Confirm delete?', badge:'Hidden',
    nameTaken:'This name is already taken, please choose another', dailyLimit:'You can only post one comment every 24 hours'
  }
};
const L = () => document.documentElement.lang === 'en' ? 'en' : 'ar';
const t = k => TX[L()][k];
const lab = o => L()==='en' ? o[2] : o[1];

const IC = {
  plus:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
  edit:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  eye:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 5.1A10.7 10.7 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/></svg>',
  trash:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14"/></svg>',
  chev:'<svg class="mk-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>',
  check:'<svg class="mk-tick" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>',
  upl:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4m0 0l-4 4m4-4l4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>'
};

/* ---------- الجلسة (نفس تسجيل دخول التعليقات) ---------- */
const getSession = () => { try{ return JSON.parse(localStorage.getItem(LS_ADMIN)||'null'); }catch(e){ return null; } };
const setSession = s => { try{ s ? localStorage.setItem(LS_ADMIN, JSON.stringify(s)) : localStorage.removeItem(LS_ADMIN); }catch(e){} };
function jwtExp(tk){ try{ return JSON.parse(atob(tk.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp; }catch(e){ return 0; } }
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

/* ---------- التعليقات: الأدمن معفي من الحدود + رسائل واضحة للزائر ---------- */
(function(){
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : ((input && input.url) || '');
    const isPost = !!init && /^POST$/i.test(init.method || '') && url.indexOf(BASE+'/rest/v1/comments') === 0;
    if(!isPost) return nativeFetch(input, init);
    try{                                           // لو الأدمن داخل: ابعت التعليق بصلاحيته عشان السيرفر يعفيه
      if(getSession()){
        const tk = await token(false);
        if(tk) init = Object.assign({}, init, { headers: Object.assign({}, init.headers, { Authorization:'Bearer '+tk }) });
      }
    }catch(e){}
    const r = await nativeFetch(input, init);
    if(!r.ok){
      r.clone().json().then(j => {
        const m = String((j && j.message) || '');
        const msg = /name_taken/.test(m) ? t('nameTaken') : /daily_limit/.test(m) ? t('dailyLimit') : '';
        if(!msg) return;
        setTimeout(() => { const e = $('cmStatus'); if(e){ e.textContent = msg; e.className = 'cm-status bad'; } }, 60);
      }).catch(()=>{});
    }
    return r;
  };
})();

/* ---------- تخزين الملفات ---------- */
const pubUrl = path => BASE+'/storage/v1/object/public/'+BUCKET+'/'+path;
function upload(path, blob, onProg){
  return new Promise(async (res, rej)=>{
    let tk; try{ tk = await token(false); }catch(e){ return rej(new Error(t('relogin'))); }
    if(!tk) return rej(new Error(t('relogin')));
    const x = new XMLHttpRequest();
    x.open('POST', BASE+'/storage/v1/object/'+BUCKET+'/'+path);
    x.setRequestHeader('apikey', KEY); x.setRequestHeader('Authorization', 'Bearer '+tk);
    x.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    x.setRequestHeader('cache-control', 'max-age=31536000');
    if(onProg) x.upload.onprogress = e => { if(e.lengthComputable) onProg(e.loaded/e.total); };
    x.onload = () => {
      if(x.status>=200 && x.status<300) return res(path);
      let m = ''; try{ m = JSON.parse(x.responseText).message || ''; }catch(e){}
      if(x.status===413 || /exceeded|too large/i.test(m)) m = t('tooBig');
      else if(x.status===401 || x.status===403) m = t('noPerm');
      rej(new Error(m || (t('failUp')+' ('+x.status+')')));
    };
    x.onerror = () => rej(new Error(t('conn')));
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
      (p.status !== 'published' ? '<span class="mk-badge">'+t('badge')+'</span>' : '') +
      '<button type="button" data-a="edit" title="'+t('edit')+'">'+IC.edit+'</button>'+
      '<button type="button" data-a="vis" title="'+(p.status==='published'?t('hide'):t('show'))+'">'+(p.status==='published'?IC.eyeoff:IC.eye)+'</button>'+
      '<button type="button" data-a="del" class="mk-del" title="'+t('del')+'">'+IC.trash+'</button>';
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
    toast(next==='published' ? t('shown') : t('hidden'));
  }catch(e){ toast(t('errVis'), true); }
}
async function delProject(p, btn){
  if(!btn.classList.contains('armed')){
    btn.classList.add('armed'); btn.insertAdjacentHTML('beforeend','<span>'+t('sure')+'</span>');
    setTimeout(()=>{ if(btn.isConnected){ btn.classList.remove('armed'); const s = btn.querySelector('span'); if(s) s.remove(); } }, 3000);
    return;
  }
  btn.disabled = true;
  try{
    const r = await rest('projects?id=eq.'+encodeURIComponent(p.dbId), { method:'DELETE', headers:{Prefer:'return=representation'} });
    if(!r.ok || !(await r.json()).length) throw 0;
    await removeFiles([p.video_path, p.thumb_path]);
    const i = P.indexOf(p); if(i>-1) P.splice(i,1);
    API.rerender(); decorate(); toast(t('deleted'));
  }catch(e){ btn.disabled = false; toast(t('errDel'), true); }
}

/* ---------- نافذة الإضافة / التعديل ---------- */
let mode = 'add', editing = null, vidFile = null, thumbBlob = null, thumbChanged = false, busy = false;
const val = { cat:'short', ar:'16:9', status:'published' };
let softSel = [], softExtra = [];

const ddHTML = n => '<div class="mk-dd" id="mkdd-'+n+'" data-n="'+n+'"><button type="button" class="mk-dd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="mk-dd-val"></span>'+IC.chev+'</button><div class="mk-dd-list" role="listbox"></div></div>';
const fieldHTML = (lbl, inner) => '<div class="mk-field"><span class="mk-lbl" data-l="'+lbl+'"></span>'+inner+'</div>';

function buildModal(){
  if($('mkOv')) return;
  const ov = document.createElement('div');
  ov.className = 'cm-ov'; ov.id = 'mkOv'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-hidden','true');
  ov.innerHTML =
   '<div class="cm-modal mk-modal">'+
     '<button type="button" class="cm-x" id="mkClose" aria-label="close">&times;</button>'+
     '<h3 class="cm-mtitle" id="mkTitle"></h3>'+
     '<div id="mkVidWrap"><label class="mk-file" id="mkFile"><input type="file" id="mkVid" accept="video/*" hidden>'+IC.upl+'<span id="mkVidName"></span></label></div>'+
     '<div class="mk-thumbrow"><div class="mk-thumb" id="mkThumb"></div>'+
       '<div class="mk-thumbside"><button type="button" class="mk-link" id="mkPick"></button><input type="file" id="mkImg" accept="image/*" hidden><small id="mkHint"></small></div></div>'+
     '<input id="mkTa" class="cm-input" type="text" maxlength="80">'+
     '<input id="mkTe" class="cm-input" type="text" maxlength="80" dir="ltr">'+
     '<textarea id="mkDesc" class="cm-input" rows="3" maxlength="300" style="min-height:70px"></textarea>'+
     '<div class="mk-two">'+fieldHTML('lCat', ddHTML('cat'))+fieldHTML('lAr', ddHTML('ar'))+'</div>'+
     '<div class="mk-two">'+fieldHTML('lDur','<input id="mkDur" class="cm-input" type="text" placeholder="00:30" maxlength="10" dir="ltr">')+fieldHTML('lStatus', ddHTML('status'))+'</div>'+
     '<div class="mk-field"><span class="mk-lbl" data-l="lSoft"></span><div class="mk-chips" id="mkChips"></div></div>'+
     '<div class="mk-prog-wrap" id="mkProgWrap" hidden><div class="mk-prog"><i id="mkProg"></i></div></div>'+
     '<div id="mkStatusMsg" class="cm-status" role="status" aria-live="polite"></div>'+
     '<div class="cm-actions"><button type="button" class="btn ghost" id="mkCancel"></button><button type="button" class="btn primary" id="mkSave"></button></div>'+
   '</div>';
  document.body.appendChild(ov);
  Array.prototype.forEach.call(ov.querySelector('.mk-modal').children, (c,i) => c.style.setProperty('--i', i));

  ov.addEventListener('click', e => {
    const ob = e.target.closest('.mk-dd-opt');
    if(ob){ setVal(ob.closest('.mk-dd').getAttribute('data-n'), ob.getAttribute('data-v')); closeDDs(); return; }
    const bt = e.target.closest('.mk-dd-btn');
    if(bt){ const dd = bt.parentNode; dd.classList.contains('open') ? closeDDs() : openDD(dd); return; }
    const ch = e.target.closest('.mk-chip');
    if(ch){ toggleSoft(ch.getAttribute('data-s')); return; }
    closeDDs();
    if(e.target===ov && !busy) closeForm();
  });
  $('mkClose').onclick = $('mkCancel').onclick = () => { if(!busy) closeForm(); };
  $('mkVid').onchange = e => onVideo(e.target.files[0]);
  $('mkPick').onclick = () => $('mkImg').click();
  $('mkImg').onchange = onImg;
  $('mkSave').onclick = save;
  // Escape: يقفل القايمة المفتوحة الأول، وبعدها النافذة
  document.addEventListener('keydown', e => {
    if(e.key!=='Escape' || !ov.classList.contains('open')) return;
    if(ov.querySelector('.mk-dd.open')){ closeDDs(); e.stopPropagation(); e.preventDefault(); return; }
    if(!busy) closeForm();
  }, true);
}

/* النصوص بتتغيّر حسب لغة الموقع */
function applyTexts(){
  const ov = $('mkOv'); if(!ov) return;
  $('mkTitle').textContent = mode==='edit' ? t('editT') : t('addT');
  $('mkVidName').textContent = vidFile ? vidFile.name + '  ('+fmtSize(vidFile.size)+')' : t('pickVid');
  $('mkPick').textContent = t('pickThumb'); $('mkHint').textContent = t('thumbHint');
  $('mkTa').placeholder = t('nameAr'); $('mkTe').placeholder = t('nameEn'); $('mkDesc').placeholder = t('desc');
  ov.querySelectorAll('[data-l]').forEach(el => { el.textContent = t(el.getAttribute('data-l')); });
  $('mkCancel').textContent = t('cancel');
  if(!busy) $('mkSave').textContent = mode==='edit' ? t('saveEdit') : t('upload');
  if(!thumbBlob && !(mode==='edit' && editing && editing.thumb)) showThumb(null);
  renderDD('cat'); renderDD('ar'); renderDD('status'); renderChips();
}
document.documentElement && new MutationObserver(() => {
  applyTexts(); updateAddBtns();
  document.querySelectorAll('.mk-bar').forEach(b => b.remove()); decorate();
}).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });

/* ---------- القوايم المنسدلة (بتتمدد من النص) ---------- */
function renderDD(n){
  const dd = $('mkdd-'+n); if(!dd) return;
  const list = LISTS[n], cur = list.find(o => o[0]===val[n]) || list[0];
  dd.querySelector('.mk-dd-val').textContent = lab(cur);
  dd.querySelector('.mk-dd-list').innerHTML = list.map((o,i) =>
    '<button type="button" role="option" class="mk-dd-opt'+(o[0]===val[n]?' sel':'')+'" data-v="'+o[0]+'" style="--i:'+i+'"><span>'+lab(o)+'</span>'+IC.check+'</button>').join('');
}
function setVal(n, v){ val[n] = v; renderDD(n); }
function closeDDs(except){
  document.querySelectorAll('.mk-dd.open').forEach(d => { if(d!==except){ d.classList.remove('open'); d.querySelector('.mk-dd-btn').setAttribute('aria-expanded','false'); } });
}
function openDD(dd){
  closeDDs(dd);
  const list = dd.querySelector('.mk-dd-list'), btn = dd.querySelector('.mk-dd-btn'), modal = $('mkOv').querySelector('.mk-modal');
  list.style.maxHeight = ''; list.style.top = '0px';
  const mr = modal.getBoundingClientRect(), br = btn.getBoundingClientRect();
  const minT = Math.max(mr.top, 0) + 8, maxB = Math.min(mr.bottom, window.innerHeight) - 8;
  list.style.maxHeight = Math.max(120, maxB - minT) + 'px';
  const h = list.offsetHeight, center = br.top + br.height/2;
  let top = center - h/2;
  top = Math.max(minT, Math.min(top, maxB - h));
  list.style.top = (top - br.top) + 'px';
  list.style.transformOrigin = '50% ' + (center - top) + 'px';
  dd.classList.add('open'); btn.setAttribute('aria-expanded','true');
  const sel = list.querySelector('.sel'); if(sel) sel.scrollIntoView({ block:'nearest' });
}

/* ---------- اختيار البرامج (أكتر من واحد) ---------- */
function renderChips(){
  const box = $('mkChips'); if(!box) return;
  box.innerHTML = SOFT.concat(softExtra).map(s =>
    '<button type="button" class="mk-chip'+(softSel.indexOf(s)>-1?' on':'')+'" data-s="'+esc(s)+'"><i>'+IC.check+'</i>'+esc(s)+'</button>').join('');
}
function toggleSoft(s){
  const i = softSel.indexOf(s);
  if(i>-1) softSel.splice(i,1); else softSel.push(s);
  renderChips();
}
const softValue = () => SOFT.concat(softExtra).filter(s => softSel.indexOf(s)>-1).join(', ');

const say = (m, bad) => { const e = $('mkStatusMsg'); e.textContent = m||''; e.className = 'cm-status' + (bad?' bad':' good'); };
function showThumb(src){ $('mkThumb').innerHTML = src ? '<img src="'+esc(src)+'" alt="">' : '<span>'+t('thumb')+'</span>'; }
let thumbObj = null;
function setThumbBlob(b){ if(thumbObj) URL.revokeObjectURL(thumbObj); thumbBlob = b; thumbObj = b ? URL.createObjectURL(b) : null; showThumb(thumbObj); }

function openForm(p){
  buildModal();
  mode = p ? 'edit' : 'add'; editing = p || null; vidFile = null; thumbChanged = false; closeDDs();
  setThumbBlob(null); $('mkVid').value = ''; $('mkImg').value = '';
  $('mkFile').classList.remove('has');
  $('mkVidWrap').hidden = !!p;
  $('mkTa').value = p ? p.title_ar : ''; $('mkTe').value = p ? p.title_en : '';
  $('mkDesc').value = p ? p.desc : '';
  $('mkDur').value = p ? p.dur : '';
  val.cat = p ? p.cat : 'short'; val.ar = p ? p.ar : '16:9'; val.status = p ? p.status : 'published';
  const list = p ? String(p.soft||'').split(',').map(s => s.trim()).filter(Boolean) : [];
  softSel = list.slice(); softExtra = list.filter(s => SOFT.indexOf(s)===-1);
  if(p) showThumb(p.thumb);
  $('mkProgWrap').hidden = true; $('mkProg').style.width = '0'; say('');
  busy = false; $('mkSave').disabled = false;
  applyTexts();
  const ov = $('mkOv'); ov.classList.add('open'); ov.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden';
}
function closeForm(){
  const ov = $('mkOv'); if(!ov) return;
  closeDDs(); ov.classList.remove('open'); ov.setAttribute('aria-hidden','true');
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
  if(!/^video\//.test(f.type) && !/\.(mp4|mov|webm|mkv|m4v)$/i.test(f.name)) return say(t('notVideo'), true);
  vidFile = f; $('mkFile').classList.add('has');
  $('mkVidName').textContent = f.name + '  ('+fmtSize(f.size)+')';
  say(t('reading'));
  const m = await probe(f);
  if(m.w && m.h){ const r = m.w/m.h; setVal('ar', r >= 1.2 ? '16:9' : r <= .8 ? '9:16' : '1:1'); }
  if(m.d && isFinite(m.d)) $('mkDur').value = fmtDur(m.d);
  if(m.thumb && !thumbChanged) setThumbBlob(m.thumb);
  say(m.w ? t('readOk') : t('readFail'), !m.w);
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
  img.onerror = () => { URL.revokeObjectURL(url); say(t('errImg'), true); };
  img.src = url;
}

async function save(){
  if(busy) return;
  const ta = $('mkTa').value.trim(), te = $('mkTe').value.trim();
  if(mode==='add' && !vidFile) return say(t('pickFirst'), true);
  if(!ta && !te) return say(t('needName'), true);
  const row = {
    title_ar: ta || te, title_en: te || ta, descr: $('mkDesc').value.trim(),
    cat: val.cat, ar: val.ar, dur: $('mkDur').value.trim(),
    soft: softValue(), status: val.status
  };
  busy = true; const btn = $('mkSave'); btn.disabled = true; say('');
  const prog = $('mkProg'); $('mkProgWrap').hidden = true;
  const up = [];
  try{
    if(mode==='add'){
      $('mkProgWrap').hidden = false; btn.textContent = t('uploading');
      const vp = 'videos/'+uid()+'.'+extOf(vidFile);
      await upload(vp, vidFile, f => { prog.style.width = Math.round(f*95)+'%'; }); up.push(vp);
      row.video = pubUrl(vp); row.video_path = vp;
      if(thumbBlob){ const tp = 'thumbs/'+uid()+'.jpg'; await upload(tp, thumbBlob); up.push(tp); row.thumb = pubUrl(tp); row.thumb_path = tp; }
      prog.style.width = '98%'; btn.textContent = t('saving');
      const r = await rest('projects', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(row) });
      if(!r.ok) throw new Error(t('errSave'));
      prog.style.width = '100%';
    }else{
      btn.textContent = t('savingShort');
      let oldThumb = null;
      if(thumbChanged && thumbBlob){
        const tp = 'thumbs/'+uid()+'.jpg'; await upload(tp, thumbBlob); up.push(tp);
        row.thumb = pubUrl(tp); row.thumb_path = tp; oldThumb = editing.thumb_path;
      }
      const r = await rest('projects?id=eq.'+encodeURIComponent(editing.dbId), { method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(row) });
      if(!r.ok || !(await r.json()).length) throw new Error(t('errEdit'));
      if(oldThumb) removeFiles([oldThumb]);
    }
    busy = false; btn.disabled = false; closeForm();
    toast(mode==='add' ? t('done') : t('doneEdit'));
    await loadDB();
  }catch(e){
    if(up.length) removeFiles(up);               // نظّف اللي اترفع لو حصلت مشكلة
    say(e.message || t('errGen'), true);
    busy = false; btn.disabled = false; btn.textContent = mode==='add' ? t('upload') : t('saveEdit');
  }
}

/* ---------- علامة الأدمن في الشريط العلوي ---------- */
function updateAddBtns(){ document.querySelectorAll('.mk-addbtn').forEach(b => { b.title = t('add'); const s = b.querySelector('span'); if(s) s.textContent = t('add'); }); }
function mountButtons(){
  document.querySelectorAll('#nav .navctrls, .pfnav .navctrls').forEach(box => {
    if(box.querySelector('.mk-addbtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pillbtn mk-addbtn';
    b.innerHTML = IC.plus + '<span></span>';
    b.onclick = () => openForm(null);
    box.insertBefore(b, box.firstChild);
  });
  updateAddBtns();
}
function unmountButtons(){ document.querySelectorAll('.mk-addbtn,.mk-bar').forEach(e => e.remove()); document.querySelectorAll('.mk-draft').forEach(e => e.classList.remove('mk-draft')); }

let adminOn = null;
function sync(){
  const on = !!getSession();
  if(on === adminOn) return;
  adminOn = on; window.MK_ADMIN = on;
   if(on){ mountButtons(); mountAbout(); } else { unmountButtons(); unmountAbout(); closeForm(); }
  loadDB();
}

/* ---------- ستايل + حركات ---------- */
const css = document.createElement('style');
css.textContent = `
/* إخفاء شريط التمرير في الموقع كله (التمرير نفسه شغال عادي) */
html,body,*{scrollbar-width:none;-ms-overflow-style:none}
*::-webkit-scrollbar,html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}

/* زرار الإضافة فوق */
.mk-addbtn{display:inline-flex;align-items:center;gap:6px;color:#fff!important;border-color:transparent!important;font-weight:700;cursor:pointer;font-family:inherit;
  background:linear-gradient(90deg,var(--blue),var(--purple))!important;box-shadow:0 6px 18px -6px color-mix(in srgb,var(--blue) 70%,transparent);transition:transform .3s,box-shadow .3s}
.mk-addbtn:hover{box-shadow:0 8px 26px -4px color-mix(in srgb,var(--purple) 75%,transparent);transform:translateY(-1px)}
.mk-addbtn:active{transform:scale(.95)}
.mk-addbtn svg{transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.mk-addbtn:hover svg{transform:rotate(90deg)}

/* أزرار الكروت */
.pcard{position:relative}
.mk-bar{position:absolute;top:8px;inset-inline-start:8px;z-index:4;display:flex;gap:6px;align-items:center;direction:ltr}
.mk-bar button{display:inline-flex;align-items:center;gap:4px;height:32px;min-width:32px;justify-content:center;padding:0 8px;border-radius:100px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;
  border:1px solid rgba(255,255,255,.25);background:rgba(8,12,24,.72);color:#fff;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:.25s}
.mk-bar button:hover{background:color-mix(in srgb,var(--blue) 70%,#000);box-shadow:0 0 18px color-mix(in srgb,var(--blue) 60%,transparent);transform:translateY(-1px)}
.mk-bar .mk-del:hover,.mk-bar .mk-del.armed{background:#ff6b7a;border-color:#ff6b7a;box-shadow:0 0 18px rgba(255,107,122,.6)}
.mk-badge{padding:5px 10px;border-radius:100px;font-size:11px;font-weight:800;background:#f5a524;color:#1a1200}
.pcard.mk-draft{opacity:.6}
.pcard.mk-draft:hover{opacity:1}

/* النافذة: من غير شريط تمرير أبيض */
#mkOv,.mk-modal,.mk-dd-list{scrollbar-width:none;-ms-overflow-style:none}
#mkOv::-webkit-scrollbar,.mk-modal::-webkit-scrollbar,.mk-dd-list::-webkit-scrollbar{display:none;width:0;height:0}
.mk-modal{max-height:100%;gap:12px}

/* دخول العناصر واحد ورا التاني */
@keyframes mkRise{from{opacity:0;transform:translateY(18px) scale(.98);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
.cm-ov.open .cm-modal>*:not(.cm-x):not(.cm-hp){animation:mkRise .6s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(var(--i,0)*45ms + 90ms)}
.cm-modal>:nth-child(2){--i:1}.cm-modal>:nth-child(3){--i:2}.cm-modal>:nth-child(4){--i:3}.cm-modal>:nth-child(5){--i:4}
.cm-modal>:nth-child(6){--i:5}.cm-modal>:nth-child(7){--i:6}.cm-modal>:nth-child(8){--i:7}.cm-modal>:nth-child(9){--i:8}

/* زرار "أضف تعليقًا": علامة + بتلف لما تقرّب الماوس، زي زرار إضافة عمل */
.cm-add{transition:box-shadow .5s cubic-bezier(.4,0,.2,1),transform .35s cubic-bezier(.4,0,.2,1),border-color .4s,background .35s}
.cm-add svg{transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.cm-add:hover svg,.cm-add:focus-visible svg{transform:rotate(90deg)}
@media (hover:hover){.cm-add:hover{transform:translateY(-2px)}}
.cm-add:active{transform:scale(.95)}
.cm-photo .cm-prev svg{transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.cm-photo:hover .cm-prev svg{transform:rotate(90deg)}
.cm-prev:hover{border-color:var(--blue)}
@keyframes mkPop{0%{opacity:0;transform:scale(.6) rotate(-4deg)}70%{transform:scale(1.06)}100%{opacity:1;transform:none}}
@keyframes mkFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes mkDash{to{background-position:200% 0}}
@keyframes mkShine{from{transform:translateX(-120%)}to{transform:translateX(220%)}}

/* منطقة اختيار الفيديو */
.mk-file{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:22px 14px;border:1.5px dashed var(--border2);border-radius:16px;cursor:pointer;
  color:var(--text2);font-size:14px;transition:.35s;overflow:hidden;overflow-wrap:anywhere}
.mk-file svg{color:var(--blue);animation:mkFloat 2.6s ease-in-out infinite}
.mk-file::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .35s;pointer-events:none;
  background:radial-gradient(220px circle at 50% 0%,color-mix(in srgb,var(--blue) 22%,transparent),transparent 70%)}
.mk-file:hover{border-color:var(--blue);color:var(--text);transform:translateY(-2px)}
.mk-file:hover::before{opacity:1}
.mk-file.has{border-style:solid;border-color:#3ecf8e;color:var(--text);background:color-mix(in srgb,#3ecf8e 8%,transparent)}
.mk-file.has svg{color:#3ecf8e;animation:none}

/* الصورة المصغّرة */
.mk-thumbrow{display:flex;gap:14px;align-items:center}
.mk-thumb{width:92px;height:64px;flex-shrink:0;border-radius:12px;border:1px dashed var(--border2);overflow:hidden;display:flex;align-items:center;justify-content:center;
  font-size:11px;color:var(--text3);text-align:center;background:color-mix(in srgb,var(--bg) 40%,transparent)}
.mk-thumb img{width:100%;height:100%;object-fit:cover;display:block;animation:mkPop .5s cubic-bezier(.2,.8,.2,1)}
.mk-thumbside{display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.mk-thumbside small{color:var(--text3);font-size:12px}
.mk-link{background:none;border:0;padding:0;color:var(--blue);text-decoration:underline;cursor:pointer;font-size:13.5px;font-weight:600;font-family:inherit;text-align:start}

/* الحقول */
.mk-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mk-field{min-width:0}
.mk-lbl{display:block;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px}

/* القوايم المنسدلة: بتتمدد من النص */
.mk-dd{position:relative}
.mk-dd.open{z-index:40}
.mk-dd-btn{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:46px;padding:12px 14px;text-align:start;cursor:pointer;
  background:color-mix(in srgb,var(--bg) 40%,transparent);border:1px solid var(--border2);border-radius:12px;color:var(--text);font-family:inherit;font-size:15px;transition:.3s}
.mk-dd-btn:hover{border-color:color-mix(in srgb,var(--blue) 70%,var(--border2))}
.mk-dd.open .mk-dd-btn,.mk-dd-btn:focus-visible{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--blue) 18%,transparent),0 0 26px -4px color-mix(in srgb,var(--blue) 45%,transparent)}
.mk-chev{flex-shrink:0;color:var(--text3);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.mk-dd.open .mk-chev{transform:rotate(180deg);color:var(--blue)}
.mk-dd-list{position:absolute;inset-inline:0;top:0;z-index:2;padding:6px;overflow-y:auto;border-radius:16px;
  background:color-mix(in srgb,var(--card) 96%,#000);border:1px solid color-mix(in srgb,var(--blue) 55%,var(--border2));
  box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 40px -10px color-mix(in srgb,var(--blue) 60%,transparent);
  visibility:hidden;opacity:0;pointer-events:none;transform:scaleY(.12) scaleX(.94);
  transition:transform .32s cubic-bezier(.4,0,.2,1),opacity .18s ease,visibility 0s linear .32s}
.mk-dd.open .mk-dd-list{visibility:visible;opacity:1;pointer-events:auto;transform:none;
  transition:transform .42s cubic-bezier(.2,.9,.25,1.05),opacity .2s ease,visibility 0s}
.mk-dd-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:none;color:var(--text);
  font-family:inherit;font-size:14.5px;cursor:pointer;text-align:start;opacity:0;transform:translateY(8px) scale(.98);transition:background .2s,color .2s}
.mk-dd.open .mk-dd-opt{opacity:1;transform:none;transition:opacity .3s ease,transform .38s cubic-bezier(.2,.8,.2,1),background .2s,color .2s;transition-delay:calc(var(--i,0)*38ms + 110ms),calc(var(--i,0)*38ms + 110ms),0s,0s}
.mk-dd-opt:hover,.mk-dd-opt:focus-visible{outline:none;background:color-mix(in srgb,var(--blue) 16%,transparent)}
.mk-dd-opt .mk-tick{opacity:0;transform:scale(.4);transition:.3s;color:var(--blue)}
.mk-dd-opt.sel{color:var(--blue);font-weight:700}
.mk-dd-opt.sel .mk-tick{opacity:1;transform:none}

/* شرائح البرامج */
.mk-chips{display:flex;flex-wrap:wrap;gap:8px}
.mk-chip{display:inline-flex;align-items:center;padding:9px 15px;border-radius:100px;border:1px solid var(--border2);background:transparent;color:var(--text2);
  font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .3s cubic-bezier(.2,.8,.2,1)}
.mk-chip i{display:inline-flex;width:0;overflow:hidden;opacity:0;transition:all .3s cubic-bezier(.2,.8,.2,1)}
.mk-chip:hover{border-color:var(--blue);color:var(--text);transform:translateY(-1px)}
.mk-chip:active{transform:scale(.93)}
.mk-chip.on{color:#fff;border-color:transparent;background:linear-gradient(90deg,var(--blue),var(--purple));box-shadow:0 8px 22px -8px color-mix(in srgb,var(--blue) 70%,transparent)}
.mk-chip.on i{width:18px;opacity:1}
.mk-chip .mk-tick{color:#fff}

/* شريط التقدّم */
.mk-prog{height:8px;border-radius:100px;background:color-mix(in srgb,var(--text) 12%,transparent);overflow:hidden}
.mk-prog i{display:block;position:relative;overflow:hidden;height:100%;width:0;background:linear-gradient(90deg,var(--blue),var(--purple));transition:width .25s;border-radius:100px}
.mk-prog i::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:mkShine 1.1s linear infinite}

@media (max-width:640px){.mk-addbtn span{display:none}.mk-addbtn{padding:8px 11px}.mk-two{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){
  .cm-ov.open .cm-modal>*:not(.cm-x),.mk-file svg,.mk-prog i::after,.mk-thumb img{animation:none!important}
  .mk-dd-list,.mk-dd-opt,.mk-chip,.mk-chip i{transition:none!important}
}
`;
document.head.appendChild(css);

   /* ---------- تعديل قسم "عني" ---------- */
let aboutData = {}, abBlob = null;
function applyAbout(){
  ['p1','p2'].forEach(n => ['ar','en'].forEach(l => { const v = aboutData['about_'+n+'_'+l]; if(v) API.dict[l]['about_'+n] = v; }));
  const box = $('aboutBox');
  if(box && aboutData.about_img){
    box.style.overflow = 'hidden';
    box.innerHTML = '<img src="'+esc(aboutData.about_img)+'" alt="" style="width:100%;height:100%;object-fit:cover;display:block">';
  }
  API.applyLang();
}
async function loadAbout(){
  try{
    const r = await rest('site_settings?select=key,value'); if(!r.ok) return;
    aboutData = {}; (await r.json()).forEach(x => aboutData[x.key] = x.value);
    applyAbout();
  }catch(e){}
}
function shrink(file, max){
  return new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      const s = Math.min(1, max/Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width*s); c.height = Math.round(im.height*s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(b => b ? res(b) : rej(), 'image/jpeg', .88);
    };
    im.onerror = rej; im.src = u;
  });
}
function mountAbout(){
  if(!window.MK_ADMIN || $('abEdit')) return;
  const h = document.querySelector('#about .sectitle'); if(!h) return;
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'abEdit'; b.className = 'btn ghost';
  b.style.cssText = 'margin-bottom:16px;padding:8px 18px;font-size:13px';
  b.textContent = 'تعديل هذا القسم / Edit';
  b.onclick = openAbout; h.parentNode.insertBefore(b, h.nextSibling);
}
function unmountAbout(){ const b = $('abEdit'); if(b) b.remove(); }
function openAbout(){
  let ov = $('abOv');
  if(!ov){
    ov = document.createElement('div'); ov.className = 'cm-ov'; ov.id = 'abOv'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
    ov.innerHTML =
     '<div class="cm-modal">'+
       '<button type="button" class="cm-x" id="abX" aria-label="close">&times;</button>'+
       '<h3 class="cm-mtitle">تعديل قسم "عني"</h3>'+
       '<textarea id="abP1ar" class="cm-input" rows="3" placeholder="الفقرة الأولى (عربي)"></textarea>'+
       '<textarea id="abP2ar" class="cm-input" rows="3" placeholder="الفقرة التانية (عربي)"></textarea>'+
       '<textarea id="abP1en" class="cm-input" rows="3" dir="ltr" placeholder="First paragraph (English)"></textarea>'+
       '<textarea id="abP2en" class="cm-input" rows="3" dir="ltr" placeholder="Second paragraph (English)"></textarea>'+
       '<div class="mk-thumbrow"><div class="mk-thumb" id="abThumb">الصورة</div>'+
         '<div class="mk-thumbside"><button type="button" class="mk-link" id="abPick">اختر صورة للمربع</button><input type="file" id="abFile" accept="image/*" hidden></div></div>'+
       '<div id="abSt" class="cm-status" role="status"></div>'+
       '<div class="cm-actions"><button type="button" class="btn ghost" id="abCancel">إلغاء</button><button type="button" class="btn primary" id="abSave">حفظ</button></div>'+
     '</div>';
    document.body.appendChild(ov);
    const close = () => ov.classList.remove('open');
    $('abX').onclick = close; $('abCancel').onclick = close;
    ov.addEventListener('click', e => { if(e.target === ov) close(); });
    $('abPick').onclick = () => $('abFile').click();
    $('abFile').onchange = async e => {
      const f = e.target.files[0]; if(!f) return;
      try{ abBlob = await shrink(f, 1000); $('abThumb').innerHTML = '<img src="'+URL.createObjectURL(abBlob)+'" alt="">'; }catch(err){ $('abSt').textContent = 'الصورة مش مقروءة'; $('abSt').className = 'cm-status bad'; }
      e.target.value = '';
    };
    $('abSave').onclick = async () => {
      const btn = $('abSave'), st = $('abSt'); btn.disabled = true; st.className = 'cm-status'; st.textContent = '...';
      try{
        const rows = [
          { key:'about_p1_ar', value:$('abP1ar').value.trim() }, { key:'about_p2_ar', value:$('abP2ar').value.trim() },
          { key:'about_p1_en', value:$('abP1en').value.trim() }, { key:'about_p2_en', value:$('abP2en').value.trim() }
        ];
        if(abBlob){ const p = 'about/'+uid()+'.jpg'; await upload(p, abBlob); rows.push({ key:'about_img', value:pubUrl(p) }); }
        const r = await rest('site_settings?on_conflict=key', { method:'POST', headers:{ Prefer:'resolution=merge-duplicates,return=representation' }, body:JSON.stringify(rows) });
        if(!r.ok) throw 0;
        rows.forEach(x => aboutData[x.key] = x.value); abBlob = null;
        applyAbout(); close(); toast('تم الحفظ ✓');
      }catch(err){ st.className = 'cm-status bad'; st.textContent = 'معرفتش أحفظ — اتأكد إنك شغّلت كود SQL وإنك مسجّل دخول'; }
      btn.disabled = false;
    };
  }
  $('abP1ar').value = API.dict.ar.about_p1; $('abP2ar').value = API.dict.ar.about_p2;
  $('abP1en').value = API.dict.en.about_p1; $('abP2en').value = API.dict.en.about_p2;
  $('abSt').textContent = ''; ov.classList.add('open');
}
   
/* ---------- تشغيل ---------- */
adminOn = !!getSession(); window.MK_ADMIN = adminOn;
if(adminOn) mountButtons();
   if(adminOn) mountAbout();
loadAbout();
loadDB();
setInterval(sync, 1000);            // بيلقط الدخول/الخروج اللي بيحصل من قسم التعليقات
})();
