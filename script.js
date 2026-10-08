(function(){
const LS_LANG='moknight_lang', LS_THEME='moknight_theme';

const dict = {
 ar:{nav_home:"الرئيسية",nav_portfolio:"أعمالي",nav_about:"عني",nav_contact:"تواصل",
   hero_eyebrow:"MOKNIGHT STUDIO", hero_title:'<span>MoKnight</span>', contact_phone:"الهاتف",
   hero_tagline:"مونتير وصانع موشن جرافيك، أحوّل الأفكار إلى فيديوهات سينمائية تُروى بصريًا.",
   hero_cta1:"مشاهدة أعمالي", hero_cta2:"تواصل معي",
   pf_title:"أعمالي", pf_sub:"مجموعة مختارة من مشاريع المونتاج والموشن جرافيك", pf_search:"ابحث عن مشروع...",
   latest_title:"آخر أعمالي", latest_sub:"أحدث ما اشتغلت عليه", latest_seeall:"مشاهدة كل الأعمال",
   empty_title:"لم أضف أعمالي بعد", empty_sub:"سيتم عرض مشاريعي هنا قريبًا.",
   about_title:"عني", about_p1:"أعمل في مجال المونتاج والموشن جرافيك، وأهتم بتحويل الأفكار البسيطة إلى محتوى مرئي احترافي يجذب المشاهد من اللحظة الأولى.",
   about_p2:"أشتغل على فيديوهات قصيرة وطويلة، بهوية بصرية سينمائية ودقة في التفاصيل.",
   contact_title:"تواصل معي", contact_sub:"للتعاون أو الاستفسارات، تقدر توصلني من هنا",
   footer_rights:"جميع الحقوق محفوظة",
   cat_editing:"Video Editing", cat_motion:"Motion Graphics", cat_thumb:"Thumbnails",
   cat_short:"Short Video", cat_long:"Long Video", cat_other:"Other",
   c_not_set:"لسه متضافش", all:"الكل"
 },
 en:{nav_home:"Home",nav_portfolio:"Portfolio",nav_about:"About",nav_contact:"Contact",
   hero_eyebrow:"MOKNIGHT STUDIO", hero_title:'<span>MoKnight</span>', contact_phone:"Phone",
   hero_tagline:"Video editor & motion designer turning ideas into cinematic, story-driven videos.",
   hero_cta1:"View My Work", hero_cta2:"Get In Touch",
   pf_title:"Portfolio", pf_sub:"A curated selection of editing & motion graphics projects", pf_search:"Search projects...",
   latest_title:"Latest Work", latest_sub:"The most recent things I've made", latest_seeall:"View All Work",
   empty_title:"No projects yet", empty_sub:"My projects will appear here soon.",
   about_title:"About Me", about_p1:"I work in video editing and motion graphics, turning simple ideas into professional visual content that grabs attention from the first frame.",
   about_p2:"I handle short and long-form videos with a cinematic identity and close attention to detail.",
   contact_title:"Get In Touch", contact_sub:"For collaborations or inquiries, reach out here",
   footer_rights:"All rights reserved",
   cat_editing:"Video Editing", cat_motion:"Motion Graphics", cat_thumb:"Thumbnails",
   cat_short:"Short Video", cat_long:"Long Video", cat_other:"Other",
   c_not_set:"Not set yet", all:"All"
 }
};
let lang = localStorage.getItem(LS_LANG) || 'ar';
let theme = localStorage.getItem(LS_THEME) || 'dark';

// PROJECTS and SETTINGS come from data.js (loaded before this file).
// Each project gets a stable internal id based on its position in the list.
const projects = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).map((p, i)=> Object.assign({ id: 'p'+i }, p));
const settings = Object.assign({phone:'',email:'',youtube:'',instagram:'',facebook:'',discord:''}, typeof SETTINGS !== 'undefined' ? SETTINGS : {});

let activeFilter='all', searchTerm='';

function t(k){ return dict[lang][k] || k; }
function applyLang(){
  document.documentElement.lang = lang; document.documentElement.dir = lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.innerHTML = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  document.getElementById('langBtn').textContent = lang==='ar'?'EN':'AR';
  document.getElementById('langBtnM').textContent = lang==='ar'?'EN':'AR';
  document.getElementById('langBtnPf').textContent = lang==='ar'?'EN':'AR';
  localStorage.setItem(LS_LANG, lang);
  renderFilters(); renderGrid(); renderContact(); renderLatestWork();
}
function applyTheme(){
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme==='dark'
   ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
   : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
  document.getElementById('themeBtn').innerHTML = icon;
  document.getElementById('themeBtnM').innerHTML = icon;
  document.getElementById('themeBtnPf').innerHTML = icon;
  localStorage.setItem(LS_THEME, theme);
}
document.getElementById('langBtn').onclick = document.getElementById('langBtnM').onclick = document.getElementById('langBtnPf').onclick = ()=>{ lang = lang==='ar'?'en':'ar'; applyLang(); };
document.getElementById('themeBtn').onclick = document.getElementById('themeBtnM').onclick = document.getElementById('themeBtnPf').onclick = ()=>{ theme = theme==='dark'?'light':'dark'; applyTheme(); };

const burger=document.getElementById('burgerBtn'), mm=document.getElementById('mobileMenu');
burger.onclick=()=>mm.classList.add('open');
document.getElementById('mobileClose').onclick=()=>mm.classList.remove('open');
mm.querySelectorAll('a').forEach(a=>a.onclick=()=>mm.classList.remove('open'));

function openPortfolio(e){
  e.preventDefault();
  mm.classList.remove('open');
  const rect = e.currentTarget.getBoundingClientRect();
  const x = rect.left+rect.width/2, y = rect.top+rect.height/2;
  const layer = document.getElementById('transitionLayer');
  layer.style.left = x+'px'; layer.style.top = y+'px';
  layer.style.opacity = ''; layer.classList.remove('fade');
  layer.classList.add('active');
  setTimeout(()=>{
    const pp = document.getElementById('portfolioPage');
    pp.classList.add('show'); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>requestAnimationFrame(()=>pp.classList.add('enter')));
  }, 520);
  setTimeout(()=>{ layer.classList.remove('active'); layer.classList.add('fade'); }, 650);
}
function closePortfolio(){
  const pp = document.getElementById('portfolioPage');
  pp.classList.remove('enter');
  document.body.style.overflow='';
  setTimeout(()=>pp.classList.remove('show'), 550);
}
document.querySelectorAll('.js-portfolio-link').forEach(el=>el.addEventListener('click', openPortfolio));
document.getElementById('pfBack').addEventListener('click', closePortfolio);
document.querySelectorAll('a[href^="#"]:not(.js-portfolio-link)').forEach(a=>{
  a.addEventListener('click', ()=>{ if(document.getElementById('portfolioPage').classList.contains('show')) closePortfolio(); });
});

window.addEventListener('scroll',()=>{ document.getElementById('nav').classList.toggle('compact', window.scrollY>40); });

const CATS=['all','editing','motion','thumb','short','long','other'];
function renderFilters(){
  const box=document.getElementById('filters'); box.innerHTML='';
  CATS.forEach(c=>{
    const b=document.createElement('button'); b.className='chip'+(activeFilter===c?' active':'');
    b.textContent = c==='all' ? t('all') : t('cat_'+c);
    b.onclick=()=>{ activeFilter=c; renderFilters(); renderGrid(); };
    box.appendChild(b);
  });
}
document.getElementById('searchInput').addEventListener('input', e=>{ searchTerm=e.target.value.trim().toLowerCase(); renderGrid(); });

const CONTACT_TYPES=[
 {key:'phone', label:()=>lang==='ar'?'واتساب':'WhatsApp',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6.3 6.3l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2.1z"/></svg>',
  href:v=>'https://wa.me/'+v.replace(/\D/g,''), sub:v=>'+'+v.replace(/\D/g,'')},
 {key:'email', label:()=>'Email',
  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 6l8 7 8-7"/></svg>',
  href:v=>'mailto:'+v, sub:v=>v},
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
  const box=document.getElementById('contactGrid'); if(!box) return;
  box.innerHTML = CONTACT_TYPES.map(ct=>{
    const val=(settings[ct.key]||'').trim();
    const has = val.length>0;
    return `<a class="ccard" ${has?`href="${ct.href(val)}" target="_blank" rel="noopener"`:'href="#" style="opacity:.5;pointer-events:none"'}>
      <span class="cicon">${ct.icon}</span>
      <div>${ct.label()}<br><span style="color:var(--text3);font-size:12.5px" dir="ltr">${has?ct.sub(val):t('c_not_set')}</span></div>
    </a>`;
  }).join('');
}

function renderGrid(){
  const grid=document.getElementById('grid'), empty=document.getElementById('emptyState');
  const visible = projects.filter(p=>{
    if(p.status!=='published') return false;
    if(activeFilter!=='all' && p.cat!==activeFilter) return false;
    if(searchTerm && !((p.title_ar+p.title_en).toLowerCase().includes(searchTerm))) return false;
    return true;
  });
  grid.innerHTML='';
  if(visible.length===0){ empty.classList.remove('hide'); grid.classList.add('hide'); return; }
  empty.classList.add('hide'); grid.classList.remove('hide');
  visible.forEach(p=>{
    const el=document.createElement('div'); el.className='pcard';
    el.innerHTML = `
      <div class="thumb" data-ar="${p.ar}">
        ${p.thumb?`<img src="${p.thumb}" alt="">`:''}
        <div class="playbtn"><div class="playcircle"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>
      </div>
      <div class="pinfo">
        <h3>${lang==='ar'?p.title_ar:p.title_en||p.title_ar}</h3>
        <div class="ptags"><span class="tag">${t('cat_'+p.cat)}</span><span class="tag">${p.ar}</span>${p.dur?`<span class="tag">${p.dur}</span>`:''}</div>
      </div>`;
    el.onclick = ()=> openDetail(p);
    grid.appendChild(el);
  });
}

function renderLatestWork(){
  const box=document.getElementById('latestGrid'), empty=document.getElementById('latestEmpty');
  if(!box) return;
  const pub = projects.filter(p=>p.status==='published').slice(0,3);
  if(pub.length===0){ box.classList.add('hide'); empty.classList.remove('hide'); return; }
  empty.classList.add('hide'); box.classList.remove('hide');
  box.innerHTML = pub.map(p=>`
    <div class="pcard" data-id="${p.id}">
      <div class="thumb" data-ar="${p.ar}">
        ${p.thumb?`<img src="${p.thumb}" alt="">`:''}
        <div class="playbtn"><div class="playcircle"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>
      </div>
      <div class="pinfo">
        <h3>${lang==='ar'?p.title_ar:p.title_en||p.title_ar}</h3>
        <div class="ptags"><span class="tag">${t('cat_'+p.cat)}</span><span class="tag">${p.ar}</span></div>
      </div>
    </div>`).join('');
  box.querySelectorAll('.pcard').forEach(el=>{
    el.onclick=()=> openDetail(projects.find(x=>x.id===el.getAttribute('data-id')));
  });
}

function openDetail(p){
  const ov=document.getElementById('videoOverlay');
  const v=document.getElementById('lightboxVideo');
  v.src = p.video || ''; v.poster = p.thumb || '';
  document.getElementById('detailMeta').innerHTML = `
    <h2>${lang==='ar'?p.title_ar:p.title_en||p.title_ar}</h2>
    <p>${p.desc||''}</p>
    <div class="ptags"><span class="tag">${t('cat_'+p.cat)}</span><span class="tag">${p.ar}</span>${p.dur?`<span class="tag">${p.dur}</span>`:''}${p.soft?`<span class="tag">${p.soft}</span>`:''}</div>`;
  ov.classList.add('open');
}
document.getElementById('videoClose').onclick = closeVideo;
document.getElementById('videoOverlay').addEventListener('click',e=>{ if(e.target.id==='videoOverlay') closeVideo(); });
function closeVideo(){
  document.getElementById('videoOverlay').classList.remove('open');
  const v=document.getElementById('lightboxVideo'); v.pause(); v.removeAttribute('src'); v.load();
}
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ closeVideo(); if(document.getElementById('portfolioPage').classList.contains('show')) closePortfolio(); }
});

applyTheme();
applyLang();
})();
