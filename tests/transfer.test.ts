import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';

test('bank transfer and manual questions preserve content, isolate ownership and reject invalid imports atomically',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'baseball-transfer-'));
 const port=20000+Math.floor(Math.random()*20000),base=`http://127.0.0.1:${port}`;
 const childEnv:NodeJS.ProcessEnv={...process.env,DATA_DIR:dir,PORT:String(port),ORIGIN_SECRET:'',ADMIN_PASSWORD:'test-only-password'};delete childEnv.NODE_TEST_CONTEXT;
 const child=spawn(process.execPath,['dist/server.mjs'],{env:childEnv,stdio:'pipe'});
 try{
  await new Promise<void>((resolve,reject)=>{child.stdout.on('data',d=>{if(String(d).includes('listening'))resolve();});child.once('error',reject);child.once('exit',c=>reject(Error('Server exited '+c)));});
  const db=new DatabaseSync(path.join(dir,'baseball.sqlite'));
  db.prepare('INSERT INTO users VALUES(?,?,?,1)').run('tester','test@example.com','unused');
  db.prepare('INSERT INTO account_sessions VALUES(?,?,?)').run('test-session','tester',Date.now()+60000);db.close();
  const request=async(url:string,body?:any,authenticated=true)=>{const r=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(authenticated?{Cookie:'session=test-session'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  const bank=(await request('/api/banks',{name:'Transfer test',reference:'John 3:16'})).data;
  const text={zh:'測試內容',en:'Test content'};
  const q={type:1,prompt:text,answer:text,explanation:text,rubric:text,scripture:text,reference:'John 3:16',crossReferences:[],sourceUrls:['https://www.biblegateway.com/'],options:[text,text,text,text],status:'draft'};
  const created=await request(`/api/banks/${bank.id}/questions`,q);assert.equal(created.status,200);
  assert.equal((await request(`/api/banks/${bank.id}/questions`,{...q,options:[]})).status,400);
  const file=(await request(`/api/banks/${bank.id}/export`)).data;assert.equal(file.questions.length,1);assert.equal(file.bank.ownerId,undefined);
  const imported=await request('/api/bank-import',file);assert.equal(imported.status,200);assert.notEqual(imported.data.id,bank.id);
  const copy=(await request(`/api/banks/${imported.data.id}/export`)).data;assert.deepEqual(copy,file);
  const before=(await request('/api/dashboard')).data;
  assert.equal((await request('/api/bank-import',{...file,questions:[q,{...q,type:3}]})).status,400);
  const after=(await request('/api/dashboard')).data;assert.equal(after.banks.length,before.banks.length);assert.equal(after.questions.length,before.questions.length);
  assert.equal((await request(`/api/banks/${bank.id}/export`,undefined,false)).status,401);
  const {chromium}=await import('playwright');const browser=await chromium.launch();try{const context=await browser.newContext();await context.addCookies([{name:'session',value:'test-session',url:base}]);const page=await context.newPage();await page.goto(base+'/admin');await page.getByRole('button',{name:'手動增加題目',exact:true}).click();await page.getByLabel('題型',{exact:true}).selectOption('3');assert.equal(await page.getByRole('heading',{name:'手動增加題目 · 三壘安打'}).count(),1);await page.screenshot({path:'transfer-preview.png',fullPage:true});}finally{await browser.close();}
 }finally{if(child.exitCode===null){child.kill('SIGKILL');await new Promise(r=>child.once('exit',r));}rmSync(dir,{recursive:true,force:true});}
});
