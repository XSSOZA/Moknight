(function(){
'use strict';
const LS_LANG='moknight_lang', LS_THEME='moknight_theme';
const store={
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const dict = {
 ar:{nav_home:"الرئيسية",nav_portfolio:"أعمالي",nav_about:"عني",nav_contact:"تواصل",
   hero_eyebrow:"MOKNIGHT STUDIO", hero_title:'<span>MoKnight</span>', contact_phone:"الهاتف",
   hero_tagline:"مونتير وصانع موشن جرافيك، أحوّل الأفكار إلى فيديوهات سينمائية تُروى بصريًا.",
   hero_cta1:"مشاهدة أعمالي", hero_cta2:"تواصل معي",
   pf_title:"أعمالي", pf_sub:"مجموعة مختارة من مشاريع المونتاج والموشن جرافيك", pf_search:"ابحث عن مشروع...",
   latest_title:"آخر أعمالي", latest_sub:"أحدث ما اشتغلت عليه", latest_seeall:"مشاهدة كل الأعمال",
   empty_title:"لم أضف أعمالي بعد", empty_sub:"سيتم عرض مشاريعي هنا قريبًا.",
   about_title:"عني", about_p1:"أنا مونتير لسه في بداية رحلتي، بحب أحوّل الأفكار البسيطة لفيديوهات تشدّ المشاهد من أول لحظة. بشتغل على المونتاج والموشن جرافيك، وبحاول في كل مشروع أتعلم حاجة جديدة وأطوّر نفسي عن اللي قبله.",
   about_p2:"وإن شاء الله كل ما أخلّص فيديو جديد هتلاقيه هنا على الموقع، فتابع أعمالي وشوف التطوّر بنفسك، وأي فكرة عندك أو شغل عايز تتعاون فيه، تواصل معايا وهسمعك.",
   contact_title:"تواصل معي", contact_sub:"للتعاون أو الاستفسارات، تقدر توصلني من هنا",
   footer_rights:"جميع الحقوق محفوظة",
        footer_by:"تصميم وتطوير: يوسف فتحي طلعت",
   cat_editing:"Video Editing", cat_motion:"Motion Graphics", cat_thumb:"Thumbnails",
   cat_short:"Short Video", cat_long:"Long Video", cat_other:"Other",
   c_not_set:"لسه متضافش", all:"الكل",
   v_tools:"البرامج المستخدمة", v_cta:"اطلب شغل زي ده", v_cta_msg:'مرحبًا، شفت "{title}" على موقعك وعايز شغل زيه.'
 },
 en:{nav_home:"Home",nav_portfolio:"Portfolio",nav_about:"About",nav_contact:"Contact",
   hero_eyebrow:"MOKNIGHT STUDIO", hero_title:'<span>MoKnight</span>', contact_phone:"Phone",
   hero_tagline:"Video editor & motion designer turning ideas into cinematic, story-driven videos.",
   hero_cta1:"View My Work", hero_cta2:"Get In Touch",
   pf_title:"Portfolio", pf_sub:"A curated selection of editing & motion graphics projects", pf_search:"Search projects...",
   latest_title:"Latest Work", latest_sub:"The most recent things I've made", latest_seeall:"View All Work",
   empty_title:"No projects yet", empty_sub:"My projects will appear here soon.",
   about_title:"About Me", about_p1:"I'm a video editor just starting out, and I love turning simple ideas into videos that grab attention from the first frame. I work in editing and motion graphics, and I try to learn something new and improve with every project.",
about_p2:"Every time I finish a new video, I'll post it right here on the site, so keep an eye on my work and watch me grow. Got an idea or a project you'd like to collaborate on? Reach out and I'll be happy to listen.",
   contact_title:"Get In Touch", contact_sub:"For collaborations or inquiries, reach out here",
   footer_rights:"All rights reserved",
        footer_by:"Designed & developed by Youssef Fathy Talaat",
   cat_editing:"Video Editing", cat_motion:"Motion Graphics", cat_thumb:"Thumbnails",
   cat_short:"Short Video", cat_long:"Long Video", cat_other:"Other",
   c_not_set:"Not set yet", all:"All",
   v_tools:"Tools used", v_cta:"Request similar work", v_cta_msg:`Hi! I saw "{title}" on your site and I'd like something similar.`
 }
};
let lang = store.get(LS_LANG)==='en' ? 'en' : 'ar';
let theme = store.get(LS_THEME)==='light' ? 'light' : 'dark';

// PROJECTS and SETTINGS come from data.js (loaded before this file).
const VALID_AR=['16:9','9:16','1:1'];
const projects = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).map((p, i)=>{
  const o = Object.assign({ id: 'p'+i }, p);
  if(VALID_AR.indexOf(o.ar)===-1) o.ar='16:9';
  return o;
});
const settings = Object.assign({phone:'',email:'',youtube:'',instagram:'',facebook:'',discord:''}, typeof SETTINGS !== 'undefined' ? SETTINGS : {});
window.MK_API = { projects: projects, dict: dict, applyLang: applyLang, rerender: function(){ renderFilters(); renderGrid(); renderLatestWork(); } };
let activeFilter='all', searchTerm='';
let currentProject=null, lastFocus=null;

const ov=$('videoOverlay'), vm=$('vModal'), vid=$('lightboxVideo'), meta=$('detailMeta');
const pp=$('portfolioPage'), mm=$('mobileMenu');

function t(k){ return dict[lang][k] || k; }
function titleOf(p){ return lang==='ar' ? (p.title_ar||p.title_en||'') : (p.title_en||p.title_ar||''); }
function catLabel(p){ return dict[lang]['cat_'+p.cat] ? t('cat_'+p.cat) : t('cat_other'); }
function lockScroll(){ document.body.style.overflow = (ov.classList.contains('open') || pp.classList.contains('show')) ? 'hidden' : ''; }

function applyLang(){
  document.documentElement.lang = lang; document.documentElement.dir = lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.innerHTML = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  ['langBtn','langBtnM','langBtnPf'].forEach(id=>{ $(id).textContent = lang==='ar'?'EN':'AR'; });
  store.set(LS_LANG, lang);
  renderFilters(); renderGrid(); renderContact(); renderLatestWork();
  if(currentProject) renderDetailMeta(currentProject);
}
function applyTheme(){
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme==='dark'
   ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
   : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
  ['themeBtn','themeBtnM','themeBtnPf'].forEach(id=>{ $(id).innerHTML = icon; });
  const tc=document.querySelector('meta[name="theme-color"]'); if(tc) tc.setAttribute('content', theme==='dark'?'#050812':'#f5f9ff');
  store.set(LS_THEME, theme);
}
['langBtn','langBtnM','langBtnPf'].forEach(id=>{ $(id).onclick=()=>{ lang = lang==='ar'?'en':'ar'; applyLang(); }; });
['themeBtn','themeBtnM','themeBtnPf'].forEach(id=>{ $(id).onclick=()=>{ theme = theme==='dark'?'light':'dark'; applyTheme(); }; });

$('burgerBtn').onclick=()=>mm.classList.add('open');
$('mobileClose').onclick=()=>mm.classList.remove('open');
mm.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mm.classList.remove('open')));

/* ---------- portfolio page ---------- */
function openPortfolio(e){
  e.preventDefault();
  mm.classList.remove('open');
  if(pp.classList.contains('show')) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const x = rect.left+rect.width/2, y = rect.top+rect.height/2;
  const layer = $('transitionLayer');
  layer.style.left = x+'px'; layer.style.top = y+'px';
  layer.style.opacity = ''; layer.classList.remove('fade');
  layer.classList.add('active');
  setTimeout(()=>{
    pp.classList.add('show'); lockScroll();
    requestAnimationFrame(()=>requestAnimationFrame(()=>pp.classList.add('enter')));
  }, 520);
  setTimeout(()=>{ layer.classList.remove('active'); layer.classList.add('fade'); }, 650);
}
function closePortfolio(){
  pp.classList.remove('enter');
  document.body.style.overflow = ov.classList.contains('open') ? 'hidden' : '';
  setTimeout(()=>pp.classList.remove('show'), 550);
}
document.querySelectorAll('.js-portfolio-link').forEach(el=>el.addEventListener('click', openPortfolio));
$('pfBack').addEventListener('click', closePortfolio);
document.querySelectorAll('a[href^="#"]:not(.js-portfolio-link)').forEach(a=>{
  a.addEventListener('click', ()=>{ if(pp.classList.contains('show')) closePortfolio(); });
});

window.addEventListener('scroll',()=>{ $('nav').classList.toggle('compact', window.scrollY>40); },{passive:true});

/* highlight the nav link of the section you are in */
(function(){
  if(!('IntersectionObserver' in window)) return;
  const links=[].slice.call(document.querySelectorAll('.navlinks a[href^="#"]')).filter(a=>a.getAttribute('href').length>1);
  const ids=links.map(a=>a.getAttribute('href').slice(1)).concat(['latest']);
  const io=new IntersectionObserver(es=>{
    es.forEach(en=>{ if(en.isIntersecting) links.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+en.target.id)); });
  },{rootMargin:'-45% 0px -50% 0px'});
  ids.forEach(id=>{ const s=$(id); if(s) io.observe(s); });
})();

/* ---------- filters / search ---------- */
const CATS=['all','editing','motion','thumb','short','long','other'];
function renderFilters(){
  const box=$('filters'); box.innerHTML='';
  CATS.forEach(c=>{
    const b=document.createElement('button'); b.className='chip'+(activeFilter===c?' active':'');
    b.textContent = c==='all' ? t('all') : t('cat_'+c);
    b.onclick=()=>{ activeFilter=c; renderFilters(); renderGrid(); };
    box.appendChild(b);
  });
}
$('searchInput').addEventListener('input', e=>{ searchTerm=e.target.value.trim().toLowerCase(); renderGrid(); });

/* ---------- contact ---------- */
const CONTACT_TYPES=[
 {key:'phone', label:()=>lang==='ar'?'واتساب':'WhatsApp',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6.3 6.3l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2.1z"/></svg>',
  href:v=>'https://wa.me/'+v.replace(/\D/g,''), sub:v=>'+'+v.replace(/\D/g,'')},
 {key:'email', label:()=>'Email',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 6l8 7 8-7"/></svg>',
  href:v=>'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(v), sub:v=>v},
 {key:'youtube', label:()=>'YouTube',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
  href:v=>v, sub:v=>v},
 {key:'instagram', label:()=>'Instagram',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/></svg>',
  href:v=>v, sub:v=>v},
 {key:'facebook', label:()=>'Facebook',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  href:v=>v, sub:v=>v},
 {key:'discord', label:()=>'Discord',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="7"/><circle cx="15" cy="12" r="7"/></svg>',
  href:v=>v, sub:v=>v}
];
function renderContact(){
  const box=$('contactGrid'); if(!box) return;
  box.innerHTML = CONTACT_TYPES.map(ct=>{
    const val=String(settings[ct.key]||'').trim();
    const has = val.length>0;
    return `<a class="ccard${has?'':' off'}" ${has?`href="${esc(ct.href(val))}" target="_blank" rel="noopener"`:'href="#" tabindex="-1" aria-disabled="true"'}>
      <span class="cicon">${ct.icon}</span>
      <div>${ct.label()}<br><span class="csub" dir="ltr">${has?esc(ct.sub(val)):t('c_not_set')}</span></div>
    </a>`;
  }).join('');
}

/* ---------- project cards ---------- */
const PLAY_ICON='<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>';
function cardHTML(p, withDur){
  return `<div class="pcard" role="button" tabindex="0" data-id="${esc(p.id)}" aria-label="${esc(titleOf(p))}">
    <div class="thumb" data-ar="${p.ar}">
      ${p.thumb?`<img src="${esc(p.thumb)}" alt="" loading="lazy" onerror="this.remove()">`:''}
      <div class="playbtn"><div class="playcircle">${PLAY_ICON}</div></div>
    </div>
    <div class="pinfo">
      <h3>${esc(titleOf(p))}</h3>
      <div class="ptags"><span class="tag">${esc(catLabel(p))}</span><span class="tag">${p.ar}</span>${withDur&&p.dur?`<span class="tag">${esc(p.dur)}</span>`:''}</div>
    </div>
  </div>`;
}
function bindCards(box){
  box.querySelectorAll('.pcard').forEach(el=>{
    const open=()=>openDetail(projects.find(x=>x.id===el.getAttribute('data-id')), el);
    el.addEventListener('click', open);
    el.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
  });
}

function renderGrid(){
  const grid=$('grid'), empty=$('emptyState');
  const visible = projects.filter(p=>{
    if(p.status!=='published' && !window.MK_ADMIN) return false;
    if(activeFilter!=='all' && p.cat!==activeFilter) return false;
    if(searchTerm){
      const hay=[p.title_ar,p.title_en,p.desc,p.soft].join(' ').toLowerCase();
      if(hay.indexOf(searchTerm)===-1) return false;
    }
    return true;
  });
  if(visible.length===0){ grid.innerHTML=''; empty.classList.remove('hide'); grid.classList.add('hide'); return; }
  empty.classList.add('hide'); grid.classList.remove('hide');
  grid.innerHTML = visible.map(p=>cardHTML(p,true)).join('');
  bindCards(grid);
}

function renderLatestWork(){
  const box=$('latestGrid'), empty=$('latestEmpty');
  if(!box) return;
  const pub = projects.filter(p=>p.status==='published').slice(0,3);
  if(pub.length===0){ box.innerHTML=''; box.classList.add('hide'); empty.classList.remove('hide'); return; }
  empty.classList.add('hide'); box.classList.remove('hide');
  box.innerHTML = pub.map(p=>cardHTML(p,false)).join('');
  bindCards(box);
}

/* ---------- video viewer ---------- */
function renderDetailMeta(p){
  const soft=String(p.soft||'').split(',').map(s=>s.trim()).filter(Boolean);
  const phone=String(settings.phone||'').replace(/\D/g,'');
  const msg=t('v_cta_msg').replace('{title}', titleOf(p));
  meta.innerHTML = `
    <div class="vtags"><span class="tag">${esc(catLabel(p))}</span><span class="tag">${p.ar}</span>${p.dur?`<span class="tag">${esc(p.dur)}</span>`:''}</div>
    <h2 class="vtitle">${esc(titleOf(p))}</h2>
    ${p.desc?`<p class="vdesc">${esc(p.desc)}</p>`:''}
    ${soft.length?`<div class="vsoft"><span class="vlabel">${t('v_tools')}</span><div class="tools">${soft.map(s=>`<span class="toolchip">${esc(s)}</span>`).join('')}</div></div>`:''}
    ${phone?`<a class="btn primary vcta" href="https://wa.me/${phone}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${t('v_cta')}</a>`:''}`;
}
function openDetail(p, from){
  if(!p) return;
  currentProject=p; lastFocus=from||document.activeElement;
  vm.classList.remove('ar-169','ar-916','ar-11');
  vm.classList.add(p.ar==='9:16'?'ar-916':p.ar==='1:1'?'ar-11':'ar-169');
  vid.poster = p.thumb || '';
  if(p.video){ vid.src=p.video; } else { vid.removeAttribute('src'); vid.load(); }
  renderDetailMeta(p);
  ov.classList.add('open'); ov.setAttribute('aria-hidden','false');
  lockScroll();
  if(p.video){ const pr=vid.play(); if(pr && pr.catch) pr.catch(()=>{}); }
  $('videoClose').focus({preventScroll:true});
}
function closeVideo(){
  if(!ov.classList.contains('open')) return;
  ov.classList.remove('open'); ov.setAttribute('aria-hidden','true');
  vid.pause(); vid.removeAttribute('src'); vid.load();
  currentProject=null;
  lockScroll();
  if(lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
}
$('videoClose').onclick = closeVideo;
ov.addEventListener('click',e=>{ if(e.target===ov) closeVideo(); });
document.addEventListener('keydown', e=>{
  if(e.key!=='Escape') return;
  if(ov.classList.contains('open')){ closeVideo(); return; }
  if(mm.classList.contains('open')){ mm.classList.remove('open'); return; }
  if(pp.classList.contains('show')) closePortfolio();
});

  /* حركة ظهور اسم المطوّر لما توصل للفوتر */
(function(){
  const fb=document.querySelector('.footer-by'); if(!fb) return;
  if(!('IntersectionObserver' in window)){ fb.classList.add('in'); return; }
  const o=new IntersectionObserver(es=>{
    es.forEach(en=>{ if(en.isIntersecting){ fb.classList.add('in'); o.disconnect(); } });
  },{threshold:.4});
  o.observe(fb);
})();
  
applyTheme();
applyLang();
})();
