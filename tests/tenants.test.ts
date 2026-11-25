import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createGame} from '../server/game.js';
import {createAuth,hashPassword} from '../server/auth.js';
test('real server isolates tenants, protects HTTP/WebSocket answers, claims old data and revokes sockets',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'baseball-tenants-'));const db=new DatabaseSync(path.join(dir,'baseball.sqlite'));db.exec('CREATE TABLE sessions(id TEXT PRIMARY KEY,expires INTEGER);CREATE TABLE records(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))');createAuth(db,dir);
 for(const id of ['a','b'])db.prepare('INSERT INTO users VALUES(?,?,?,1)').run(id,id+'@example.com',hashPassword('test password 123'));
 db.prepare('INSERT INTO records VALUES(?,?,?)').run('bank','legacy-bank',JSON.stringify({id:'legacy-bank',name:'Legacy bank',demo:false}));db.prepare('INSERT INTO records VALUES(?,?,?)').run('job','legacy-job',JSON.stringify({id:'legacy-job',bankId:'legacy-bank',status:'complete'}));db.prepare('INSERT INTO records VALUES(?,?,?)').run('game','legacy-game',JSON.stringify({...createGame('legacy-bank',['Legacy A','Legacy B']),id:'legacy-game'}));db.close();
 const portServer=createServer();portServer.listen(0,'127.0.0.1');await once(portServer,'listening');const port=(portServer.address() as any).port;await new Promise<void>(r=>portServer.close(()=>r()));
 const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,ADMIN_PASSWORD:'legacy password',ORIGIN_SECRET:'',SMTP_HOST:'',SMTP_FROM:'',NODE_ENV:'test'},stdio:'pipe'});let logs='';child.stderr.on('data',d=>logs+=d);const base=`http://127.0.0.1:${port}`;
 try{
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timeout '+logs)),15000);child.once('exit',()=>{clearTimeout(timer);reject(Error('server exited '+logs));});child.stdout.on('data',d=>{if(String(d).includes('Bible Baseball listening')){clearTimeout(timer);resolve();}});});
 const call=async(route:string,body?:any,cookie='')=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};};
 const a=(await call('/api/login',{email:'a@example.com',password:'test password 123'})).cookie,b=(await call('/api/login',{email:'b@example.com',password:'test password 123'})).cookie;
 assert.equal((await call('/api/login',{password:'legacy password'})).status,400);
 assert.equal((await call('/api/register',{email:'new@example.com',password:'test password 123'})).body.error,'email_unavailable');
 const bank=(await call('/api/demo',{},a)).body,bankB=(await call('/api/demo',{},b)).body;assert.notEqual(bank.id,bankB.id);
 let g=(await call('/api/games',{bankId:bank.id,teams:['A','B'],innings:1,timers:[15,15,30,45]},a)).body;
 g=(await call(`/api/games/${g.id}/action`,{action:'select',version:g.version,type:1},a)).body;assert.ok(g.question.answer);
 for(const route of [`/api/banks/${bank.id}/delete`,`/api/BANKS/${bank.id}/delete`,`/api/banks/${bank.id}/questions`,`/api/banks/${bank.id}/approve-all`,`/api/banks/${bank.id}/generate`,`/api/banks/${bank.id}/scripture`,`/api/banks/${bank.id}/cross`,`/api/questions/${g.question.id}`,`/api/questions/${g.question.id}/regenerate`,`/api/games/${g.id}/action`])assert.equal((await call(route,{},b)).status,404,route);
 for(const route of ['/api/games','/api/GAMES','/api/games/'])assert.equal((await call(route,{bankId:bank.id},b)).status,404);assert.equal((await call(`/api/banks/${bank.id}/export`,undefined,b)).status,404);assert.equal((await call(`/api/games/${g.id}?host=1`,undefined,b)).status,404);
 const dashboard=(await call('/api/dashboard',undefined,b)).body;assert.ok(dashboard.banks.every((x:any)=>x.id!==bank.id));assert.equal(dashboard.games.length,0);assert.equal(dashboard.jobs.length,0);
 const publicGame=(await call(`/api/games/${g.id}`,undefined,a)).body;assert.equal(publicGame.question,null);assert.equal(publicGame.ownerId,undefined);
 const publicWs=new WebSocket(`ws://127.0.0.1:${port}/ws/${g.id}`,{headers:{Origin:base,Cookie:a}});const [publicMessage]=await once(publicWs,'message');assert.equal(JSON.parse(String(publicMessage)).question,null);publicWs.close();
 const rejected=new WebSocket(`ws://127.0.0.1:${port}/ws/${g.id}?host=1`,{headers:{Origin:base,Cookie:b}});await once(rejected,'error');
 const host=new WebSocket(`ws://127.0.0.1:${port}/ws/${g.id}?host=1`,{headers:{Origin:base,Cookie:a}});const [message]=await once(host,'message');assert.ok(JSON.parse(String(message)).question.answer);
 const claims=await Promise.all([call('/api/claim-legacy',{legacyPassword:'legacy password'},a),call('/api/claim-legacy',{legacyPassword:'legacy password'},b)]);assert.deepEqual(claims.map(x=>x.status).sort(),[200,409]);const winner=claims[0].status===200?a:b;const claimed=(await call('/api/dashboard',undefined,winner)).body;assert.ok(claimed.banks.some((x:any)=>x.id==='legacy-bank'));assert.ok(claimed.jobs.some((x:any)=>x.id==='legacy-job'));assert.ok(claimed.games.some((x:any)=>x.id==='legacy-game'));
 const closed=once(host,'close');assert.equal((await call('/api/change-password',{currentPassword:'test password 123',password:'changed password 123'},a)).status,200);assert.equal((await closed)[0],4001);assert.equal((await call('/api/dashboard',undefined,a)).status,401);
 const logout=await call('/api/logout',{},b);assert.equal(logout.status,200);assert.equal((await call('/api/dashboard',undefined,b)).status,401);
 }finally{child.kill();if(child.exitCode===null)await once(child,'exit');rmSync(dir,{recursive:true,force:true});}
});
