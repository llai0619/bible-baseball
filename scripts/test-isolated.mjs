import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
const dir=mkdtempSync(path.join(tmpdir(),'baseball-browser-'));
const db=new DatabaseSync(path.join(dir,'baseball.sqlite'));
db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0)');
const salt=randomBytes(16).toString('hex'),password='browser test password 123',email='browser@example.com';db.prepare('INSERT INTO users VALUES(?,?,?,1)').run('browser-user',email,salt+':'+scryptSync(password,salt,64).toString('hex'));db.close();
const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
const env={...process.env,DATA_DIR:dir,PORT:String(port),ORIGIN_SECRET:'',NODE_ENV:'test',SMTP_HOST:'',SMTP_FROM:'',TEST_URL:`http://127.0.0.1:${port}`,TEST_EMAIL:email,TEST_PASSWORD:password};delete env.NODE_TEST_CONTEXT;
const child=spawn(process.execPath,['dist/server.mjs'],{env,stdio:['ignore','pipe','pipe']});
async function run(args){const p=spawn(process.execPath,args,{env,stdio:'inherit'});const [code]=await once(p,'exit');if(code!==0)throw Error('Validation failed: '+args.join(' '));}
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),10000);child.once('exit',()=>{clearTimeout(timer);reject(Error('Server exited'));});child.stdout.on('data',d=>{if(String(d).includes('listening')){clearTimeout(timer);resolve();}});});
 await run(['node_modules/@playwright/test/cli.js','test','tests/browser.spec.ts','tests/delete-bank.spec.ts','tests/auth.spec.ts','--workers=1','--reporter=line']);
 await run(['scripts/smoke.mjs']);
}finally{child.kill();if(child.exitCode===null)await once(child,'exit');rmSync(dir,{recursive:true,force:true});}
