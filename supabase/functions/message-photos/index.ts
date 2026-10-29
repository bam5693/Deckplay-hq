import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import jpeg from 'npm:jpeg-js@0.4.4';
import {createPhotoHandler} from './handler.mjs';
const projectUrl=Deno.env.get('SUPABASE_URL')||'';
Deno.serve(createPhotoHandler({projectUrl,jpeg,authenticate:async(authorization:string)=>{
 if(!/^Bearer [^ ]+$/.test(authorization))return null;
 const client=createClient(projectUrl,Deno.env.get('SUPABASE_ANON_KEY')||'',{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(authorization.slice(7));if(error||!data.user)return null;
 const admin=createClient(projectUrl,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
 return {user:data.user,client,admin};
}}));
