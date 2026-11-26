/* جدولك: غرف المذاكرة + لعبة مين الدخيل (Firebase Spark, تحميل كسول) */
(function(){
var FBV="https://www.gstatic.com/firebasejs/11.0.2/";
var CFG={apiKey:"AIzaSyBMfYl8gNpkfiqJPuXOeAvrc4w6T5jAslU",authDomain:"jadwalak-rooms.firebaseapp.com",projectId:"jadwalak-rooms",storageBucket:"jadwalak-rooms.firebasestorage.app"};
var F=null,db=null,uid=null,code=null,room=null,members={},feed=[],game=null,secret=null,clues=[],votes={},guessDoc=null,reveal=null;
var subs=[],gsubs=[],mode="home",tab="week",gsig="",busy=false,firstFeed=true,tickT=0,hostPriv=null,rec=null;
var CH="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var TURN=45000,VOTE=60000,GUESS=45000;
function view(){return document.getElementById("v-rooms")}
function myCode(){try{return localStorage.getItem("jd_room_"+U.id)||""}catch(e){return ""}}
function setCode(c){try{if(c)localStorage.setItem("jd_room_"+U.id,c);else localStorage.removeItem("jd_room_"+U.id)}catch(e){}}
function say(m){var t=document.createElement("div");t.className="rtoast";t.innerHTML=m;document.body.appendChild(t);setTimeout(function(){t.classList.add("out")},3200);setTimeout(function(){t.remove()},3700)}
function load(){
 if(F)return Promise.resolve();
 return Promise.all([import(FBV+"firebase-app.js"),import(FBV+"firebase-auth.js"),import(FBV+"firebase-firestore.js")]).then(function(m){
  var app=m[0].initializeApp(CFG),au=m[1].getAuth(app);
  F=m[2];db=F.initializeFirestore(app,{experimentalAutoDetectLongPolling:true});
  return (au.authStateReady?au.authStateReady():Promise.resolve()).then(function(){return au.currentUser||m[1].signInAnonymously(au)}).then(function(){uid=au.currentUser.uid});
 });
}
function D(){return F.doc.apply(null,[db].concat([].slice.call(arguments)))}
function C(){return F.collection.apply(null,[db].concat([].slice.call(arguments)))}
function weekStats(){
 if(!U||!P||!ST)return {done:0,total:0,today:0};
 var wi=Math.max(0,ST.wi),wk=P.days.slice(wi*7,wi*7+7),d=0,t=0;
 wk.forEach(function(x){x.items.forEach(function(i){t++;if(U.done[i.id])d++})});
 var td=P.by&&P.by[ST.tdi],tn=td?td.items.filter(function(i){return U.done[i.id]}).length:0;
 return {done:d,total:t,today:tn};
}
function memberData(){var s=weekStats();return {name:String(U.name).slice(0,30),done:s.done,total:s.total,today:s.today,track:String(PK),ts:Date.now()}}
/* ---- sync hooks called by the app ---- */
var lastSent="",syncT=0;
window.RoomsSync=function(){
 if(!myCode()||!U)return;clearTimeout(syncT);syncT=setTimeout(function(){
  load().then(function(){var c=myCode();if(!c)return;var m=memberData(),sg=m.done+"|"+m.total+"|"+m.today;if(sg==lastSent)return;lastSent=sg;
   return F.updateDoc(D("rooms",c,"members",uid),m).catch(function(e){lastSent=""})}).catch(function(){});
 },1500);
};
window.RoomsFeed=function(it){
 if(!myCode()||!it||!U)return;
 load().then(function(){var c=myCode();if(!c)return;
  return F.addDoc(C("rooms",c,"feed"),{uid:uid,name:String(U.name).slice(0,30),text:String((SUBJ[it.k]?SUBJ[it.k][0]+": ":"")+it.t).slice(0,140),ts:Date.now()})}).catch(function(e){console.error("feed",e.code)});
};
/* ---- navigation ---- */
function open(c){code=c;setCode(c);lastSent="";mode="room";firstFeed=true;listen();render();RoomsSync()}
function stop(){subs.forEach(function(u){u()});subs=[];gstop();clearInterval(tickT);room=null;members={};feed=[];game=null}
function gstop(){gsubs.forEach(function(u){u()});gsubs=[];secret=null;clues=[];votes={};guessDoc=null;reveal=null;gsig=""}
function listen(){
 stop();
 subs.push(F.onSnapshot(D("rooms",code),function(s){room=s.exists()?s.data():null;if(!room){say("الغرفة دي اتقفلت");setCode("");mode="home";stop()}render()},function(){}));
 subs.push(F.onSnapshot(C("rooms",code,"members"),function(s){members={};s.forEach(function(d){members[d.id]=d.data()});if(!members[uid]&&Object.keys(members).length&&mode=="room"){}render();gameUI()},function(e){if(e&&e.code=="permission-denied"){say("مش عضو في الغرفة دي");setCode("");mode="home";stop();render()}}));
 subs.push(F.onSnapshot(F.query(C("rooms",code,"feed"),F.orderBy("ts","desc"),F.limit(12)),function(s){
  feed=[];s.forEach(function(d){feed.push(d.data())});
  if(!firstFeed){s.docChanges().forEach(function(ch){if(ch.type=="added"){var f=ch.doc.data();if(f.uid!=uid&&Date.now()-f.ts<60000){say("<b>"+esc(f.name)+"</b> خلّص ✓<br><span>"+esc(f.text)+"</span>");if(window.sfx)sfx("tick")}}})}
  firstFeed=false;renderFeed()},function(){}));
 subs.push(F.onSnapshot(F.query(C("rooms",code,"games"),F.orderBy("createdAt","desc"),F.limit(1)),function(s){
  var g=null,id=null;s.forEach(function(d){g=d.data();id=d.id});
  if(g)g.id=id;var changed=(g&&game&&g.id!=game.id)||(!!g!=!!game);game=g;
  if(changed||(g&&!gsubs.length))glisten();
  gameUI();hostTickStart()},function(){}));
}
function glisten(){
 gstop();if(!game)return;var gid=game.id,b=["rooms",code,"games",gid];
 gsubs.push(F.onSnapshot(D.apply(null,b.concat(["secrets",uid])),function(s){secret=s.exists()?s.data():null;gameUI()},function(){}));
 gsubs.push(F.onSnapshot(F.query(C.apply(null,b.concat(["clues"])),F.orderBy("ts")),function(s){clues=[];s.forEach(function(d){var x=d.data();x.id=d.id;clues.push(x)});gameUI();hostStep()},function(){}));
 gsubs.push(F.onSnapshot(C.apply(null,b.concat(["votes"])),function(s){votes={};s.forEach(function(d){votes[d.id]=d.data()});gameUI();hostStep()},function(){}));
 gsubs.push(F.onSnapshot(C.apply(null,b.concat(["guess"])),function(s){guessDoc=null;s.forEach(function(d){guessDoc=d.data()});gameUI();hostStep()},function(){}));
 gsubs.push(F.onSnapshot(C.apply(null,b.concat(["reveal"])),function(s){reveal=null;s.forEach(function(d){reveal=d.data()});gameUI()},function(){}));
}
/* ---- shell ---- */
function ensureView(){
 if(view())return;
 var v=document.createElement("div");v.className="view";v.id="v-rooms";var az=document.getElementById("v-az");az.parentNode.insertBefore(v,az.nextSibling);
 var card=document.createElement("div");card.className="card tilt rmcard";card.id="rmhome";
 card.innerHTML='<div class="row" style="justify-content:space-between"><div><b>ذاكر مع صحابك 👥</b><div class="note">اعمل غرفة بكود وذاكروا سوا، وتنافسوا على إنجاز الأسبوع</div></div><button id="rmopen" type="button">الغرف</button></div>';
 var hm=document.getElementById("hm");hm.parentNode.insertBefore(card,hm.nextSibling);
 card.querySelector("#rmopen").onclick=function(){go("rooms");openRooms()};
}
function openRooms(){ensureView();view().innerHTML='<div class="card"><div class="note">بنحمّل الغرف…</div></div>';
 load().then(function(){var c=myCode();if(c&&mode!="room"){code=c;mode="room";listen()}else if(!c)mode="home";render()}).catch(function(e){view().innerHTML='<div class="card"><b>مش قادر أتصل بالغرف دلوقتي</b><div class="note">اتأكد من النت وجرب تاني.</div><button id="rmretry" type="button" style="margin-top:8px">جرب تاني</button></div>';document.getElementById("rmretry").onclick=openRooms})}
function esc2(s){return esc(s==null?"":s)}
function render(){
 var v=view();if(!v||!document.getElementById("v-rooms").classList.contains("on"))return;
 if(mode=="home"){
  v.innerHTML='<div class="card rmh"><h3>غرف المذاكرة</h3><p class="note">اعمل غرفة وادي الكود لصاحبك، أو ادخل غرفة بالكود. بتشاركوا اسمكم وعدد المهام اللي خلصتوها وعناوين الدروس اللي بتخلصوها بس، ومحدش برّه الغرفة يشوف حاجة.</p><div class="rmbtns"><button id="rmc" type="button">إنشاء غرفة</button><button id="rmj" type="button" class="g">الانضمام لغرفة</button></div></div>';
  v.querySelector("#rmc").onclick=function(){mode="create";render()};v.querySelector("#rmj").onclick=function(){mode="join";render()};return;
 }
 if(mode=="create"){
  var ops=KS.map(function(k){return '<option value="'+k+'">'+esc2(SUBJ[k]?SUBJ[k][0]:k)+'</option>'}).join("");
  v.innerHTML='<div class="card"><h3>إنشاء غرفة</h3><label class="note">اسم الغرفة</label><input type="text" id="rn" maxlength="40" placeholder="مثلاً: مذاكرة الفيزياء"><label class="note">المادة</label><select id="rs">'+ops+'</select><label class="note">عدد الأشخاص</label><div class="row"><input type="number" id="rm" min="2" max="30" value="4" style="width:90px"><label class="row note"><input type="checkbox" id="ru"> غير محدود</label></div><div class="note">الغرفة بالكود بس، ومش بتظهر لحد في بحث.</div><div class="err" id="re"></div><div class="rmbtns"><button id="rp" type="button">نشر الغرفة</button><button id="rb" type="button" class="g">رجوع</button></div></div>';
  v.querySelector("#rb").onclick=function(){mode="home";render()};
  v.querySelector("#rp").onclick=function(){
   var n=v.querySelector("#rn").value.trim(),mx=v.querySelector("#ru").checked?0:Math.max(2,Math.min(30,+v.querySelector("#rm").value||4));
   if(!n){v.querySelector("#re").textContent="اكتب اسم للغرفة";return}
   createRoom(n,v.querySelector("#rs").value,mx)};return;
 }
 if(mode=="join"){
  v.innerHTML='<div class="card"><h3>الانضمام لغرفة</h3><label class="note">كود الغرفة (6 حروف وأرقام)</label><input type="text" id="jc" maxlength="6" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:6px;text-align:center;font-size:22px" placeholder="______"><div class="err" id="re"></div><div class="rmbtns"><button id="jg" type="button">دخول</button><button id="rb" type="button" class="g">رجوع</button></div></div>';
  v.querySelector("#rb").onclick=function(){mode="home";render()};
  v.querySelector("#jg").onclick=function(){joinRoom(v.querySelector("#jc").value.trim().toUpperCase())};return;
 }
 if(mode=="room"){roomUI();return}
}
function genCode(){var a=new Uint8Array(6);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(x){return CH[x%CH.length]}).join("")}
function err(m){var e=view().querySelector("#re");if(e)e.textContent=m}
function createRoom(n,subj,mx){
 if(busy)return;busy=true;var tries=0;
 (function go1(){
  var c=genCode(),b=F.writeBatch(db);
  b.set(D("rooms",c),{name:n,subject:subj,max:mx,owner:uid,n:1,createdAt:Date.now()});
  b.set(D("rooms",c,"members",uid),memberData());
  b.commit().then(function(){busy=false;open(c);say("الغرفة اتنشرت. الكود: <b>"+c+"</b>")}).catch(function(e){if(tries++<2){go1()}else{busy=false;err("معرفتش أنشر الغرفة. جرب تاني.")}});
 })();
}
function joinRoom(c){
 if(!/^[A-Z2-9]{6}$/.test(c)){err("الكود 6 حروف وأرقام");return}
 if(busy)return;busy=true;
 F.getDoc(D("rooms",c)).then(function(s){
  if(!s.exists()){busy=false;err("الكود ده مش موجود");return}
  return F.getDoc(D("rooms",c,"members",uid)).then(function(m){busy=false;open(c)},function(){
   var r=s.data();if(r.max&&r.n>=r.max){busy=false;err("الغرفة كاملة");return}
   var b=F.writeBatch(db);b.update(D("rooms",c),{n:r.n+1});b.set(D("rooms",c,"members",uid),memberData());
   return b.commit().then(function(){busy=false;open(c)}).catch(function(){busy=false;err("معرفتش أدخل. جرب تاني.")});
  });
 }).catch(function(){busy=false;err("معرفتش أدخل. اتأكد من الكود والنت.")});
}
function leaveRoom(){
 var c=code;if(!c||!room)return;var b=F.writeBatch(db);b.update(D("rooms",c),{n:Math.max(0,(room.n||1)-1)});b.delete(D("rooms",c,"members",uid));
 b.commit().then(function(){stop();setCode("");code=null;mode="home";render()}).catch(function(){say("معرفتش أخرج. جرب تاني.")});
}
/* ---- room screen ---- */
function roomUI(){
 var v=view();if(!room){v.innerHTML='<div class="card"><div class="note">بنحمّل الغرفة…</div></div>';return}
 var sub=SUBJ[room.subject]?SUBJ[room.subject][0]:"";
 var n=Object.keys(members).length;
 v.innerHTML='<div class="card rmhead"><div class="row" style="justify-content:space-between"><div><b>'+esc2(room.name)+'</b><div class="note">'+esc2(sub)+' · '+n+'/'+(room.max||"∞")+' أعضاء</div></div><button type="button" class="g" id="rl">خروج من الغرفة</button></div>'+
  '<div class="rcode" id="rcode" title="انسخ"><span>كود الغرفة</span><b>'+esc2(code)+'</b></div><div class="rmbtns"><button type="button" id="rsh">ابعت الكود لصاحبك</button></div></div>'+
  '<div id="rvs"></div><div id="rmem"></div><div id="rgame"></div><div class="card"><h3>آخر اللي خلّصوه</h3><div id="rfeed"></div></div>';
 v.querySelector("#rl").onclick=function(){if(confirm("تخرج من الغرفة؟"))leaveRoom()};
 v.querySelector("#rsh").onclick=function(){var t="تعالى نذاكر سوا على جدولك! ادخل الغرف واكتب الكود: "+code+"\n"+location.origin+location.pathname;if(navigator.share){navigator.share({text:t}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(t);say("اتنسخ")}};
 v.querySelector("#rcode").onclick=function(){if(navigator.clipboard){navigator.clipboard.writeText(code);say("الكود اتنسخ")}};
 renderMembers();renderFeed();gsig="";gameUI();
}
function val(m){return tab=="week"?(m.done||0):(m.today||0)}
function renderMembers(){
 var v=view();if(!v||mode!="room")return;var box=v.querySelector("#rvs"),mm=v.querySelector("#rmem");if(!box)return;
 var arr=Object.keys(members).map(function(k){var m=members[k];m.id=k;return m}).sort(function(a,b){return val(b)-val(a)});
 var me=members[uid]||{done:0,today:0,name:U.name},mine=val(me);
 var others=arr.filter(function(m){return m.id!=uid});
 var best=others[0];
 var h='<div class="card rvs3d"><div class="row" style="justify-content:space-between"><b>المنافسة</b><div class="seg" id="rtab"><button type="button" data-t="week" class="'+(tab=="week"?"on":"")+'">الأسبوع</button><button type="button" data-t="today" class="'+(tab=="today"?"on":"")+'">النهاردة</button></div></div>';
 if(!best){h+='<div class="note" style="margin-top:10px">لسه محدش دخل معاك. ابعت الكود لصاحبك.</div>'}
 else{
  var o=val(best),tot=mine+o,p=tot?Math.round(mine/tot*100):50,tilt=Math.max(-5,Math.min(5,(p-50)/50*5));
  var msg=mine>o?"أنت قدّام بـ "+(mine-o)+(mine-o==1?" مهمة":" مهام"):mine<o?esc2(best.name)+" خلّص أكتر منك بـ "+(o-mine)+(o-mine==1?" مهمة":" مهام"):"متعادلين";
  h+='<div class="vsw"><div class="vs" style="transform:perspective(600px) rotateX(16deg) rotateZ('+(-tilt)+'deg)"><i class="w" style="width:'+p+'%"><em>'+mine+'</em></i><i class="r" style="width:'+(100-p)+'%"><em>'+o+'</em></i></div></div><div class="vsn"><span>أنت</span><span>'+esc2(best.name)+'</span></div><div class="vsm">'+msg+'</div>';
 }
 h+='</div>';box.innerHTML=h;
 var t=box.querySelector("#rtab");if(t)t.querySelectorAll("button").forEach(function(b){b.onclick=function(){tab=b.dataset.t;renderMembers()}});
 mm.innerHTML='<div class="card"><h3>الأعضاء</h3>'+arr.map(function(m,i){var pc=m.total?Math.round((m.done||0)/m.total*100):0;return '<div class="mrow"><span class="rk">'+(i+1)+'</span><div class="mi"><b>'+esc2(m.name)+(m.id==uid?" (أنت)":"")+'</b><div class="bar"><i style="width:'+pc+'%"></i></div></div><span class="mv">'+(m.done||0)+'<small>/'+(m.total||0)+'</small></span></div>'}).join("")+'</div>';
}
function renderFeed(){
 renderMembers();var v=view();if(!v)return;var f=v.querySelector("#rfeed");if(!f)return;
 f.innerHTML=feed.length?feed.map(function(x){var d=new Date(x.ts);return '<div class="fitem'+(x.uid==uid?" me":"")+'"><b>'+esc2(x.name)+'</b> ✓<div class="note">'+esc2(x.text)+' · '+d.toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})+'</div></div>'}).join(""):'<div class="note">لسه محدش خلّص حاجة. أول واحد يخلّص هيظهر هنا.</div>';
}
/* ---- Who is the spy ---- */
function names(){var o={};Object.keys(members).forEach(function(k){o[k]=members[k].name});return o}
function isHost(){return game&&game.host==uid}
function lessonsFor(k){var seen={},o=[];T1.concat(T2).forEach(function(x){if(x.k==k&&x.t&&!seen[x.t]){seen[x.t]=1;o.push(x.t)}});return o}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function gsig2(){return [game&&game.id,game&&game.status,game&&game.round,game&&game.turn,clues.length,Object.keys(votes).length,!!guessDoc,!!reveal,!!secret,Object.keys(members).length].join("|")}
function gameUI(){
 var v=view();if(!v||mode!="room")return;var g=v.querySelector("#rgame");if(!g)return;
 var s=gsig2();if(s==gsig&&g.innerHTML)return;gsig=s;
 var n=Object.keys(members).length;
 if(!game||game.status=="done"&&!reveal&&false){g.innerHTML=startCard(n);bindStart(g);return}
 var st=game.status,nm=game.names||{},h='<div class="card gm"><div class="row" style="justify-content:space-between"><h3>مين الدخيل؟ 🕵️</h3><span class="tag now">'+({clues:"الأدلة",vote:"التصويت",guess:"تخمين الدخيل",done:"النتيجة"}[st]||"")+'</span></div>';
 if(st!="done"){
  if(secret){h+=secret.role=="spy"?'<div class="role spy"><b>أنت الدخيل 🕵️</b><div class="note">مش عارف الدرس. المادة: '+esc2(game.subjName)+'. اسمع الأدلة وحاول تخمّن.</div></div>':'<div class="role"><div class="note">الدرس</div><b>'+esc2(secret.lesson)+'</b><div class="note">اديلهم دليل من غير ما تقول اسم الدرس.</div></div>'}
  else h+='<div class="note">بنجهّز دورك…</div>';
 }
 h+='<div class="clist">'+clues.map(function(c){return '<div class="clue"><b>'+esc2(c.name)+'</b> <small>الجولة '+c.round+'</small><div>'+esc2(c.text||"")+'</div>'+(c.voice?'<audio controls preload="none" src="'+c.voice+'"></audio>':'')+'</div>'}).join("")+'</div>';
 if(st=="clues"){
  var cur=game.order[game.turn],isMe=cur==uid;
  h+='<div class="turn">'+(isMe?'<b>دورك:</b> اكتب دليل أو سجّل صوت (8 ثواني)':'الدور على <b>'+esc2(nm[cur]||"")+'</b>')+' · الجولة '+game.round+' من 2 <span id="gtm"></span></div>';
  if(isMe)h+='<div class="compose"><input type="text" id="gct" maxlength="100" placeholder="اكتب دليلك هنا"><div class="rmbtns"><button type="button" id="gsend">ابعت</button><button type="button" class="g" id="gvoice">🎙️ سجّل</button></div><div id="gvs" class="note"></div></div>';
 }
 if(st=="vote"){
  var mv=votes[uid];
  h+='<div class="turn">مين الدخيل في رأيك؟ <span id="gtm"></span></div><div class="vlist">'+game.order.filter(function(u){return u!=uid}).map(function(u){return '<button type="button" class="'+(mv&&mv.for==u?"":"g")+'" data-v="'+u+'">'+esc2(nm[u]||"")+'</button>'}).join("")+'</div><div class="note">صوّت '+Object.keys(votes).length+' من '+game.order.length+'</div>';
 }
 if(st=="guess"){
  var spyMe=secret&&secret.role=="spy";
  h+='<div class="turn">'+(game.caught?"اتكشف الدخيل! ":"محدش كشفه! ")+(spyMe?'اختار الدرس <span id="gtm"></span>':'الدخيل بيختار الدرس…')+'</div>';
  if(spyMe&&!guessDoc)h+='<div class="vlist">'+game.options.map(function(o,i){return '<button type="button" data-o="'+i+'">'+esc2(o)+'</button>'}).join("")+'</div>';
 }
 if(st=="done"&&reveal){
  h+='<div class="result '+(reveal.winner=="spy"?"spyw":"grpw")+'"><b>'+(reveal.winner=="spy"?"الدخيل كسب 🕵️":"المجموعة كسبت 🎉")+'</b><div>الدخيل كان: <b>'+esc2(reveal.spyName)+'</b></div><div>الدرس: <b>'+esc2(reveal.lesson)+'</b></div>'+(reveal.guess?'<div class="note">تخمين الدخيل: '+esc2(reveal.guess)+'</div>':'')+'</div>';
  h+=startCard(n,true);
 }
 h+='</div>';g.innerHTML=h;bindGame(g);
 if(st=="done")bindStart(g);
}
function startCard(n,again){
 var ok=n>=3;
 return '<div class="card gm"><h3>'+(again?"لعبة جديدة":"ألعاب 🎮")+'</h3><div class="gcard"><b>مين الدخيل؟ 🕵️</b><div class="note">الكل بيشوف الدرس إلا الدخيل. كل واحد يقول دليل من غير ما يسمّي الدرس، والدخيل يحاول يخمّن. لازم 3 لاعبين أو أكتر.</div>'+(ok?'<button type="button" id="gstart">ابدأ اللعبة ('+n+' لاعبين)</button>':'<div class="note">محتاجين لاعب تالت على الأقل (دلوقتي '+n+').</div>')+'</div></div>';
}
function bindStart(g){var b=g.querySelector("#gstart");if(b)b.onclick=startGame}
function bindGame(g){
 var sd=g.querySelector("#gsend");if(sd)sd.onclick=function(){sendClue()};
 var vb=g.querySelector("#gvoice");if(vb)vb.onclick=toggleRec;
 g.querySelectorAll("[data-v]").forEach(function(b){b.onclick=function(){F.setDoc(D("rooms",code,"games",game.id,"votes",uid),{for:b.dataset.v}).catch(function(e){console.error("vote",e.code);say("معرفتش أسجّل التصويت")})}});
 g.querySelectorAll("[data-o]").forEach(function(b){b.onclick=function(){F.setDoc(D("rooms",code,"games",game.id,"guess",uid),{pick:game.options[+b.dataset.o]}).catch(function(){say("معرفتش أبعت التخمين")})}});
}
var pendingVoice=null;
function sendClue(){
 var t=(view().querySelector("#gct").value||"").trim();if(!t&&!pendingVoice){say("اكتب دليل أو سجّل صوت");return}
 var d={uid:uid,name:String(U.name).slice(0,30),text:t.slice(0,100),round:game.round,turn:game.turn,ts:Date.now()};
 if(pendingVoice)d.voice=pendingVoice;pendingVoice=null;
 F.addDoc(C("rooms",code,"games",game.id,"clues"),d).catch(function(){say("معرفتش أبعت الدليل")});
}
function toggleRec(){
 var vs=view().querySelector("#gvs"),b=view().querySelector("#gvoice");
 if(rec){rec.stop();return}
 if(!navigator.mediaDevices||!window.MediaRecorder){vs.textContent="المتصفح ده مش بيدعم التسجيل. اكتب الدليل.";return}
 navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
  var ch=[],mr;try{mr=new MediaRecorder(st,{audioBitsPerSecond:24000})}catch(e){mr=new MediaRecorder(st)}
  rec=mr;b.textContent="⏹ وقّف";vs.textContent="بيسجّل… (أقصى 8 ثواني)";
  mr.ondataavailable=function(e){if(e.data&&e.data.size)ch.push(e.data)};
  var to=setTimeout(function(){if(rec)rec.stop()},8000);
  mr.onstop=function(){clearTimeout(to);st.getTracks().forEach(function(t){t.stop()});rec=null;var bl=new Blob(ch,{type:mr.mimeType||"audio/webm"}),fr=new FileReader();
   fr.onload=function(){if(fr.result.length>85000){vs.textContent="التسجيل طويل. جرب أقصر.";return}pendingVoice=fr.result;var vb=view().querySelector("#gvoice");if(vb)vb.textContent="🎙️ سجّل تاني";var q=view().querySelector("#gvs");if(q)q.innerHTML='جاهز، دوس ابعت.<br><audio controls src="'+pendingVoice+'"></audio>'};fr.readAsDataURL(bl)};
  mr.start();
 }).catch(function(){vs.textContent="محتاج إذن المايك. أو اكتب الدليل."});
}
function startGame(){
 var ids=Object.keys(members);if(ids.length<3)return;
 var ls=lessonsFor(room.subject);if(!ls.length){say("مفيش دروس للمادة دي في جدولك");return}
 var lesson=pick(ls),spy=pick(ids),order=shuffle(ids),nm=names();
 var old=game&&game.id,prev=clues.slice();
 var gref=F.doc(C("rooms",code,"games")),gid=gref.id,b=F.writeBatch(db);
 b.set(gref,{host:uid,status:"clues",subject:room.subject,subjName:SUBJ[room.subject]?SUBJ[room.subject][0]:"",order:order,names:nm,round:1,turn:0,turnEnds:Date.now()+TURN,createdAt:Date.now()});
 b.commit().then(function(){
  hostPriv={gid:gid,lesson:lesson,spy:spy,opts:ls};try{sessionStorage.setItem("spy_"+gid,JSON.stringify(hostPriv))}catch(e){}
  var b2=F.writeBatch(db);ids.forEach(function(u){b2.set(D("rooms",code,"games",gid,"secrets",u),{role:u==spy?"spy":"player",lesson:u==spy?null:lesson})});
  return b2.commit()}).then(function(){
  if(old&&prev.length){var b3=F.writeBatch(db);prev.forEach(function(c){b3.delete(D("rooms",code,"games",old,"clues",c.id))});b3.commit().catch(function(){})}
 }).catch(function(){say("معرفتش أبدأ اللعبة")});
}
/* host automation: advance turns, tally votes, reveal */
function priv(){if(hostPriv&&game&&hostPriv.gid==game.id)return hostPriv;try{var s=sessionStorage.getItem("spy_"+game.id);if(s){hostPriv=JSON.parse(s);return hostPriv}}catch(e){}return null}
function gref(){return D("rooms",code,"games",game.id)}
function hostStep(){
 if(!game||!isHost()||game.status=="done")return;var st=game.status;
 if(st=="clues"){
  var done=clues.some(function(c){return c.round==game.round&&c.turn==game.turn});
  if(done||Date.now()>game.turnEnds+2000)nextTurn();
 }else if(st=="vote"){
  if(Object.keys(votes).length>=game.order.length||Date.now()>game.voteEnds)tally();
 }else if(st=="guess"){
  if(guessDoc||Date.now()>game.guessEnds)finish();
 }
}
var lastAdv="";
function nextTurn(){
 var key=game.id+"|"+game.round+"|"+game.turn;if(lastAdv==key)return;lastAdv=key;
 var t=game.turn+1,r=game.round;
 if(t>=game.order.length){t=0;r++}
 if(r>2)F.updateDoc(gref(),{status:"vote",voteEnds:Date.now()+VOTE}).catch(function(){});
 else F.updateDoc(gref(),{turn:t,round:r,turnEnds:Date.now()+TURN}).catch(function(){});
}
var tallied="";
function tally(){
 if(tallied==game.id)return;var p=priv();if(!p){return}tallied=game.id;
 var cnt={};Object.keys(votes).forEach(function(u){var f=votes[u].for;cnt[f]=(cnt[f]||0)+1});
 var top=null,tv=0,tie=false;Object.keys(cnt).forEach(function(k){if(cnt[k]>tv){tv=cnt[k];top=k;tie=false}else if(cnt[k]==tv)tie=true});
 var caught=!tie&&top==p.spy;
 var opts=[p.lesson],pool=shuffle(p.opts.filter(function(x){return x!=p.lesson&&x.slice(0,6)!=p.lesson.slice(0,6)}));
 pool.slice(0,4).forEach(function(x){opts.push(x)});if(opts.length<3){shuffle(p.opts).forEach(function(x){if(opts.indexOf(x)<0&&opts.length<5)opts.push(x)})}
 F.updateDoc(gref(),{status:"guess",caught:caught,options:shuffle(opts),guessEnds:Date.now()+GUESS}).catch(function(e){tallied="";console.error("tally",e.code)});
}
var fin="";
function finish(){
 if(fin==game.id)return;var p=priv();if(!p)return;fin=game.id;
 var g=guessDoc?guessDoc.pick:"",ok=g&&g==p.lesson,spyWin=!game.caught||ok;
 var nm=(game.names||{})[p.spy]||"";
 var b=F.writeBatch(db);b.set(D("rooms",code,"games",game.id,"reveal","r"),{lesson:p.lesson,spy:p.spy,spyName:nm,caught:!!game.caught,guess:g,winner:spyWin?"spy":"group"});b.update(gref(),{status:"done"});
 b.commit().catch(function(){fin=""});
}
function hostTickStart(){
 clearInterval(tickT);tickT=setInterval(function(){
  var el=view()&&view().querySelector("#gtm");
  if(game&&el){var end=game.status=="clues"?game.turnEnds:game.status=="vote"?game.voteEnds:game.status=="guess"?game.guessEnds:0;var s=Math.max(0,Math.round((end-Date.now())/1000));el.textContent="· "+s+" ث"}
  if(game&&isHost())hostStep();
 },1000);
}
/* wiring */
window.__rd=function(){return JSON.stringify({st:game&&game.status,n:Object.keys(members).length,votes:Object.keys(votes).length,ord:game&&game.order.length,priv:!!(game&&priv()),host:isHost()})};
function boot(){if(!document.getElementById("hm")||!document.getElementById("v-az")){setTimeout(boot,300);return}ensureView();
 var o=window.go;window.go=function(v){o(v);if(v=="rooms")openRooms()};}
document.addEventListener("DOMContentLoaded",boot);if(document.readyState!="loading")boot();
})();
