import OpenAI from 'openai';
export const OLLAMA_TIMEOUT_MS=180000;
type Status={provider:string,model:string,fallbackReason?:string};
export async function generateWithFallback(payload:any,onStatus:(status:Status)=>void=()=>{},dependencies:{fetch?:typeof fetch,timeoutMs?:number,openai?:()=>Promise<{output_text:string}>}={}){
 const model=process.env.OLLAMA_MODEL||'gemma4:31b';
 onStatus({provider:'ollama',model,fallbackReason:undefined});
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),dependencies.timeoutMs??OLLAMA_TIMEOUT_MS);
 try{
  const response=await (dependencies.fetch||fetch)(`${(process.env.OLLAMA_BASE_URL||'http://ollama:11434').replace(/\/$/,'')}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:payload.input,format:payload.text.format.schema,stream:false,think:false,options:{temperature:0.3,num_ctx:32768}}),signal:controller.signal});
  if(!response.ok)throw Error(`ollama_http_${response.status}`);
  const data:any=await response.json();
  if(data.done!==true||data.error||typeof data.message?.content!=='string')throw Error('ollama_incomplete');
  const parsed=JSON.parse(data.message.content);
  if(!Array.isArray(parsed.questions)||!parsed.questions.length)throw Error('ollama_invalid_output');
  return {output_text:data.message.content};
 }catch(error:any){
  clearTimeout(timer);
  const fallbackReason=controller.signal.aborted?'ollama_timeout':/^ollama_/.test(error.message)?error.message:'ollama_unavailable';
  onStatus({provider:'openai',model:payload.model,fallbackReason});
  if(dependencies.openai)return await dependencies.openai();
  if(!process.env.OPENAI_API_KEY)throw Error('fallback_not_configured');
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:120000,maxRetries:0});
  return await client.responses.create(payload);
 }finally{clearTimeout(timer);}
}
