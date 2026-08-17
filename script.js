const KEY="nosaVeloraLocalFixed";
const USER="veloraadmin",PASS="velora150160";
const FIREBASE_DB_URL=(window.VELORA_FIREBASE?.databaseURL||"").replace(/\/+$/,"");
const starter={
  products:[{id:"shea-dox",type:"product",name:"Shea Dox",desc:"منتج من منتجات VELORA.",cover:"",media:[],beforeAfter:[]}],
  services:[{id:"service-demo",type:"service",name:"خدمات Salon Nosa",desc:"صور شغل وخدمات نوسا.",cover:"",media:[],beforeAfter:[]}]
};

let cloudData=null;
let cloudReady=null;
let cloudStream=null;
let cloudConnected=false;

function cloneData(x){return JSON.parse(JSON.stringify(x))}
function normalizeData(d){
  if(!d || typeof d!=="object") return cloneData(starter);
  if(!Array.isArray(d.products)) d.products=[];
  if(!Array.isArray(d.services)) d.services=[];
  all(d).forEach(x=>{
    if(!Array.isArray(x.media))x.media=[];
    if(!Array.isArray(x.beforeAfter))x.beforeAfter=[];
  });
  return d;
}
function getLocalData(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw) return normalizeData(JSON.parse(raw));
  }catch(e){}
  return cloneData(starter);
}
function cacheData(d){
  try{
    localStorage.setItem(KEY,JSON.stringify(d));
    localStorage.setItem(KEY+"_tick",String(Date.now()));
  }catch(e){}
}
function setLiveStatus(ok,msg){
  const el=document.getElementById("live-status");
  if(!el)return;
  el.textContent=ok ? "🟢 "+(msg||"التحديث المباشر متصل بـ Firebase") : "🔴 "+(msg||"تعذر الاتصال بـ Firebase — البيانات المحلية محفوظة مؤقتًا");
  el.classList.toggle("offline",!ok);
}
function notifyLiveUpdate(){
  try{window.dispatchEvent(new CustomEvent("catalogLiveUpdate"))}catch(e){}
}
function refreshPublicLive(){
  try{
    if(typeof home==="function")home();
    if(typeof detail==="function")detail();
    if(typeof renderCatalog==="function")renderCatalog();
  }catch(e){}
}
function refreshEverything(){
  refreshPublicLive();
  try{if(typeof refreshAdmin==="function" && document.getElementById("app")?.hidden===false)refreshAdmin()}catch(e){}
}
function all(d){return[...(d?.products||[]),...(d?.services||[])]}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function firebaseGet(){
  if(!FIREBASE_DB_URL)throw new Error("Firebase database URL is missing");
  const r=await fetch(FIREBASE_DB_URL+"/catalog.json",{cache:"no-store"});
  if(!r.ok)throw new Error("Firebase GET failed: "+r.status);
  return await r.json();
}
async function firebasePut(d){
  if(!FIREBASE_DB_URL)throw new Error("Firebase database URL is missing");
  const r=await fetch(FIREBASE_DB_URL+"/catalog.json",{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(normalizeData(d))
  });
  if(!r.ok){
    let msg="";
    try{msg=await r.text()}catch(e){}
    throw new Error("Firebase PUT failed: "+r.status+" "+msg);
  }
  return await r.json();
}

async function initializeCloud(){
  if(cloudReady)return cloudReady;
  cloudReady=(async()=>{
    const local=getLocalData();
    try{
      let remote=await firebaseGet();
      if(remote && typeof remote==="object" && (Array.isArray(remote.products)||Array.isArray(remote.services))){
        cloudData=normalizeData(remote);
      }else{
        // First run: migrate the existing local catalog to Firebase.
        cloudData=normalizeData(local);
        await firebasePut(cloudData);
      }
      cacheData(cloudData);
      cloudConnected=true;
      setLiveStatus(true,"التحديث المباشر متصل بـ Firebase");
      startFirebaseStream();
      refreshEverything();
      notifyLiveUpdate();
      return cloudData;
    }catch(e){
      cloudConnected=false;
      cloudData=local;
      cacheData(cloudData);
      setLiveStatus(false,"Firebase غير متاح حاليًا — تم تشغيل النسخة المحلية مؤقتًا");
      refreshEverything();
      return cloudData;
    }
  })();
  return cloudReady;
}

function pathParts(path){
  return String(path||"/").split("/").filter(Boolean).map(x=>x.replace(/~1/g,"/").replace(/~0/g,"~"));
}
function setAtPath(root,path,value){
  const parts=pathParts(path);
  if(!parts.length)return normalizeData(value);
  let cur=root;
  for(let i=0;i<parts.length-1;i++){
    const p=parts[i];
    if(cur[p]===undefined || cur[p]===null || typeof cur[p]!=="object")cur[p]={};
    cur=cur[p];
  }
  cur[parts[parts.length-1]]=value;
  return root;
}
function removeAtPath(root,path){
  const parts=pathParts(path);
  if(!parts.length)return null;
  let cur=root;
  for(let i=0;i<parts.length-1;i++){
    if(cur==null || typeof cur!=="object")return root;
    cur=cur[parts[i]];
  }
  if(cur && typeof cur==="object")delete cur[parts[parts.length-1]];
  return root;
}
function applyFirebaseEvent(type,payload){
  if(!cloudData)cloudData=cloneData(starter);
  const path=payload?.path||"/";
  const value=payload?.data;
  if(type==="put"){
    if(path==="/")cloudData=normalizeData(value);
    else if(value===null)removeAtPath(cloudData,path);
    else setAtPath(cloudData,path,value);
  }else if(type==="patch" && value && typeof value==="object"){
    Object.keys(value).forEach(k=>{
      const p=(path==="/"?"":path)+"/"+k;
      if(value[k]===null)removeAtPath(cloudData,p);
      else setAtPath(cloudData,p,value[k]);
    });
  }
  cloudData=normalizeData(cloudData);
  cacheData(cloudData);
  cloudConnected=true;
  setLiveStatus(true,"التحديث المباشر متصل بـ Firebase");
  refreshEverything();
  notifyLiveUpdate();
}

function startFirebaseStream(){
  if(cloudStream || !FIREBASE_DB_URL)return;
  try{
    cloudStream=new EventSource(FIREBASE_DB_URL+"/catalog.json");
    ["put","patch"].forEach(type=>{
      cloudStream.addEventListener(type,e=>{
        try{applyFirebaseEvent(type,JSON.parse(e.data))}catch(err){}
      });
    });
    cloudStream.addEventListener("cancel",()=>{
      cloudConnected=false;
      setLiveStatus(false,"تم إيقاف اتصال Firebase");
    });
    cloudStream.addEventListener("auth_revoked",()=>{
      cloudConnected=false;
      setLiveStatus(false,"انتهت صلاحية صلاحية Firebase");
    });
    cloudStream.onerror=()=>{
      cloudConnected=false;
      setLiveStatus(false,"جاري إعادة الاتصال بـ Firebase...");
      try{cloudStream.close()}catch(e){}
      cloudStream=null;
      setTimeout(()=>{if(!cloudStream)startFirebaseStream()},3000);
    };
  }catch(e){
    cloudStream=null;
    setLiveStatus(false,"تعذر تشغيل التحديث المباشر");
  }
}

function getData(){
  if(cloudData)return cloudData;
  return getLocalData();
}
async function saveData(d){
  d=normalizeData(d);
  cloudData=d;
  cacheData(d);
  try{
    await firebasePut(d);
    cloudConnected=true;
    setLiveStatus(true,"تم الحفظ في Firebase والتحديث المباشر مفعل");
    notifyLiveUpdate();
    return true;
  }catch(e){
    cloudConnected=false;
    setLiveStatus(false,"تعذر الحفظ في Firebase — تم حفظ نسخة محلية مؤقتة");
    notifyLiveUpdate();
    return false;
  }
}

function readImage(file,max=1400,q=.76){
  return new Promise((resolve,reject)=>{
    let r=new FileReader();
    r.onload=e=>{
      let im=new Image();
      im.onload=()=>{
        let w=im.width,h=im.height;
        if(w>max){h=Math.round(h*max/w);w=max}
        if(h>max){w=Math.round(w*max/h);h=max}
        let c=document.createElement("canvas");
        c.width=w;c.height=h;
        c.getContext("2d").drawImage(im,0,0,w,h);
        resolve(c.toDataURL("image/jpeg",q));
      };
      im.onerror=reject;
      im.src=e.target.result;
    };
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}

function card(x){
  return`<article class="card"><div class="cover">${x.cover?`<img src="${x.cover}" alt="${esc(x.name)}">`:"✦"}</div><div class="cardbody"><small>${x.type==="product"?"منتج VELORA":"خدمة Salon Nosa"}</small><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p><a href="details.html?id=${encodeURIComponent(x.id)}">شاهد الصور والآراء</a></div></article>`
}
function home(){
  let d=getData(),p=document.getElementById("productsGrid"),s=document.getElementById("servicesGrid");
  if(!p)return;
  p.innerHTML=d.products.map(card).join("")||'<div class="empty">لا توجد منتجات.</div>';
  if(s)s.innerHTML=d.services.map(card).join("")||'<div class="empty">لا توجد خدمات.</div>';
  if(document.getElementById("pc"))document.getElementById("pc").textContent=d.products.length+" منتج";
  if(document.getElementById("sc"))document.getElementById("sc").textContent=d.services.length+" خدمة";
}
function detail(){
  let b=document.getElementById("detail");
  if(!b)return;
  let id=new URLSearchParams(location.search).get("id");
  let x=all(getData()).find(a=>a.id===id);
  if(!x){b.innerHTML='<div class="empty">العنصر غير موجود.</div>';return}
  let w=(x.media||[]).filter(a=>a.kind==="work");
  let r=(x.media||[]).filter(a=>a.kind==="review");
  let ba=Array.isArray(x.beforeAfter)?x.beforeAfter:[];
  let beforeAfterHTML=x.type==="service"?beforeAfterGallery(ba):"";
  b.innerHTML=`
  <div class="detailhero">
    <div>${x.cover?`<img src="${x.cover}" alt="${esc(x.name)}">`:'<div class="cover">✦</div>'}</div>
    <div>
      <small>${x.type==="product"?"منتجات VELORA":"خدمات Salon Nosa"}</small>
      <h1>${esc(x.name)}</h1>
      <p>${esc(x.desc)}</p>
    </div>
  </div>
  ${beforeAfterHTML}
  <h2>📸 معرض الصور</h2>
  ${gallery(w,"لم تتم إضافة صور بعد.")}
  <h2>💬 آراء وتجارب العملاء</h2>
  ${gallery(r,"لم تتم إضافة Screenshots لآراء العملاء بعد.")}
  `;
}
function beforeAfterGallery(items){
  if(!Array.isArray(items)||!items.length){
    return `<section class="ba-section"><div class="section-title"><span>✨</span><div><h2>قبل وبعد الخدمة</h2><p>شوف الفرق بنفسك</p></div></div><div class="empty">لم تتم إضافة صور قبل وبعد لهذه الخدمة بعد.</div></section>`;
  }
  return `<section class="ba-section">
    <div class="section-title"><span>✨</span><div><h2>قبل وبعد الخدمة</h2><p>النتيجة واضحة بالصور</p></div></div>
    <div class="ba-list">
    ${items.map((g,i)=>`
      <article class="ba-card">
        <div class="ba-head"><b>نتيجة ${i+1}</b><span>قبل ↔ بعد</span></div>
        <div class="ba-compare">
          <div class="ba-half before"><img src="${g.before}" alt="قبل الخدمة"></div>
          <div class="ba-half after"><img src="${g.after}" alt="بعد الخدمة"></div>
          <div class="ba-divider"></div>
          <div class="ba-label before-label">قبل</div>
          <div class="ba-label after-label">بعد</div>
        </div>
      </article>`).join("")}
    </div>
  </section>`;
}
function updateBaSelectors(){
  let s=document.getElementById("baTarget");if(!s)return;
  let services=getData().services;
  s.innerHTML=services.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")||'<option value="">لا توجد خدمات</option>';
  renderBaAdmin();
}
function updateBaInfo(){
  let bf=[...document.getElementById("beforeFiles").files],af=[...document.getElementById("afterFiles").files],box=document.getElementById("baInfo");
  box.textContent=`تم اختيار ${bf.length} صورة قبل و ${af.length} صورة بعد. سيتم ربط الصور بالترتيب.`;
}
async function addBeforeAfter(){
  let s=document.getElementById("baTarget"),id=s?.value,bf=[...document.getElementById("beforeFiles").files],af=[...document.getElementById("afterFiles").files];
  if(!id)return alert("اختار خدمة أولًا.");
  if(!bf.length||!af.length)return alert("اختار صور قبل وصور بعد.");
  if(bf.length!==af.length)return alert("لازم عدد صور قبل يساوي عدد صور بعد، عشان كل صورة قبل تتربط بالنتيجة المقابلة.");
  let d=getData(),x=d.services.find(a=>a.id===id);if(!x)return;
  if(!Array.isArray(x.beforeAfter))x.beforeAfter=[];
  let btn=document.getElementById("addBaBtn");btn.disabled=true;
  try{
    for(let i=0;i<bf.length;i++){
      btn.textContent=`جاري تجهيز ${i+1} من ${bf.length}...`;
      x.beforeAfter.push({id:Date.now()+"-"+i+"-"+Math.random(),before:await readImage(bf[i]),after:await readImage(af[i])});
    }
    const ok=await saveData(d);
    if(ok){
      document.getElementById("beforeFiles").value="";
      document.getElementById("afterFiles").value="";
      updateBaInfo();updateBaSelectors();
      alert("تمت إضافة صور قبل وبعد وحفظها في Firebase بنجاح.");
    }else{
      alert("تم تجهيز الصور لكن تعذر الحفظ السحابي. تم الاحتفاظ بها محليًا مؤقتًا.");
    }
  }catch(e){alert("حدث خطأ أثناء تجهيز الصور.");}
  finally{btn.disabled=false;btn.textContent="إضافة صور قبل وبعد";}
}
function renderBaAdmin(){
  let box=document.getElementById("baCurrent"),s=document.getElementById("baTarget");if(!box||!s)return;
  let x=getData().services.find(a=>a.id===s.value);
  if(!x||!x.beforeAfter?.length){box.innerHTML='<div class="empty">لا توجد مجموعات قبل وبعد لهذه الخدمة.</div>';return}
  box.innerHTML=`<div class="ba-admin-list">${x.beforeAfter.map((g,i)=>`<div class="ba-admin-row"><span>نتيجة ${i+1}</span><div><img src="${g.before}"><img src="${g.after}"></div><button class="btn danger" onclick="deleteBeforeAfter('${x.id}','${g.id}')">حذف</button></div>`).join("")}</div>`;
}
async function deleteBeforeAfter(serviceId,groupId){
  if(!confirm("حذف مجموعة قبل وبعد؟"))return;
  let d=getData(),x=d.services.find(a=>a.id===serviceId);if(!x)return;
  x.beforeAfter=(x.beforeAfter||[]).filter(g=>g.id!==groupId);
  await saveData(d);updateBaSelectors();
}
function gallery(a,e){return a.length?`<div class="gallery">${a.map(x=>`<img src="${x.src}" alt="صورة" onclick="openImage(this.src)">`).join("")}</div>`:`<div class="empty">${e}</div>`}
function openImage(src){let w=window.open();if(w)w.document.write(`<body style="margin:0;background:#111;display:grid;place-items:center"><img src="${src}" style="max-width:100%;max-height:100vh;object-fit:contain"></body>`)}
function loginAdmin(){
  const u=(document.getElementById("username")?.value||"").trim(),p=document.getElementById("password")?.value||"",err=document.getElementById("loginError");
  if(u===USER&&p===PASS){sessionStorage.setItem("adminOK","1");showAdmin()}
  else if(err)err.textContent="اسم المستخدم أو كلمة المرور غير صحيحة."
}
function showAdmin(){document.getElementById("login").hidden=true;document.getElementById("app").hidden=false;refreshAdmin()}
function logoutAdmin(){sessionStorage.removeItem("adminOK");location.reload()}
function refreshAdmin(){
  let d=getData(),sel=document.getElementById("target");
  if(!sel)return;
  sel.innerHTML=all(d).map(x=>`<option value="${x.id}">${x.type==="product"?"🧴":"💇"} ${esc(x.name)}</option>`).join("");
  let list=document.getElementById("list");
  list.innerHTML=all(d).map(x=>{
    let w=x.media.filter(m=>m.kind==="work").length,r=x.media.filter(m=>m.kind==="review").length;
    return `<div class="row"><div><b>${esc(x.name)}</b><p>${w} صور شغل • ${r} آراء عملاء</p><div class="thumbs">${x.media.slice(0,30).map(m=>`<img src="${m.src}" title="${m.kind==="review"?"رأي عميل":"صورة"}">`).join("")}</div></div><button class="btn danger" onclick="deleteItem('${x.id}')">حذف</button></div>`;
  }).join("")||'<div class="empty">لا يوجد محتوى.</div>';
  updateBaSelectors();
}
async function addItem(){
  let name=document.getElementById("name").value.trim();
  if(!name)return alert("اكتب الاسم.");
  let d=getData(),x={id:Date.now().toString(),type:document.getElementById("type").value,name,desc:document.getElementById("desc").value.trim(),cover:"",media:[],beforeAfter:[]};
  let f=document.getElementById("cover").files[0];
  if(f)x.cover=await readImage(f);
  d[x.type==="product"?"products":"services"].push(x);
  const ok=await saveData(d);
  if(ok){
    updateBaSelectors();
    document.getElementById("name").value="";
    document.getElementById("desc").value="";
    document.getElementById("cover").value="";
    refreshAdmin();
    alert("تمت الإضافة والحفظ في Firebase.");
  }else{
    refreshAdmin();
    alert("تمت الإضافة محليًا، لكن تعذر الحفظ في Firebase.");
  }
}
function selectedInfo(){
  let fs=[...document.getElementById("mediaFiles").files],box=document.getElementById("selectedInfo");
  if(!fs.length){box.textContent="لم يتم اختيار صور بعد.";return}
  let mb=(fs.reduce((n,f)=>n+f.size,0)/1024/1024).toFixed(1);
  box.innerHTML=`تم اختيار <b>${fs.length}</b> صورة — الحجم الأصلي ${mb} MB — سيتم ضغطها تلقائيًا.`;
}
async function addMedia(){
  let files=[...document.getElementById("mediaFiles").files],id=document.getElementById("target").value,kind=document.getElementById("mediaKind").value;
  if(!files.length)return alert("اختار الصور أولًا.");
  let d=getData(),x=all(d).find(a=>a.id===id),btn=document.getElementById("addMediaBtn");
  if(!x)return alert("اختار المنتج أو الخدمة.");
  btn.disabled=true;
  try{
    for(let i=0;i<files.length;i++){
      btn.textContent=`جاري إضافة ${i+1} من ${files.length}...`;
      x.media.push({id:Date.now()+"-"+i+"-"+Math.random(),kind,src:await readImage(files[i])});
    }
    const ok=await saveData(d);
    if(ok){
      document.getElementById("mediaFiles").value="";
      selectedInfo();refreshAdmin();
      alert("تمت إضافة "+files.length+" صورة وحفظها في Firebase بنجاح.");
    }else{
      refreshAdmin();
      alert("تمت إضافة الصور محليًا، لكن تعذر الحفظ في Firebase.");
    }
  }catch(e){alert("حدث خطأ أثناء تجهيز الصور.")}
  finally{btn.disabled=false;btn.textContent="إضافة الصور المحددة"}
}
async function deleteItem(id){
  if(!confirm("حذف العنصر وكل صوره؟"))return;
  let d=getData();
  d.products=d.products.filter(x=>x.id!==id);
  d.services=d.services.filter(x=>x.id!==id);
  await saveData(d);
  refreshAdmin();
}

function catalogItem(x){
  let w=(x.media||[]).filter(m=>m.kind==="work");
  let r=(x.media||[]).filter(m=>m.kind==="review");
  let ba=x.type==="service"&&Array.isArray(x.beforeAfter)?x.beforeAfter:[];
  let cover=x.cover||(w[0]?w[0].src:"");
  return `<article class="catalog-card">
    <a class="catalog-card-cover" href="details.html?id=${encodeURIComponent(x.id)}">
      ${cover?`<img src="${cover}" alt="${esc(x.name)}">`:`<div class="placeholder">✦</div>`}
      <span class="catalog-badge">${x.type==="product"?"منتج VELORA":"خدمة Salon Nosa"}</span>
    </a>
    <div class="catalog-card-body">
      <h2>${esc(x.name)}</h2>
      <p>${esc(x.desc)}</p>
      <div class="catalog-stats">
        <span>📸 ${w.length} صور</span>
        ${x.type==="service"?`<span>✨ ${ba.length} قبل وبعد</span>`:""}
        <span>💬 ${r.length} آراء</span>
      </div>
      <a class="catalog-card-btn" href="details.html?id=${encodeURIComponent(x.id)}">عرض التفاصيل كاملة <span>←</span></a>
    </div>
  </article>`;
}
function renderCatalog(){
  let d=getData(),sp=document.getElementById("servicesCatalog"),pp=document.getElementById("productsCatalog");
  if(sp)sp.innerHTML=d.services.length?d.services.map(catalogItem).join(""):'<div class="empty">لم تتم إضافة خدمات حتى الآن.</div>';
  if(pp)pp.innerHTML=d.products.length?d.products.map(catalogItem).join(""):'<div class="empty">لم تتم إضافة منتجات حتى الآن.</div>';
}

document.addEventListener("DOMContentLoaded",()=>{
  home();detail();renderCatalog();updateBaSelectors();
  let f=document.getElementById("mediaFiles");if(f)f.addEventListener("change",selectedInfo);
  let bf=document.getElementById("beforeFiles"),af=document.getElementById("afterFiles");
  if(bf)bf.addEventListener("change",updateBaInfo);
  if(af)af.addEventListener("change",updateBaInfo);
  if(location.pathname.toLowerCase().endsWith("admin.html")&&sessionStorage.getItem("adminOK")==="1")showAdmin();
  let y=document.getElementById("year");if(y)y.textContent=new Date().getFullYear();
  initializeCloud();
});

window.addEventListener("storage",function(e){
  if(e.key===KEY){refreshPublicLive()}
});
window.addEventListener("catalogLiveUpdate",function(){refreshPublicLive()});

(function(){
  let lastLive=localStorage.getItem(KEY+"_tick")||"";
  setInterval(function(){
    try{
      const t=localStorage.getItem(KEY+"_tick")||"";
      if(t&&t!==lastLive){
        lastLive=t;
        refreshPublicLive();
        try{if(typeof refreshAdmin==="function"&&document.getElementById("app")?.hidden===false)refreshAdmin()}catch(e){}
      }
    }catch(e){}
  },1000);
})();
