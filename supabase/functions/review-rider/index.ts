import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
const origin='https://finsightmanagement.github.io';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
Deno.serve(async req=>{
 const headers={...cors,'Vary':'Origin'};
 if(req.headers.get('origin')!==origin)return new Response(JSON.stringify({error:'Origin not permitted'}),{status:403,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'POST required'}),{status:405,headers});
 try{
  const jwt=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')||'';
  const url=Deno.env.get('SUPABASE_URL')!;
  const key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=createClient(url,key,{global:{headers:{Authorization:'Bearer '+jwt}}});
  const {data:{user},error:authError}=await auth.auth.getUser(jwt);
  if(authError||!user||user.app_metadata?.role!=='super_admin')return new Response(JSON.stringify({error:'Super Admin required'}),{status:403,headers});
  const body=await req.json();
  if(!body||typeof body.id!=='string'||!['approved','rejected'].includes(body.decision))return new Response(JSON.stringify({error:'Invalid application or decision'}),{status:400,headers});
  const admin=createClient(url,secret);
  const {data:app,error:readError}=await admin.from('rider_applications').select('id,applicant_id,status').eq('id',body.id).single();
  if(readError||!app||app.status!=='pending')return new Response(JSON.stringify({error:'Application is not pending'}),{status:409,headers});
  const {data:updated,error:updateError}=await admin.from('rider_applications').update({status:body.decision,reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq('id',body.id).eq('status','pending').select('id').maybeSingle();
  if(updateError||!updated)return new Response(JSON.stringify({error:'Application was already reviewed'}),{status:409,headers});
  if(body.decision==='approved'){
   const {data:account,error:lookupError}=await admin.auth.admin.getUserById(app.applicant_id);
   if(lookupError||!account.user){await admin.from('rider_applications').update({status:'pending',reviewed_at:null,reviewed_by:null}).eq('id',app.id).eq('status','approved');return new Response(JSON.stringify({error:'Rider account not found; application reset'}),{status:500,headers})}
   const {error:roleError}=await admin.auth.admin.updateUserById(app.applicant_id,{app_metadata:{...account.user.app_metadata,role:'rider'}});
   if(roleError){await admin.from('rider_applications').update({status:'pending',reviewed_at:null,reviewed_by:null}).eq('id',app.id).eq('status','approved');throw roleError}
  }
  return new Response(JSON.stringify({ok:true}),{headers});
 }catch(e){console.error(e);return new Response(JSON.stringify({error:'Review failed; check backend logs'}),{status:500,headers})}
});