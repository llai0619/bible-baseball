import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
const env=parseEnv(readFileSync('.env','utf8')),base='https://bible-baseball.llai.workers.dev';
const browser=await chromium.launch();const context=await browser.newContext({extraHTTPHeaders:{Origin:base}});const page=await context.newPage();let ids=[];
async function call(url,data){const r=await context.request.fetch(base+url,{method:data?'POST':'GET',data});assert.equal(r.ok(),true,`${url}: ${r.status()}`);return r.json();}
try{
 await page.goto(base+'/admin');await page.getByLabel('管理者密碼').fill(env.ADMIN_PASSWORD);await page.getByRole('button',{name:'登入',exact:true}).click();await page.getByRole('button',{name:'登出',exact:true}).waitFor();
 const b=await call('/api/banks',{name:'部署驗證 '+Date.now(),reference:'John 3:16'});ids.push(b.id);await page.reload();await page.getByLabel('經文與題庫',{exact:true}).selectOption(b.id);
 await page.getByRole('button',{name:'手動增加題目',exact:true}).click();await page.getByLabel('題型',{exact:true}).selectOption('3');
 const modal=page.locator('.modal');for(const col of await modal.locator('.bilingual > div').all()){for(const area of await col.locator('textarea').all())await area.fill('Deployment verification 測試文字');}
 await modal.getByLabel('交叉經文（每行一筆）',{exact:true}).fill('John 3:17');await modal.getByLabel('來源網址（每行一筆）',{exact:true}).fill('https://www.biblegateway.com/passage/?search=John+3%3A16&version=CUV');await modal.getByRole('button',{name:'儲存',exact:true}).click();await modal.waitFor({state:'hidden'});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'匯出題庫',exact:true}).click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.json'));
 const file=await call(`/api/banks/${b.id}/export`);assert.equal(file.questions.length,1);assert.equal(file.questions[0].type,3);const copy=await call('/api/bank-import',file);ids.push(copy.id);const round=await call(`/api/banks/${copy.id}/export`);assert.deepEqual(round,file);
 await page.screenshot({path:'production-transfer-preview.png',fullPage:true});console.log('PASS: public login, manual question save, JSON download, import/export round trip.');console.log('Health:',JSON.stringify(await call('/api/health')));
}finally{for(const id of ids)await call(`/api/banks/${id}/delete`,{});await browser.close();}
