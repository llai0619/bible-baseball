export default {
 async fetch(request, env) {
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return Response.json({error:'invalid_origin'},{status:403});
  if(Number(request.headers.get('Content-Length'))>2*1024*1024)return new Response('Payload too large',{status:413});
  const headers=new Headers(request.headers);
  headers.set('X-Origin-Secret',env.ORIGIN_SECRET);
  headers.set('X-Forwarded-Host',url.host);
  headers.set('X-Forwarded-Proto','https');
  headers.set('X-Client-IP',request.headers.get('CF-Connecting-IP')||'unknown');
  headers.delete('Forwarded');
  try {
   const upstream=await env.BASEBALL_ORIGIN.fetch(new Request(`http://bible-baseball.internal${url.pathname}${url.search}`,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'}));
   if(upstream.status===101)return upstream;
   const response=new Response(upstream.body,upstream);
   response.headers.set('Cache-Control','no-store');
   response.headers.set('Strict-Transport-Security','max-age=31536000');
   return response;
  } catch {return Response.json({error:'origin_unavailable'},{status:503});}
 }
};
