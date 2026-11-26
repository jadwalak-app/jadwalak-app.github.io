const {spawn}=require('child_process');const fs=require('fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PAGE=process.env.PAGE||'preview4.html';
async function mk(i,name){
 const port=9400+i;const ch=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir=/tmp/prof'+i+'_'+Date.now(),'--window-size=390,800','about:blank'],{stdio:'ignore'});
 let tabs;for(let k=0;k<40;k++){await sleep(500);try{tabs=await (await fetch('http://127.0.0.1:'+port+'/json')).json();if(tabs.length)break}catch(e){}}
 const ws=new WebSocket(tabs.find(t=>t.type=='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pend={};const errs=[];
 ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d.result||d);delete pend[d.id]}if(d.method=='Runtime.exceptionThrown')errs.push(name+': '+JSON.stringify(d.params.exceptionDetails.exception&&d.params.exceptionDetails.exception.description||d.params.exceptionDetails.text).slice(0,300));if(d.method=='Runtime.consoleAPICalled'&&d.params.type=='error')errs.push(name+' console: '+JSON.stringify(d.params.args.map(a=>a.value||a.description)).slice(0,300))};
 const send=(method,params={})=>new Promise(r=>{const k=++id;pend[k]=r;ws.send(JSON.stringify({id:k,method,params}))});
 const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});return r.result&&r.result.value};
 const shot=async f=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(f,Buffer.from(r.data,'base64'))};
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:800,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:'http://localhost:8765/'+PAGE});await sleep(1800);
 await ev(`document.querySelector('[data-m=signup]').click();un.value='${name}';pw.value='secret12';authgo.click()`);await sleep(1200);
 const pick=async t=>{await sleep(1300);await ev(`[...document.querySelectorAll('#wz .wz-opt')].find(b=>b.textContent.trim()=='${t}').click()`)};
 for(const t of ['تانية ثانوي','بكالوريا','الطب وعلوم الحياة','الفيزياء','الجمعة','مهمة صغيرة واحدة'])await pick(t);
 await sleep(1400);await ev(`[...document.querySelectorAll('#wz #pmode button')][0].click()`);await sleep(300);await ev(`wzok.click()`);await sleep(1300);await ev(`[...document.querySelectorAll('#wz button')].filter(b=>b.textContent.trim()=='ابدأ الخطة').forEach(b=>b.click())`);await sleep(1500);
 return {ev,shot,errs,kill:()=>ch.kill(),send};
}
(async()=>{
 const srv=spawn('python3',['-m','http.server','8765'],{stdio:'ignore'});await sleep(800);
 const us=await Promise.all([mk(1,'hamza'),mk(2,'sara'),mk(3,'omar')]);const [a,b,c]=us;
 const log=(...x)=>console.log(...x);
 try{
 await a.ev(`go('home')`);await sleep(500);
 await a.shot('/tmp/rt_home.png');
 await a.ev(`document.getElementById('rmopen').click()`);await sleep(2500);
 await a.shot('/tmp/rt_rooms0.png');
 await a.ev(`document.getElementById('rmc').click()`);await sleep(300);
 await a.ev(`rn.value='مذاكرة الفيزياء';document.getElementById('rp').click()`);await sleep(5000);
 const code=await a.ev(`document.querySelector('#rcode b')&&document.querySelector('#rcode b').textContent`);log('code',code);
 for(const u of [b,c]){await u.ev(`go('rooms')`);await sleep(2500);await u.ev(`document.getElementById('rmj').click()`);await sleep(300);await u.ev(`jc.value='${code}';document.getElementById('jg').click()`);await sleep(2500)}
 log('members seen by a:',await a.ev(`document.querySelectorAll('.mrow').length`));
 await b.ev(`go('home')`);await sleep(500);
 log('tdl',await b.ev(`document.querySelectorAll('#tdl .it input').length+' '+typeof RoomsFeed+' '+localStorage.getItem('jd_room_'+U.id)`));await b.ev(`complete(Object.keys(ITEMS)[0])`);await sleep(3000);us.forEach(u=>u.errs.splice(0).forEach(e=>log(e)));
 us.forEach(u=>u.errs.splice(0).forEach(e=>log(e)));log('RF',await b.ev('typeof RoomsFeed+Object.keys(ITEMS).length+(ITEMS[Object.keys(ITEMS)[0]]||{}).k'));log('feed a:',await a.ev(`document.querySelector('#rfeed').innerText`));
 await a.ev(`go('rooms')`);await sleep(1500);await a.shot('/tmp/rt_room.png');
 log('toast a:',await a.ev(`[...document.querySelectorAll('.rtoast')].length`));
 // game
 await a.ev(`document.getElementById('gstart').click()`);await sleep(2500);
 await a.shot('/tmp/rt_game1.png');
 let shots=0;
 for(let i=0;i<60;i++){us.forEach(u=>u.errs.splice(0).forEach(e=>log(e)));
  for(const u of us){
   await u.ev(`(()=>{const g=document.getElementById('gct');if(g&&!g.value){g.value='دليل '+Math.floor(Math.random()*99);document.getElementById('gsend').click()}
    const v=document.querySelector('#rgame [data-v]');if(v&&!window.__v){window.__v=1;v.click()}
    const o=document.querySelector('#rgame [data-o]');if(o&&!window.__o){window.__o=1;o.click()}})()`);
  }
  const t=await a.ev(`document.querySelector('.gm .tag')&&document.querySelector('.gm .tag').textContent`);
  if(i%8==0)log(i,t,await a.ev('__rd()'),await b.ev('__rd()'));
  if(t=='الأدلة'&&shots==0&&i>3){await a.shot('/tmp/rt_game2.png');shots=1}
  if(t=='التصويت'&&shots==1){await a.shot('/tmp/rt_game3.png');shots=2}
  if(t=='النتيجة')break;
  await sleep(600);
 }
 await sleep(2500);
 for(const [n,u] of [['a',a],['b',b],['c',c]])log(n,'result:',await u.ev(`(document.querySelector('.result')||{}).innerText`));
 await a.shot('/tmp/rt_game4.png');
 await b.shot('/tmp/rt_game_b.png');
 }catch(e){log('ERR',e)}
 for(const u of us)u.errs.slice(0,8).forEach(e=>log(e));
 us.forEach(u=>u.kill());srv.kill();process.exit(0);
})();
