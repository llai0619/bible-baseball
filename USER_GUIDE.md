# 棒球查經操作手冊 / Bible Baseball guide

管理者網址：https://bible-baseball.llai.workers.dev/admin

## 中文

1. **登入與語言**：使用專案私有 `.env` 內的 `ADMIN_PASSWORD` 登入。右上角可切換繁體中文／英文，每台裝置分別記住選擇。
2. **先試玩**：按「載入功能示範題庫」。此題庫使用棒球規則測試文字，不是聖經題庫，也不能視為神學審核成果。
3. **設定題數**：預設三局，共 90 題：一壘 36、二壘 27、三壘 18、全壘打 9。改局數會更新未手動調整的數量；「恢復預設題數」重新計算全部。已生成的題目不會自動刪除。
4. **正式題庫**：確認經文與 AI 授權後，由部署人員啟用功能。輸入經文範圍，取得 CUV／NIV；三壘題另加入交叉經文。生成後逐題檢查雙語、正確答案、解說與出處，再核准。可重新生成指定題目，新題仍須審核。
5. **建立比賽**：第一個隊名為先攻隊，第二個為後攻隊。設定局數與時間後建立，使用 QR Code 或觀看連結開啟投影／手機畫面。不要投影管理者畫面。
6. **選題與倒數**：隊伍口頭選難度，主持人抽題並預覽答案，再按開始。一壘／二壘 15 秒、三壘 30 秒、全壘打 45 秒，皆可於賽前調整。
7. **全壘打**：主持人先選背誦語言，按「開始準備」顯示經文五秒，之後自動隱藏並開始四十五秒倒數。介面切換語言不改變本題背誦譯本。
8. **判分與答案**：口頭回答後停止計時，按答對或答錯。再按「公布答案」，觀眾才看得到答案與解說。時間到不會自動公布或判出局。
9. **討論與換邊**：討論完按下一題。三出局後清壘換邊。主持人可暫停、繼續、延長十秒，或在下一題前撤銷上次判分。
10. **結束**：完成設定局數後結算，平手可加賽或保留和局，也可提前結束。賽後可回顧題目及答案。

**音效與連線**：投影裝置先點「啟用音效」，手機預設靜音。斷線會自動重連；服務重啟後，比賽以暫停狀態復原，由主持人繼續。

## English

1. Sign in with `ADMIN_PASSWORD` from the private project `.env`. Each device remembers its own language.
2. Load the functional demo to try the game. Its synthetic baseball text is not Scripture or a reviewed Bible question bank.
3. Default question targets are `[12, 9, 6, 3] × innings`. Three innings yield 36 singles, 27 doubles, 18 triples and 9 home runs. Manual overrides survive inning changes; Restore defaults recalculates all targets.
4. After applicable Scripture/AI permissions are confirmed and the feature is enabled, fetch the passage and cross references. Generate drafts, inspect both languages, answers and sources, then approve them. Regenerated questions also require review.
5. Enter first- and second-batting team names, innings and timers. Create a game and share the watch URL or QR code. Never project the host console.
6. Teams choose difficulty and answer orally. The host draws a question, previews the answer, and starts the timer. Defaults: single 15s, double 15s, triple 30s, home run 45s.
7. For home runs, select the recitation translation before starting. The passage appears for five preparation seconds, then disappears for the 45-second countdown. UI language changes do not change the recitation translation.
8. Stop the timer after the oral response, record the ruling, then reveal the answer. A timeout does not automatically record an out or reveal an answer.
9. Discuss, then advance. Three outs clear the bases and switch sides. Pause, resume, extend and undo controls support host corrections before advancing.
10. Complete the configured innings, add an extra inning for a tie, leave a tie, or end early. Review questions and answers after the game.

Enable sound on the projector device before play. Phones default to muted. Disconnected devices reconnect automatically; a restarted service restores an unfinished game paused for the host to resume.


## 個人帳號與密碼

- 按「申請帳號」，輸入 Email、新密碼與確認密碼。密碼須為 12–128 個字元，可包含中文及空白。收到六位數驗證碼後，於 10 分鐘內完成 Email 驗證，再以 Email 與密碼登入。
- 未收到驗證碼時，確認垃圾郵件後按「重寄驗證碼」；至少間隔 60 秒，重寄後只能使用最新一組，連續錯誤五次即失效。若畫面提示服務尚未設定或寄送失敗，請聯絡系統管理者。
- 按「忘記密碼」，輸入 Email 並取得密碼復原碼；驗證成功後，於 5 分鐘內設定新密碼。畫面不會告知 Email 是否已註冊。
- 「帳號設定」可修改密碼。修改或重設密碼後，所有裝置都須重新登入。
- 每個帳號只管理自己的題庫、題目及比賽；參賽者仍可透過觀看網址或 QR Code 免登入觀看。
- 原管理者先申請並驗證個人帳號，再到「帳號設定 → 認領既有資料」輸入原管理者密碼，即可取得原有題庫與比賽。認領僅限一次，原共用密碼不再用於登入。
