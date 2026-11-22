import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.ERRANDGO_CONFIG||{},sb=createClient(cfg.url,cfg.publishableKey),root=document.getElementById('root');
const portal=location.pathname.endsWith('/admin.html')?'admin':location.pathname.endsWith('/rider.html')?'rider':'customer';
let user=null,profile=null,role='customer',page='',online=false,coords=null,geoWatch=null,lastGPS=0,chatId=null;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phone=v=>{let x=String(v||'').replace(/\D/g,'');return x.startsWith('254')&&x.length===12?'+'+x:x.startsWith('0')&&x.length===10?'+254'+x.slice(1):x.length===9?'+254'+x:null};
const date=v=>new Date(v).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'});
const money=v=>'KES '+Number(v||0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2});
const brand='<div class="brand"><span class="mark">↗</span><span>Errand<span>Go</span></span></div>';
const msg=x=>{let a=document.createElement('div');a.className='alert';a.textContent=x?.message||String(x);document.body.appendChild(a);setTimeout(()=>a.remove(),5500)};
const safe=async promise=>{const r=await promise;if(r.error)throw r.error;return r};
const empty=t=>'<div class="empty">📭<p>'+esc(t)+'</p></div>';
const input=(label,name,type='text',required=true)=>'<div class="field"><label>'+esc(label)+'</label><input name="'+name+'" type="'+type+'" '+(required?'required':'')+'></div>';
const btn=(text,id,cls='dark')=>'<button class="btn '+cls+'" id="'+id+'">'+text+'</button>';
const dist=(a,b,c,d)=>{if([a,b,c,d].some(x=>x==null))return null;const rd=x=>x*Math.PI/180,v=Math.sin(rd(c-a)/2)**2+Math.cos(rd(a))*Math.cos(rd(c))*Math.sin(rd(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(v))};
function auth(){
if(portal==='rider'&&!location.search.includes('apply')&&!location.search.includes('login')){
 root.innerHTML='<div class="auth"><div class="auth-left">'+brand+'<div><div class="eyebrow">Ride with ErrandGo</div><h1>More journeys.<br><span style="color:#d3f36b">More earning.</span></h1><p>Find available jobs near you and manage your deliveries.</p></div></div><div class="auth-right"><div class="authbox"><div class="eyebrow">ErrandGo Rider</div><h2>Ready to ride?</h2><p class="muted">Apply to join or sign into your approved rider account.</p><div style="display:grid;gap:12px;margin-top:25px"><a class="btn dark full" href="./rider.html?apply=1">Apply as a Rider →</a><a class="btn white full" href="./rider.html?login=1">Rider Login →</a></div></div></div></div>';return
}
if(portal==='rider'&&location.search.includes('apply'))return guestApplication();
const heading=portal==='admin'?'ErrandGo Operations':portal==='rider'?'Rider Login':'Welcome to ErrandGo';
root.innerHTML='<div class="auth"><div class="auth-left">'+brand+'<div><div class="eyebrow">Your city, handled.</div><h1>'+ (portal==='admin'?'One platform. Total control.':portal==='rider'?'Your next job awaits.':'Need it done?<br><span style="color:#d3f36b">Consider it done.</span>')+'</h1><p>Errands, pickups and deliveries powered by ErrandGo.</p></div></div><div class="auth-right"><div class="authbox"><div class="eyebrow">'+(portal==='admin'?'Private operations login':'Your account')+'</div><h2>'+heading+'</h2><div class="row" style="margin:16px 0">'+btn('Sign in','signinTab','white small')+(portal==='admin'?'':btn('Create account','signupTab','white small'))+'</div><div id="authfields"></div></div></div></div>';
$('signinTab').onclick=()=>authForm(false);if($('signupTab'))$('signupTab').onclick=()=>authForm(true);authForm(false)
}
function authForm(signup){
$('authfields').innerHTML='<form id="accountForm">'+(signup?input('Full name','full_name')+input('Phone / WhatsApp','phone','tel'):'')+input('Email address','email','email')+input('Password','password','password')+'<button class="btn dark full">'+(signup?'Create account':'Sign in')+' →</button></form><p class="smallnote">Email and password. No paid WhatsApp OTP. Use an email and password you can recover.</p>';
$('accountForm').onsubmit=async e=>{e.preventDefault();const f=e.target,eMail=f.elements.namedItem('email').value.trim().toLowerCase(),pw=f.elements.namedItem('password').value;
const b=f.querySelector('button');b.disabled=true;
try{
if(signup){
const n=phone(f.elements.namedItem('phone').value);if(!n)throw Error('Enter a valid Kenyan phone number.');
if(pw.length<8)throw Error('Use at least 8 characters for your password.');
const r=await safe(sb.auth.signUp({email:eMail,password:pw,options:{data:{display_name:f.elements.namedItem('full_name').value.trim()}}}));
if(!r.data.session){msg('Account created. Email confirmation is still required by Supabase settings. Disable email confirmation for no-verification registration.');return}
user=r.data.user;profile=await ensureProfile(user,{full_name:f.elements.namedItem('full_name').value.trim(),phone:n,whatsapp:n});role=user.app_metadata?.role||'customer';return app();
}
await safe(sb.auth.signInWithPassword({email:eMail,password:pw}));return restore()
}catch(x){msg(x)}finally{b.disabled=false}};
}
async function ensureProfile(u,fields={}){
let r=await safe(sb.from('profiles').select('*').eq('id',u.id).maybeSingle());if(r.data)return r.data;
r=await safe(sb.from('profiles').insert({id:u.id,phone:fields.phone||'',full_name:fields.full_name||u.user_metadata?.display_name||'',whatsapp:fields.whatsapp||fields.phone||''}).select().single());return r.data;
}
async function restore(){
try{const r=await sb.auth.getUser();if(r.error||!r.data.user){user=null;return auth()}user=r.data.user;role=user.app_metadata?.role||'customer';profile=await ensureProfile(user);
if(portal==='admin'&&role!=='super_admin')return denied();
if(portal==='rider'&&role!=='rider'&&!location.search.includes('apply'))return denied();
if(portal==='customer'&&role!=='customer')return denied();
page=portal==='rider'&&role==='customer'?'Application':page;app();
}catch(e){msg(e);auth()}
}
function denied(){root.innerHTML='<div class="auth"><div class="auth-left">'+brand+'<h1>Account access</h1></div><div class="auth-right"><div class="authbox"><h2>Wrong workspace</h2><p class="muted">This account is not authorized for this workspace.</p>'+btn('Sign out','denyOut')+'</div></div></div>';$('denyOut').onclick=logout}
async function logout(){if(geoWatch!=null)navigator.geolocation.clearWatch(geoWatch);geoWatch=null;await sb.auth.signOut();user=null;auth()}
function guestApplication(){
root.innerHTML='<div class="auth"><div class="auth-left">'+brand+'<div><div class="eyebrow">Become a rider</div><h1>Make every<br><span style="color:#d3f36b">journey count.</span></h1><p>Submit your identification for Admin review. Approval can happen any time; most applications are targeted for review within 48 hours.</p></div></div><div class="auth-right"><div class="authbox" style="max-width:530px"><div class="row"><div class="eyebrow">New rider application</div><a href="./rider.html" class="smallnote">Back</a></div><h2>Apply to ride.</h2><p class="muted">No operating-area field. Rider selection uses live GPS after approval.</p><form id="application">'+input('Full legal name','name')+input('National ID number','nationalId')+input('Driving licence number','licenceNumber')+input('Phone / WhatsApp','mobile','tel')+input('Email address (account)','email','email')+input('Password (at least 8 characters)','password','password')+input('National ID front','front','file')+input('National ID back','back','file')+input('Driving licence photo / PDF','licence','file')+input('Insurance document','insurance','file')+'<button class="btn dark full">Submit Rider Application →</button></form><p class="smallnote">Documents: PDF, JPEG or PNG (max 5 MB each). Comparison is currently flagged for Admin manual review; an authenticity/face-matching service is not connected yet.</p></div></div></div>';
$('application').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;
try{
let n=phone(f.elements.namedItem('mobile').value);if(!n)throw Error('Enter a valid Kenyan phone number.');
const files=['front','back','licence','insurance'].map(k=>f.elements.namedItem(k).files[0]);
if(files.some(x=>!x||x.size>5242880||!['image/jpeg','image/png','application/pdf'].includes(x.type)))throw Error('Use a PDF/JPG/PNG smaller than 5 MB for every document.');
const email=f.elements.namedItem('email').value.trim().toLowerCase(),password=f.elements.namedItem('password').value;if(password.length<8)throw Error('Password must have at least 8 characters.');
let u=(await sb.auth.getUser()).data.user;
if(!u){const r=await safe(sb.auth.signUp({email,password,options:{data:{display_name:f.elements.namedItem('name').value.trim()}}}));if(!r.data.session)throw Error('Account created but Supabase is still requesting email confirmation. Disable confirmation in Auth settings before using no-verification registration.');u=r.data.user}
if(u.email!==email)throw Error('Sign in with the same email address used in this application.');
await ensureProfile(u,{full_name:f.elements.namedItem('name').value.trim(),phone:n,whatsapp:n});
const existing=await safe(sb.from('rider_applications').select('id,status').eq('applicant_id',u.id).maybeSingle());if(existing.data)throw Error('Rider already exists: '+existing.data.status);
const uploaded=[];try{
async function upload(file,label){const ext=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg',path=u.id+'/'+crypto.randomUUID()+'-'+label+'.'+ext;await safe(sb.storage.from('rider-documents').upload(path,file,{contentType:file.type}));uploaded.push(path);return path}
const front=await upload(files[0],'id-front'),back=await upload(files[1],'id-back'),licence=await upload(files[2],'licence'),insurance=await upload(files[3],'insurance');
await safe(sb.from('rider_applications').insert({applicant_id:u.id,full_name:f.elements.namedItem('name').value.trim(),national_id:f.elements.namedItem('nationalId').value.trim(),licence_number:f.elements.namedItem('licenceNumber').value.trim(),phone:n,id_front_path:front,id_back_path:back,licence_path:licence,insurance_path:insurance}));
}catch(x){await sb.storage.from('rider-documents').remove(uploaded);if(/duplicate key/.test(x.message||''))throw Error('Rider already exists with this ID or licence number.');throw x}
user=u;role='customer';profile=await ensureProfile(u);page='Application';app();msg('Application received. Target review: 48 hours; Admin may approve earlier.')
}catch(x){msg(x)}finally{b.disabled=false}};
}
function nav(){
if(portal==='admin')return ['Overview','Rider applications','All riders','All errands','Chats & receipts','Payments & payouts','Account'];
if(role==='rider')return ['Overview','Available jobs','Suggested jobs','My active jobs','Chats','Previous chats','Earnings','Account'];
if(portal==='rider')return ['Application','Account'];
return ['Overview','Book errand','My errands','Chats','Previous chats','Account']
}
function app(){
chatId=null;
const n=nav();if(!n.includes(page))page=n[0];
root.innerHTML='<div class="app"><aside class="sidebar">'+brand+'<div id="navigation">'+n.map(p=>'<button class="nav '+(p===page?'active':'')+'" data-page="'+esc(p)+'">'+esc(p)+'</button>').join('')+'</div><div class="sidebottom">Signed in<br><b>'+esc(profile?.full_name||user.email)+'</b></div></aside><section class="main"><div class="top"><b>'+esc(page)+'</b><div class="row"><button class="btn white small" id="refreshAll">↻ Refresh</button><button class="btn white small" id="logout">Sign out</button></div></div><div class="mobile-nav">'+n.map(p=>'<button data-page="'+esc(p)+'">'+esc(p)+'</button>').join('')+'</div><main class="content"><div id="screen" class="card">Loading...</div></main><div class="footer">ErrandGo · Your city, handled</div></section></div>';
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;app()});$('logout').onclick=logout;$('refreshAll').onclick=load;load()
}
function job(j,action=''){
return '<div class="job"><div class="row"><b>'+esc(j.category)+'</b><span class="status '+esc(j.status)+'">'+esc(j.status)+'</span></div><p>'+esc(j.description)+'</p><div class="smallnote">📍 '+esc(j.pickup)+' → '+esc(j.destination)+'</div><div class="row" style="margin-top:12px"><span class="smallnote">'+date(j.created_at)+' · '+(j.payment_status==='paid'?'Paid':'Payment pending')+'</span>'+action+'</div></div>'
}
async function setOnline(){
if(online){if(geoWatch!=null)navigator.geolocation.clearWatch(geoWatch);geoWatch=null;await safe(sb.from('rider_presence').upsert({rider_id:user.id,is_online:false,updated_at:new Date().toISOString()}));online=false;return app()}
if(!navigator.geolocation)throw Error('Location sharing is unavailable.');
navigator.geolocation.getCurrentPosition(async p=>{try{coords={lat:p.coords.latitude,lng:p.coords.longitude};await safe(sb.from('rider_presence').upsert({rider_id:user.id,is_online:true,lat:coords.lat,lng:coords.lng,updated_at:new Date().toISOString()}));online=true;lastGPS=Date.now();geoWatch=navigator.geolocation.watchPosition(pos=>{coords={lat:pos.coords.latitude,lng:pos.coords.longitude};syncPosition()},()=>{},{enableHighAccuracy:true,maximumAge:30000});app()}catch(e){msg(e)}},e=>msg(e.message),{enableHighAccuracy:true,timeout:12000})
}
async function syncPosition(){if(!online||!user||!coords||Date.now()-lastGPS<45000)return;lastGPS=Date.now();await sb.from('rider_presence').update({lat:coords.lat,lng:coords.lng,updated_at:new Date().toISOString()}).eq('rider_id',user.id)}
setInterval(syncPosition,60000);
async function load(){
const out=$('screen');if(!out)return;out.className='card';out.textContent='Loading...';
try{
if(page==='Overview'){
if(role==='rider'){const r=await safe(sb.from('rider_presence').select('*').eq('rider_id',user.id).maybeSingle());online=!!r.data?.is_online&&Date.now()-new Date(r.data.updated_at).getTime()<600000;if(r.data?.lat!=null)coords={lat:r.data.lat,lng:r.data.lng};const jobs=await safe(sb.from('errands').select('status').eq('rider_id',user.id));out.className='';out.innerHTML='<div class="hero"><div><div class="eyebrow">Rider workspace</div><h2>Go further. Earn more.</h2><p>Available errands, current jobs and earnings in one place.</p></div><div class="illustration">🛵</div></div><div class="grid"><div class="card span4"><div class="eyebrow">Availability</div><h2 style="margin:15px 0">'+(online?'🟢 Online':'⚪ Offline')+'</h2>'+btn(online?'Go offline':'Go online & share GPS','onlineBtn')+'</div><div class="card span4"><div class="eyebrow">Active jobs</div><h2 style="margin:15px 0">'+jobs.data.filter(x=>['accepted','picked_up'].includes(x.status)).length+' / 3</h2></div><div class="card span4"><div class="eyebrow">Completed</div><h2 style="margin:15px 0">'+jobs.data.filter(x=>x.status==='completed').length+'</h2></div></div>';$('onlineBtn').onclick=()=>setOnline().catch(msg);return}
const q=await safe(sb.from('errands').select('id,status,payment_status').order('created_at',{ascending:false}).limit(200));out.className='';out.innerHTML='<div class="hero"><div><div class="eyebrow">ErrandGo</div><h2>'+(portal==='admin'?'Operations at a glance.':'Your city, handled.')+'</h2><p>'+(portal==='admin'?'Track applications, bookings, chats and payments.':'Shopping, pickups and deliveries made simpler.')+'</p></div><div class="illustration">'+(portal==='admin'?'📊':'🛍️')+'</div></div><div class="grid"><div class="card span4"><div class="eyebrow">Visible errands</div><h2 style="margin-top:15px">'+q.data.length+'</h2></div><div class="card span4"><div class="eyebrow">Open bookings</div><h2 style="margin-top:15px">'+q.data.filter(x=>x.status==='open').length+'</h2></div><div class="card span4"><div class="eyebrow">Completed</div><h2 style="margin-top:15px">'+q.data.filter(x=>x.status==='completed').length+'</h2></div></div>';return
}
if(page==='Book errand'){
out.innerHTML='<div class="eyebrow">Booking</div><h2>What needs to be done?</h2><p class="muted">Payment will be collected in-app before dispatch. M-PESA is not connected yet, so bookings will remain unpaid and cannot be accepted by riders.</p><form id="booking"><div class="field"><label>Category</label><select name="category"><option>Shopping</option><option>Delivery</option><option>Documents</option><option>Other</option></select></div><div class="field"><label>Describe the errand</label><textarea name="description" required maxlength="1000"></textarea></div>'+input('Pickup location','pickup')+'<button class="btn white small" type="button" id="pickupGps">📍 Add GPS pickup location</button><span id="gpsState" class="smallnote"></span>'+input('Destination','destination')+'<p class="smallnote">Shopping cost is paid directly to the shop. Never send shopping money to a rider.</p><button class="btn dark">Save booking (awaiting service fee)</button></form>';
let gps=null;$('pickupGps').onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{gps={lat:p.coords.latitude,lng:p.coords.longitude};$('gpsState').textContent=' GPS saved'},e=>msg(e.message)):msg('GPS is unavailable');
$('booking').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button[type=submit]');b.disabled=true;try{const o={customer_id:user.id,category:f.elements.namedItem('category').value,description:f.elements.namedItem('description').value,pickup:f.elements.namedItem('pickup').value,destination:f.elements.namedItem('destination').value,payment_status:'unpaid'};if(gps){o.pickup_lat=gps.lat;o.pickup_lng=gps.lng}await safe(sb.from('errands').insert(o));msg('Booking saved pending payment. Riders cannot accept it until payments are enabled.');page='My errands';app()}catch(x){msg(x)}finally{b.disabled=false}};return
}
if(['My errands','Available jobs','Suggested jobs','My active jobs','All errands'].includes(page)){
let q=sb.from('errands').select('*').order('created_at',{ascending:false}).limit(100);
if(page==='My errands')q=q.eq('customer_id',user.id);
if(['Available jobs','Suggested jobs'].includes(page))q=q.eq('status','open').eq('payment_status','paid');
if(page==='My active jobs')q=q.eq('rider_id',user.id).in('status',['accepted','picked_up']);
const r=await safe(q);let jobs=r.data;
if(page==='Suggested jobs')jobs=jobs.filter(j=>dist(coords?.lat,coords?.lng,j.pickup_lat,j.pickup_lng)!=null&&dist(coords.lat,coords.lng,j.pickup_lat,j.pickup_lng)<=8);
out.innerHTML='<div class="row"><h2>'+esc(page)+'</h2>'+btn('↻ Refresh','reload','white small')+'</div>'+(jobs.length?jobs.map(j=>job(j,['Available jobs','Suggested jobs'].includes(page)?'<button class="btn small" data-accept="'+j.id+'">Accept →</button>':page==='My active jobs'?'<div class="row"><button class="btn white small" data-chat="'+j.id+'">Chat</button>'+(j.status==='accepted'?'<button class="btn small" data-next="picked_up" data-id="'+j.id+'">Picked up</button>':'<button class="btn small" data-next="completed" data-id="'+j.id+'">Complete</button>')+'</div>':page==='My errands'&&j.rider_id?'<button class="btn white small" data-chat="'+j.id+'">Open chat</button>':'' )).join(''):empty('No errands found'))+(page==='Available jobs'?'<p class="smallnote">Jobs only appear after a verified payment. Live M-PESA is not configured.</p>':'');
$('reload').onclick=load;
out.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>openChat(b.dataset.chat));
out.querySelectorAll('[data-accept]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await safe(sb.rpc('accept_errand',{p_id:b.dataset.accept}));msg(r.data?'Errand accepted':'Already accepted');load()}catch(e){msg(e);load()}});
out.querySelectorAll('[data-next]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await safe(sb.rpc('progress_errand',{p_id:b.dataset.id,p_next:b.dataset.next}));load()}catch(e){msg(e);load()}});return
}
if(page==='Application'){
const r=await safe(sb.from('rider_applications').select('id,status,created_at,document_check').eq('applicant_id',user.id).order('created_at',{ascending:false}));
out.innerHTML=r.data.length?'<h2>Application received</h2><p>Status: <b>'+esc(r.data[0].status)+'</b></p><p class="muted">We aim to review applications within 48 hours. Approval may happen earlier.</p><p class="smallnote">Document checks: '+esc(r.data[0].document_check)+'</p>':'<h2>Become an ErrandGo Rider</h2><p class="muted">No application found.</p><a class="btn dark" href="./rider.html?apply=1">Apply now</a>';return
}
if(page==='Rider applications'||page==='All riders'){
const q=sb.from('rider_applications').select('*').order('created_at',{ascending:false}).limit(150);if(page==='All riders')q.eq('status','approved');
const r=await safe(q);out.innerHTML='<div class="row"><h2>'+esc(page)+'</h2>'+btn('↻ Refresh','reload','white small')+'</div>'+(r.data.length?r.data.map(a=>'<div class="job"><div class="row"><b>'+esc(a.full_name)+'</b><span class="status '+esc(a.status)+'">'+esc(a.status)+'</span></div><div class="smallnote">ID '+esc(a.national_id)+' · Licence '+esc(a.licence_number||'Not supplied')+' · '+esc(a.phone)+'</div><p class="smallnote">Document comparison: '+esc(a.document_check)+' · Submitted '+date(a.created_at)+'</p><div class="row" style="flex-wrap:wrap;gap:8px">'+['id_front_path','id_back_path','licence_path','insurance_path'].map((k,i)=>a[k]?'<button class="btn white small" data-file="'+esc(a[k])+'">'+['ID front','ID back','Licence','Insurance'][i]+'</button>':'').join('')+(a.status==='pending'?'<button class="btn small" data-review="'+a.id+'" data-decision="approved">Approve</button><button class="btn white small" data-review="'+a.id+'" data-decision="rejected">Reject</button>':'')+'</div></div>').join(''):empty('No rider applications'));
$('reload').onclick=load;
out.querySelectorAll('[data-file]').forEach(b=>b.onclick=async()=>{try{const r=await safe(sb.storage.from('rider-documents').createSignedUrl(b.dataset.file,90));window.open(r.data.signedUrl,'_blank','noopener,noreferrer')}catch(e){msg(e)}});
out.querySelectorAll('[data-review]').forEach(b=>b.onclick=async()=>{if(!confirm('Confirm '+b.dataset.decision+'? Review ID and licence manually first.'))return;b.disabled=true;try{const r=await sb.auth.getSession();const resp=await fetch(cfg.url+'/functions/v1/review-rider',{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey,Authorization:'Bearer '+r.data.session.access_token},body:JSON.stringify({id:b.dataset.review,decision:b.dataset.decision})});const data=await resp.json();if(!resp.ok)throw Error(data.error||'Review unsuccessful');msg('Rider '+b.dataset.decision);load()}catch(e){msg(e);b.disabled=false}});return
}
if(['Chats','Previous chats','Chats & receipts'].includes(page)){
const r=await safe(sb.from('errands').select('id,customer_id,rider_id,category,description,status,created_at').not('rider_id','is',null).order('created_at',{ascending:false}).limit(150));
const archived=x=>['completed','cancelled'].includes(x.status);
const jobs=r.data.filter(x=>page==='Previous chats'?archived(x):page==='Chats'?!archived(x):true);
out.innerHTML='<div class="row"><h2>'+esc(page)+'</h2>'+btn('↻ Refresh','reload','white small')+'</div>'+(jobs.length?jobs.map(j=>job(j,'<button class="btn small" data-chat="'+j.id+'">Open conversation</button>')).join(''):empty('No conversations yet'));$('reload').onclick=load;out.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>openChat(b.dataset.chat));return
}
if(page==='Payments & payouts'){
const [p,w,a]=await Promise.all([safe(sb.from('errand_payment_records').select('*').order('created_at',{ascending:false}).limit(100)),safe(sb.from('rider_withdrawal_requests').select('*').order('created_at',{ascending:false}).limit(100)),safe(sb.from('rider_earnings').select('*').order('created_at',{ascending:false}).limit(100))]);
out.innerHTML='<div class="eyebrow">Payments · Read-only until provider integration</div><h2>Collections & Rider Payouts</h2><p class="muted">M-PESA collection, settlement and disbursement are not activated. No fake payment confirmations or payouts.</p><div class="grid"><div class="card span4"><div class="eyebrow">Recorded payments</div><h2>'+p.data.length+'</h2></div><div class="card span4"><div class="eyebrow">Rider earnings entries</div><h2>'+a.data.length+'</h2></div><div class="card span4"><div class="eyebrow">Withdrawal requests</div><h2>'+w.data.length+'</h2></div></div><h3>Withdrawal history</h3>'+(w.data.length?w.data.map(x=>'<div class="job">'+money(x.amount_kes)+' · '+esc(x.status)+' · '+esc(x.destination_msisdn)+'</div>').join(''):empty('No withdrawal requests'));return
}
if(page==='Earnings'){
const r=await safe(sb.from('rider_earnings').select('*').eq('rider_id',user.id));const sum=r.data.filter(x=>x.status==='available').reduce((a,b)=>a+Number(b.net_kes),0);
out.innerHTML='<div class="eyebrow">Rider earnings</div><h2>'+money(sum)+' available</h2><p class="muted">Earnings only arise from confirmed, completed paid errands. Withdrawals will be enabled once the licensed payment provider is connected.</p><button class="btn dark" disabled>Withdraw via M-PESA (not yet enabled)</button><h3 style="margin-top:25px">Earnings history</h3>'+(r.data.length?r.data.map(x=>'<div class="job"><b>'+money(x.net_kes)+'</b> · '+esc(x.status)+'<p class="smallnote">Commission '+money(x.commission_kes)+'</p></div>').join(''):empty('No rider earnings recorded yet'));return
}
if(page==='Account'){
out.innerHTML='<h2>My account</h2><p class="muted">'+esc(user.email)+' · '+esc(role)+'</p><form id="editProfile">'+input('Full name','full_name')+input('Phone number','phone','tel')+input('WhatsApp number','whatsapp','tel',false)+'<button class="btn dark">Save changes</button></form>';
for(const k of ['full_name','phone','whatsapp'])$('editProfile').elements.namedItem(k).value=profile?.[k]||'';
$('editProfile').onsubmit=async e=>{e.preventDefault();const f=e.target,n=phone(f.elements.namedItem('phone').value),w=phone(f.elements.namedItem('whatsapp').value)||n;if(!n)return msg('Use a valid phone number');try{const r=await safe(sb.from('profiles').update({full_name:f.elements.namedItem('full_name').value,phone:n,whatsapp:w}).eq('id',user.id).select().single());profile=r.data;msg('Account saved')}catch(e){msg(e)}};return
}
out.innerHTML=empty('This section is being prepared')
}catch(e){out.className='notice';out.textContent=e.message||String(e)}
}
async function openChat(id){
chatId=id;
const out=$('screen');if(!out)return;
try{
const j=await safe(sb.from('errands').select('*').eq('id',id).single());
if(!j.data.rider_id)throw Error('Chat opens after a rider accepts this errand.');
const c=await safe(sb.rpc('errand_contact',{p_errand:id}));
const contact=c.data?.[0]||{};
const isCustomer=j.data.customer_id===user.id,otherName=isCustomer?contact.rider_name:contact.customer_name,otherPhone=isCustomer?contact.rider_phone:contact.customer_phone,archived=['completed','cancelled'].includes(j.data.status);
const showSafety=j.data.category==='Shopping'&&portal!=='admin'&&!sessionStorage.getItem('errandgo-shopping-safety-'+id);
const r=await safe(sb.from('errand_messages').select('*').eq('errand_id',id).order('created_at',{ascending:true}).limit(300));
out.className='card';
out.innerHTML='<div class="row" style="flex-wrap:wrap"><div><div class="eyebrow">Errand conversation</div><h2>'+esc(j.data.category)+'</h2><p class="smallnote">'+esc(otherName||'Assigned contact')+' · '+esc(j.data.status)+'</p></div><div class="row" style="gap:8px"><button class="btn white small" id="backChat">← Back</button>'+(otherPhone?'<a class="btn white small" href="tel:'+esc(otherPhone)+'">📞 Call '+esc(otherPhone)+'</a>':'')+'</div></div><div class="notice" style="margin-top:15px"><b>Shopping safety:</b> Pay the merchant directly, never the rider. Keep merchant payment details, payment confirmation and receipt in this conversation. Outside payments may not qualify for ErrandGo dispute assistance, subject to applicable law.</div><div id="chatMessages" style="margin-top:20px;max-height:470px;overflow:auto">'+(r.data.length?r.data.map(m=>'<div class="job" style="margin-bottom:12px"><div class="smallnote">'+(m.sender_id===user.id?'You':'Participant')+' · '+date(m.created_at)+' · '+esc(m.message_type)+'</div><p>'+esc(m.body||'Attachment')+'</p>'+(m.attachment_path?'<button class="btn white small" data-media="'+esc(m.attachment_path)+'">View attachment</button>':'')+'</div>').join(''):empty('No messages yet'))+'</div>'+(archived?'<p class="smallnote">Conversation archived. Messages and receipts remain available for reference.</p>':portal==='admin'?'<p class="smallnote">Admin review is read-only.</p>':'<form id="sendChat"><div class="field"><label>Message</label><textarea name="body" maxlength="3000" placeholder="Type a message..." required></textarea></div><div class="field"><label>Message type</label><select name="type"><option value="text">General message</option><option value="payment_details">Merchant payment details</option><option value="payment_confirmation">Shopping payment confirmation</option></select></div><button class="btn dark">Send message</button></form><form id="sendPhoto"><div class="field"><label>Photo or receipt (5 MB max)</label><input type="file" name="file" accept=".png,.jpg,.jpeg,.pdf" required></div><button class="btn white">Upload photo / receipt</button></form>');
$('backChat').onclick=app;
if(showSafety){
 const shade=document.createElement('div');shade.id='safetyDialog';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(13,25,36,.82);padding:20px';
 shade.innerHTML='<div style="background:white;padding:28px;border-radius:22px;max-width:480px;width:100%;box-shadow:0 14px 70px #0003"><div class="eyebrow">Shopping safety notice</div><h2 style="margin:12px 0">Pay the shop. Never the rider.</h2><p>Pay shopping costs directly to the merchant using the shop’s payment details. Ask the rider to share the bill and payment instructions here, and keep your payment confirmation and receipt inside this conversation.</p><p class="smallnote">Payments outside the approved process may limit ErrandGo dispute assistance, subject to applicable consumer rights.</p><button id="safetyAccept" class="btn dark full">I understand</button></div>';
 document.body.appendChild(shade);$('safetyAccept').onclick=()=>{sessionStorage.setItem('errandgo-shopping-safety-'+id,'acknowledged');shade.remove()};
 }
out.querySelectorAll('[data-media]').forEach(b=>b.onclick=async()=>{try{const r=await safe(sb.storage.from('errand-chat').createSignedUrl(b.dataset.media,120));window.open(r.data.signedUrl,'_blank','noopener,noreferrer')}catch(e){msg(e)}});
if($('sendChat'))$('sendChat').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{await safe(sb.from('errand_messages').insert({errand_id:id,sender_id:user.id,body:f.elements.namedItem('body').value.trim(),message_type:f.elements.namedItem('type').value}));openChat(id)}catch(e){msg(e);b.disabled=false}};
if($('sendPhoto'))$('sendPhoto').onsubmit=async e=>{e.preventDefault();const f=e.target,file=f.elements.namedItem('file').files[0];if(!file||file.size>5242880||!['image/jpeg','image/png','application/pdf'].includes(file.type))return msg('Choose a PDF, JPG or PNG under 5 MB');const b=f.querySelector('button');b.disabled=true;const extension=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg',path=id+'/'+crypto.randomUUID()+'.'+extension;
try{await safe(sb.storage.from('errand-chat').upload(path,file,{contentType:file.type}));try{await safe(sb.from('errand_messages').insert({errand_id:id,sender_id:user.id,body:file.type==='application/pdf'?'Receipt / document':'Photo attachment',attachment_path:path,message_type:file.type==='application/pdf'?'receipt':'image'}))}catch(e){await sb.storage.from('errand-chat').remove([path]);throw e}openChat(id)}catch(e){msg(e);b.disabled=false}};
}catch(e){out.className='notice';out.textContent=e.message||String(e)}
}
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'){user=null;auth()}});
sb.channel('errandgo-realtime-v2').on('postgres_changes',{event:'*',schema:'public',table:'errands'},()=>{if(user&&chatId===null)load()}).on('postgres_changes',{event:'INSERT',schema:'public',table:'errand_messages'},payload=>{if(user&&chatId===payload.new.errand_id)openChat(chatId)}).subscribe();
restore();
