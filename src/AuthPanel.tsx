import React,{useState} from 'react';
type Props={lang:'zh'|'en',mode?:'account',claimAvailable?:boolean,onSession:()=>Promise<void>,onClaim?:()=>Promise<void>};
const messages:Record<string,[string,string]>={invalid_email:['請輸入有效的 Email。','Enter a valid email.'],invalid_password_length:['密碼須為 12–128 個字元。','Use 12–128 characters.'],invalid_credentials:['Email 或密碼不正確。','Incorrect email or password.'],email_unverified:['請先驗證 Email。','Verify your email first.'],email_registered:['此 Email 已註冊，請登入或使用忘記密碼。','Email already registered. Sign in or reset your password.'],invalid_code:['驗證碼錯誤、已過期或已失效。','Code incorrect, expired or no longer valid.'],try_later:['嘗試次數過多，請稍後再試；重寄須至少間隔 60 秒。','Too many attempts. Try later; wait at least 60 seconds before resending.'],email_unavailable:['Email 驗證服務尚未設定，請聯絡管理者。','Email verification is not configured. Contact the operator.'],email_send_failed:['郵件寄送失敗，請稍後重試。','Email delivery failed. Please retry later.'],already_claimed:['既有資料已完成認領。','Existing data has already been claimed.'],login_required:['登入已失效，請重新登入。','Session expired. Sign in again.']};
export default function AuthPanel({lang,mode,claimAvailable,onSession,onClaim}:Props){
 const t=(zh:string,en:string)=>lang==='zh'?zh:en;
 const [view,setView]=useState(mode?'change':'login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState(''),[resetToken,setResetToken]=useState(''),[current,setCurrent]=useState(''),[legacy,setLegacy]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const call=async(route:string,body:any)=>{const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'request_failed');return d;};
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await fn();}catch(e:any){setError(messages[e.message]?.[lang==='zh'?0:1]||t('操作失敗，請重試。','Request failed. Please retry.'));}finally{setBusy(false);}};
 const switchView=(next:string)=>{setView(next);setPassword('');setConfirm('');setCode('');setResetToken('');setCurrent('');setLegacy('');setError('');setNotice('');};
 const submit=async()=>{
 if(['register','reset-password','change'].includes(view)&&password!==confirm){setError(t('兩次輸入的密碼不一致。','Passwords do not match.'));return;}
 await run(async()=>{
 if(view==='login'){await call('login',{email,password});setPassword('');await onSession();}
 if(view==='register'){await call('register',{email,password});setPassword('');setConfirm('');setView('verify');setNotice(t('驗證碼已寄出，10 分鐘內有效。','Code sent. Valid for 10 minutes.'));}
 if(view==='verify'){await call('verify-email',{email,code});switchView('login');setNotice(t('Email 已驗證，請登入。','Email verified. Please sign in.'));}
 if(view==='forgot'){await call('forgot-password',{email});setView('reset');setNotice(t('若此 Email 有已驗證帳號，將收到密碼復原碼。','If a verified account exists, a reset code will be sent.'));}
 if(view==='reset'){const result=await call('verify-reset-code',{email,code});setResetToken(result.resetToken);setCode('');setView('reset-password');setNotice(t('驗證成功，請在 5 分鐘內設定新密碼。','Code verified. Set your new password within 5 minutes.'));}
 if(view==='reset-password'){await call('reset-password',{email,resetToken,password});switchView('login');setNotice(t('密碼已重設，請重新登入。','Password reset. Please sign in again.'));}
 if(view==='change'){await call('change-password',{currentPassword:current,password});setPassword('');setConfirm('');setCurrent('');await onSession();}
 if(view==='claim'){await call('claim-legacy',{legacyPassword:legacy});setLegacy('');await onClaim?.();setNotice(t('既有題庫及比賽已認領。','Existing banks and games claimed.'));}
 });
 };
 const title=view==='login'?t('登入','Sign in'):view==='register'?t('申請帳號','Create account'):view==='verify'?t('驗證 Email','Verify email'):view==='forgot'?t('忘記密碼','Forgot password'):view==='reset'?t('驗證密碼復原碼','Verify reset code'):view==='reset-password'?t('重設密碼','Reset password'):view==='claim'?t('認領既有資料','Claim existing data'):t('修改密碼','Change password');
 return <section className="panel authPanel"><h2>{title}</h2>{mode&&<p>{t('修改密碼後，所有裝置都需要重新登入。','Changing your password signs out all devices.')}</p>}{error&&<p role="alert" className="alert">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
 <form onSubmit={e=>{e.preventDefault();void submit();}}>
 {!mode&&<label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} readOnly={view==='reset'||view==='reset-password'}/></label>}
 {['verify','reset'].includes(view)&&<label>{t('Email 驗證碼','Email verification code')}<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} required/></label>}
 {view==='change'&&<label>{t('目前密碼','Current password')}<input type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} required/></label>}
 {view==='claim'?<label>{t('原管理者密碼','Original administrator password')}<input type="password" autoComplete="off" value={legacy} onChange={e=>setLegacy(e.target.value)} required/></label>:['login','register','reset-password','change'].includes(view)&&<label>{t(view==='login'?'密碼':'新密碼（12–128 個字元）',view==='login'?'Password':'New password (12–128 characters)')}<input type="password" autoComplete={view==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256}/></label>}
 {['register','reset-password','change'].includes(view)&&<label>{t('確認新密碼','Confirm new password')}<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required maxLength={256}/></label>}
 <button className="primary" disabled={busy}>{busy?t('處理中…','Working…'):title}</button></form>
 <div className="buttons authLinks">
 {!mode&&['login','register','forgot'].filter(v=>v!==view).map(v=><button key={v} disabled={busy} onClick={()=>switchView(v)}>{v==='login'?t('返回登入','Back to sign in'):v==='register'?t('申請帳號','Create account'):t('忘記密碼','Forgot password')}</button>)}
 {!mode&&!['verify','reset','reset-password'].includes(view)&&<button disabled={busy} onClick={()=>switchView('verify')}>{t('已有驗證碼／重新驗證','Verify email / enter code')}</button>}
 {['verify','reset'].includes(view)&&<button disabled={busy} onClick={()=>void run(async()=>{await call(view==='verify'?'resend-verification':'forgot-password',{email});setNotice(t('若帳號符合條件，驗證碼將寄送至您的信箱。請於 10 分鐘內使用，60 秒後可再次重寄。','If eligible, a code will be sent. Use it within 10 minutes; resend after 60 seconds.'));})}>{t('重寄驗證碼','Resend code')}</button>}
 {mode&&claimAvailable&&<button disabled={busy} onClick={()=>switchView(view==='claim'?'change':'claim')}>{view==='claim'?t('修改密碼','Change password'):t('認領既有資料','Claim existing data')}</button>}
 </div></section>;
}
