/**
 * 棒球計分式聖經問答遊戲 (Bible Baseball) 核心控制邏輯
 */

class BibleBaseballGame {
  constructor() {
    this.storageKey = 'bible_baseball_game_state_v1';
    this.customBanksKey = 'bible_baseball_custom_banks_v1';
    
    // 遊戲預設狀態
    this.state = {
      teams: {
        away: { name: '客隊 (A隊)', runs: 0, hits: 0 },
        home: { name: '主隊 (B隊)', runs: 0, hits: 0 }
      },
      maxInnings: 3,
      currentInning: 1,
      currentHalf: 'top', // 'top' = 上半局(客隊攻), 'bottom' = 下半局(主隊攻)
      outs: 0,
      bases: { b1: false, b2: false, b3: false },
      lineScores: {
        away: [0, 0, 0],
        home: [0, 0, 0]
      },
      isGameOver: false,
      activeBankId: 'romans-6',
      usedQuestionIds: []
    };

    this.history = []; // 供 Undo 使用
    this.allBanks = { ...DEFAULT_QUESTION_BANKS };
    this.loadCustomBanks();

    this.currentDrawnQuestion = null;
    this.initDOM();
  }

  // 載入自訂題庫
  loadCustomBanks() {
    try {
      const saved = localStorage.getItem(this.customBanksKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.allBanks = { ...DEFAULT_QUESTION_BANKS, ...parsed };
      }
    } catch (e) {
      console.warn('無法載入自訂題庫：', e);
    }
  }

  // 儲存自訂題庫
  saveCustomBanks() {
    try {
      const customOnly = {};
      for (const [id, bank] of Object.entries(this.allBanks)) {
        if (!DEFAULT_QUESTION_BANKS[id]) {
          customOnly[id] = bank;
        }
      }
      localStorage.setItem(this.customBanksKey, JSON.stringify(customOnly));
    } catch (e) {
      console.warn('無法儲存自訂題庫：', e);
    }
  }

  // 儲存當前歷史快照
  pushHistory() {
    if (this.history.length > 25) this.history.shift();
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    this.updateUndoButton();
  }

  // 復原上一步 (Undo)
  undo() {
    if (this.history.length === 0) return;
    this.state = this.history.pop();
    this.render();
    this.updateUndoButton();
    this.showFloatingBanner('↩️ 已復原上一步！', '#38bdf8');
  }

  updateUndoButton() {
    const btn = document.getElementById('btn-undo');
    if (btn) {
      btn.disabled = this.history.length === 0;
      btn.classList.toggle('opacity-50', this.history.length === 0);
      btn.classList.toggle('cursor-not-allowed', this.history.length === 0);
    }
  }

  // 取得目前進攻隊伍 key ('away' | 'home')
  getBattingTeamKey() {
    return this.state.currentHalf === 'top' ? 'away' : 'home';
  }

  // 取得目前進攻隊伍名稱
  getBattingTeamName() {
    return this.state.teams[this.getBattingTeamKey()].name;
  }

  // 核心安打邏輯 (依棒球標準跑壘規則推進)
  handleHit(type, questionMeta = null) {
    if (this.state.isGameOver) return;
    this.pushHistory();

    const battingKey = this.getBattingTeamKey();
    let runsScored = 0;
    const oldBases = { ...this.state.bases };

    // 音效
    if (window.soundEngine) {
      window.soundEngine.playHit();
    }

    if (type === '1B') {
      // 一壘安打：三壘回本壘得分；二壘上一壘上各推1壘；打者上一壘
      if (oldBases.b3) runsScored++;
      this.state.bases.b3 = oldBases.b2;
      this.state.bases.b2 = oldBases.b1;
      this.state.bases.b1 = true;
    } else if (type === '2B') {
      // 二壘安打：二、三壘跑者回本壘得分；一壘跑者上三壘；打者上二壘
      if (oldBases.b3) runsScored++;
      if (oldBases.b2) runsScored++;
      this.state.bases.b3 = oldBases.b1;
      this.state.bases.b2 = true;
      this.state.bases.b1 = false;
    } else if (type === '3B') {
      // 三壘安打：一、二、三壘跑者全部回本壘得分；打者上三壘
      if (oldBases.b3) runsScored++;
      if (oldBases.b2) runsScored++;
      if (oldBases.b1) runsScored++;
      this.state.bases.b3 = true;
      this.state.bases.b2 = false;
      this.state.bases.b1 = false;
    } else if (type === 'HR') {
      // 全壘打：所有壘上跑者加打者全部回本壘得分；壘包清空
      runsScored = 1; // 打者自己
      if (oldBases.b1) runsScored++;
      if (oldBases.b2) runsScored++;
      if (oldBases.b3) runsScored++;
      this.state.bases = { b1: false, b2: false, b3: false };
    }

    // 更新數據
    this.state.teams[battingKey].hits++;
    if (runsScored > 0) {
      this.state.teams[battingKey].runs += runsScored;
      this.state.lineScores[battingKey][this.state.currentInning - 1] += runsScored;
    }

    // 播放音效與動畫
    if (type === 'HR') {
      setTimeout(() => {
        if (window.soundEngine) window.soundEngine.playHomeRun();
      }, 150);
      const text = runsScored === 4 ? '💥 滿壘大滿貫全壘打！+4分！' : `🎉 全壘打！+${runsScored}分！`;
      this.showFloatingBanner(text, '#f59e0b');
    } else {
      setTimeout(() => {
        if (window.soundEngine) window.soundEngine.playSafe();
      }, 100);
      if (runsScored > 0) {
        this.showFloatingBanner(`⚾ ${type} 安打！跑者回本壘 +${runsScored}分！`, '#10b981');
      } else {
        this.showFloatingBanner(`⚾ ${type} 安打安全上壘！`, '#34d399');
      }
    }

    this.render();
  }

  // 四壞保送 (Walk / 選用)
  handleWalk() {
    if (this.state.isGameOver) return;
    this.pushHistory();

    const battingKey = this.getBattingTeamKey();
    let runsScored = 0;
    const b = { ...this.state.bases };

    if (!b.b1) {
      b.b1 = true;
    } else if (!b.b2) {
      b.b2 = true;
      b.b1 = true;
    } else if (!b.b3) {
      b.b3 = true;
      b.b2 = true;
      b.b1 = true;
    } else {
      // 滿壘擠回一分！
      runsScored = 1;
      this.state.teams[battingKey].runs += 1;
      this.state.lineScores[battingKey][this.state.currentInning - 1] += 1;
    }

    this.state.bases = b;
    if (window.soundEngine) window.soundEngine.playSafe();
    this.showFloatingBanner(runsScored > 0 ? '🚶 四壞保送！滿壘擠回 1 分！' : '🚶 四壞球保送上一壘！', '#38bdf8');
    this.render();
  }

  // 答錯 / 出局 (OUT)
  handleOut() {
    if (this.state.isGameOver) return;
    this.pushHistory();

    this.state.outs++;

    if (this.state.outs < 3) {
      if (window.soundEngine) window.soundEngine.playOut();
      this.showFloatingBanner(`❌ 答錯！第 ${this.state.outs} 出局！`, '#ef4444');
    } else {
      // 3 出局！換邊
      if (window.soundEngine) window.soundEngine.playChangeInning();
      this.showFloatingBanner('📢 3 出局！攻守換邊！', '#f97316');

      // 清空壘包、重設出局數
      this.state.bases = { b1: false, b2: false, b3: false };
      this.state.outs = 0;

      // 切換局數
      if (this.state.currentHalf === 'top') {
        this.state.currentHalf = 'bottom';
      } else {
        // 下半局結束 -> 進入下一局
        if (this.state.currentInning >= this.state.maxInnings) {
          this.triggerGameOver();
        } else {
          this.state.currentInning++;
          this.state.currentHalf = 'top';
        }
      }
    }

    this.render();
  }

  // 比賽結束
  triggerGameOver() {
    this.state.isGameOver = true;
    if (window.soundEngine) window.soundEngine.playVictory();

    const away = this.state.teams.away;
    const home = this.state.teams.home;
    let winnerText = '';

    if (away.runs > home.runs) {
      winnerText = `🏆 【${away.name}】榮獲冠軍！`;
    } else if (home.runs > away.runs) {
      winnerText = `🏆 【${home.name}】榮獲冠軍！`;
    } else {
      winnerText = `🤝 雙方握手言和！平手締造美好見證！`;
    }

    document.getElementById('winner-announcement').innerText = winnerText;
    document.getElementById('final-away-summary').innerText = `${away.name}：${away.runs} 分（${away.hits} 支安打）`;
    document.getElementById('final-home-summary').innerText = `${home.name}：${home.runs} 分（${home.hits} 支安打）`;

    const modal = document.getElementById('gameover-modal');
    if (modal) modal.classList.remove('hidden');
  }

  // 重新開始比賽
  resetGame() {
    if (!confirm('確定要重新開始比賽嗎？目前的比分與局數將重設。')) return;

    const max = this.state.maxInnings;
    this.state.teams.away.runs = 0;
    this.state.teams.away.hits = 0;
    this.state.teams.home.runs = 0;
    this.state.teams.home.hits = 0;
    this.state.currentInning = 1;
    this.state.currentHalf = 'top';
    this.state.outs = 0;
    this.state.bases = { b1: false, b2: false, b3: false };
    this.state.lineScores = {
      away: new Array(max).fill(0),
      home: new Array(max).fill(0)
    };
    this.state.isGameOver = false;
    this.state.usedQuestionIds = [];
    this.history = [];

    const modal = document.getElementById('gameover-modal');
    if (modal) modal.classList.add('hidden');

    this.render();
    this.updateUndoButton();
    this.showFloatingBanner('🔄 比賽已重新開始！', '#10b981');
  }

  // 切換壘包佔領狀態 (供老師手動點選壘包調整)
  toggleBase(baseKey) {
    this.pushHistory();
    this.state.bases[baseKey] = !this.state.bases[baseKey];
    this.render();
  }

  // 隨機抽取某難度題目
  drawQuestion(levelKey) {
    const bank = this.allBanks[this.state.activeBankId] || this.allBanks['romans-6'];
    if (!bank || !bank.questions) return null;

    let pool = bank.questions[levelKey] || [];
    if (pool.length === 0) {
      alert(`此題庫在【${levelKey}】難度尚無題目，請至出題器新增題目！`);
      return null;
    }

    // 優先挑選未使用過的題目
    let available = pool.filter(q => !this.state.usedQuestionIds.includes(q.id));
    if (available.length === 0) {
      // 若題目抽完，重置該難度題目的已用記錄
      this.state.usedQuestionIds = this.state.usedQuestionIds.filter(id => !pool.some(q => q.id === id));
      available = pool;
    }

    const picked = available[Math.floor(Math.random() * available.length)];
    this.state.usedQuestionIds.push(picked.id);
    this.currentDrawnQuestion = picked;
    return picked;
  }

  // 開啟抽題視窗
  openQuestionModal(levelKey) {
    const q = this.drawQuestion(levelKey);
    if (!q) return;

    const modal = document.getElementById('question-modal');
    const badge = document.getElementById('q-level-badge');
    const verse = document.getElementById('q-verse');
    const questionText = document.getElementById('q-text');
    const answerBox = document.getElementById('q-answer-box');
    const answerText = document.getElementById('q-answer-text');
    const notesText = document.getElementById('q-notes-text');
    const toggleAnswerBtn = document.getElementById('btn-toggle-answer');

    // 徽章樣式設定
    const badgeStyles = {
      single: { text: '🟢 一壘安打・經文事實', bg: 'bg-emerald-600' },
      double: { text: '🔵 二壘安打・經文理解', bg: 'bg-blue-600' },
      triple: { text: '🟠 三壘安打・經文整合', bg: 'bg-amber-600' },
      homerun: { text: '🟣 全壘打・生活應用', bg: 'bg-purple-600' }
    };
    const style = badgeStyles[levelKey] || badgeStyles.single;

    badge.className = `px-3 py-1 rounded-full text-xs font-bold text-white shadow ${style.bg}`;
    badge.innerText = style.text;
    verse.innerText = q.verse || '經文出處';
    questionText.innerText = q.question;
    answerText.innerText = q.answer;
    notesText.innerText = q.notes || '老師裁判提示：本題重點在於引導學生思考與分享。';

    // 預設折疊答案
    answerBox.classList.add('hidden');
    toggleAnswerBtn.innerText = '👁️ 顯示參考解答與經文依據';

    // 儲存當前題目難度供按鈕回調
    modal.dataset.currentLevel = levelKey;
    modal.classList.remove('hidden');
  }

  // 關閉抽題視窗
  closeQuestionModal() {
    const modal = document.getElementById('question-modal');
    if (modal) modal.classList.add('hidden');
  }

  // 浮動提示文字
  showFloatingBanner(text, color = '#ffffff') {
    const banner = document.getElementById('floating-banner');
    if (!banner) return;
    banner.innerText = text;
    banner.style.color = color;
    banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      banner.classList.remove('show');
    }, 2200);
  }

  // 渲染畫面
  render() {
    // 1. 隊伍名稱與總分
    const away = this.state.teams.away;
    const home = this.state.teams.home;
    const battingKey = this.getBattingTeamKey();

    document.getElementById('name-away').innerText = away.name;
    document.getElementById('name-home').innerText = home.name;
    document.getElementById('runs-away').innerText = away.runs;
    document.getElementById('runs-home').innerText = home.runs;
    document.getElementById('hits-away').innerText = away.hits;
    document.getElementById('hits-home').innerText = home.hits;

    // 2. 當前局數與攻守標記
    const inningText = `第 ${this.state.currentInning} 局 · ${this.state.currentHalf === 'top' ? '▲ 上半局' : '▼ 下半局'}`;
    document.getElementById('current-inning-badge').innerText = inningText;
    document.getElementById('batting-team-display').innerText = `${this.getBattingTeamName()} 進攻中`;

    // 高亮正在進攻的隊伍列
    document.getElementById('row-away').classList.toggle('bg-slate-800/80', battingKey === 'away');
    document.getElementById('row-away').classList.toggle('border-l-4', battingKey === 'away');
    document.getElementById('row-away').classList.toggle('border-red-500', battingKey === 'away');

    document.getElementById('row-home').classList.toggle('bg-slate-800/80', battingKey === 'home');
    document.getElementById('row-home').classList.toggle('border-l-4', battingKey === 'home');
    document.getElementById('row-home').classList.toggle('border-blue-500', battingKey === 'home');

    // 3. 各局分數 (Line score)
    const awayLineCells = document.querySelectorAll('.line-away-cell');
    const homeLineCells = document.querySelectorAll('.line-home-cell');
    for (let i = 0; i < this.state.maxInnings; i++) {
      if (awayLineCells[i]) awayLineCells[i].innerText = this.state.lineScores.away[i] ?? '-';
      if (homeLineCells[i]) homeLineCells[i].innerText = this.state.lineScores.home[i] ?? '-';
    }

    // 4. 出局燈號 (3 lights)
    const outLights = document.querySelectorAll('.out-light');
    outLights.forEach((light, idx) => {
      light.classList.toggle('active', idx < this.state.outs);
    });
    document.getElementById('outs-count-text').innerText = `${this.state.outs} / 3`;

    // 5. 壘包視覺狀態
    const b1 = document.getElementById('base-1');
    const b2 = document.getElementById('base-2');
    const b3 = document.getElementById('base-3');

    if (b1) {
      b1.classList.toggle('base-occupied', this.state.bases.b1);
      const runner = b1.querySelector('.runner-badge');
      if (runner) runner.style.display = this.state.bases.b1 ? 'block' : 'none';
    }
    if (b2) {
      b2.classList.toggle('base-occupied', this.state.bases.b2);
      const runner = b2.querySelector('.runner-badge');
      if (runner) runner.style.display = this.state.bases.b2 ? 'block' : 'none';
    }
    if (b3) {
      b3.classList.toggle('base-occupied', this.state.bases.b3);
      const runner = b3.querySelector('.runner-badge');
      if (runner) runner.style.display = this.state.bases.b3 ? 'block' : 'none';
    }

    // 6. 廣播條跑者概況
    const runnerDesc = [];
    if (this.state.bases.b1) runnerDesc.push('一壘');
    if (this.state.bases.b2) runnerDesc.push('二壘');
    if (this.state.bases.b3) runnerDesc.push('三壘');
    let runnerStatusText = '';
    if (runnerDesc.length === 3) {
      runnerStatusText = '🔥 滿壘局面！得點圈大好機會！';
    } else if (runnerDesc.length === 0) {
      runnerStatusText = '壘上無人，打者就定位。';
    } else {
      runnerStatusText = `壘上跑者：${runnerDesc.join('、')}有人。`;
    }
    document.getElementById('runner-status-text').innerText = runnerStatusText;

    // 7. 當前題庫標籤
    const currentBank = this.allBanks[this.state.activeBankId];
    if (currentBank) {
      document.getElementById('current-bank-title').innerText = currentBank.title;
      document.getElementById('current-bank-range').innerText = currentBank.scriptureRange;
    }
  }

  // 初始化 DOM 與事件監聽
  initDOM() {
    // 題庫切換下拉
    const bankSelect = document.getElementById('bank-selector');
    if (bankSelect) {
      bankSelect.innerHTML = '';
      for (const [id, bank] of Object.entries(this.allBanks)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = bank.title;
        opt.selected = id === this.state.activeBankId;
        bankSelect.appendChild(opt);
      }
      bankSelect.addEventListener('change', (e) => {
        this.state.activeBankId = e.target.value;
        this.state.usedQuestionIds = [];
        this.render();
      });
    }

    // 打擊與出局按鈕
    document.getElementById('btn-hit-1b').addEventListener('click', () => this.openQuestionModal('single'));
    document.getElementById('btn-hit-2b').addEventListener('click', () => this.openQuestionModal('double'));
    document.getElementById('btn-hit-3b').addEventListener('click', () => this.openQuestionModal('triple'));
    document.getElementById('btn-hit-hr').addEventListener('click', () => this.openQuestionModal('homerun'));
    
    // 快速直判按鈕 (無需彈窗直接執行)
    document.getElementById('btn-direct-1b').addEventListener('click', () => this.handleHit('1B'));
    document.getElementById('btn-direct-2b').addEventListener('click', () => this.handleHit('2B'));
    document.getElementById('btn-direct-3b').addEventListener('click', () => this.handleHit('3B'));
    document.getElementById('btn-direct-hr').addEventListener('click', () => this.handleHit('HR'));
    document.getElementById('btn-direct-out').addEventListener('click', () => this.handleOut());
    document.getElementById('btn-direct-walk').addEventListener('click', () => this.handleWalk());

    // 答錯出局
    document.getElementById('btn-action-out').addEventListener('click', () => this.handleOut());

    // 復原與重置
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-reset').addEventListener('click', () => this.resetGame());
    document.getElementById('btn-gameover-restart').addEventListener('click', () => this.resetGame());

    // 點選壘包手動切換跑者
    document.getElementById('base-1').addEventListener('click', () => this.toggleBase('b1'));
    document.getElementById('base-2').addEventListener('click', () => this.toggleBase('b2'));
    document.getElementById('base-3').addEventListener('click', () => this.toggleBase('b3'));

    // 題目彈窗內按鈕
    document.getElementById('btn-toggle-answer').addEventListener('click', () => {
      const box = document.getElementById('q-answer-box');
      const btn = document.getElementById('btn-toggle-answer');
      const isHidden = box.classList.toggle('hidden');
      btn.innerText = isHidden ? '👁️ 顯示參考解答與經文依據' : '🙈 隱藏參考解答';
    });

    document.getElementById('btn-modal-correct').addEventListener('click', () => {
      const modal = document.getElementById('question-modal');
      const level = modal.dataset.currentLevel;
      const typeMap = { single: '1B', double: '2B', triple: '3B', homerun: 'HR' };
      this.closeQuestionModal();
      this.handleHit(typeMap[level] || '1B');
    });

    document.getElementById('btn-modal-wrong').addEventListener('click', () => {
      this.closeQuestionModal();
      this.handleOut();
    });

    document.getElementById('btn-modal-reroll').addEventListener('click', () => {
      const modal = document.getElementById('question-modal');
      const level = modal.dataset.currentLevel;
      this.openQuestionModal(level);
    });

    document.getElementById('btn-modal-close').addEventListener('click', () => {
      this.closeQuestionModal();
    });

    // 隊名編輯
    document.getElementById('name-away').addEventListener('click', () => {
      const newName = prompt('請輸入客隊名稱：', this.state.teams.away.name);
      if (newName && newName.trim()) {
        this.state.teams.away.name = newName.trim();
        this.render();
      }
    });

    document.getElementById('name-home').addEventListener('click', () => {
      const newName = prompt('請輸入主隊名稱：', this.state.teams.home.name);
      if (newName && newName.trim()) {
        this.state.teams.home.name = newName.trim();
        this.render();
      }
    });

    // 音效開關按鈕
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        if (window.soundEngine) {
          const enabled = window.soundEngine.toggle();
          soundBtn.innerText = enabled ? '🔊 音效：開啟' : '🔇 音效：靜音';
          soundBtn.classList.toggle('bg-slate-700', !enabled);
          soundBtn.classList.toggle('bg-emerald-700', enabled);
        }
      });
    }

    // 投影模式開關
    const projBtn = document.getElementById('btn-toggle-projector');
    if (projBtn) {
      projBtn.addEventListener('click', () => {
        document.body.classList.toggle('projector-mode');
        const isProj = document.body.classList.contains('projector-mode');
        projBtn.innerText = isProj ? '📺 投影大字：開啟' : '📺 投影大字：關閉';
      });
    }

    // 全螢幕切換
    const fsBtn = document.getElementById('btn-toggle-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.log('無法進入全螢幕：', err);
          });
        } else {
          document.exitFullscreen();
        }
      });
    }

    // 題庫管理彈窗與產生器初始化
    this.initQuestionGeneratorDOM();

    // 初始渲染
    this.render();
    this.updateUndoButton();
  }

  // 初始化自訂範圍出題器
  initQuestionGeneratorDOM() {
    const openBtn = document.getElementById('btn-open-generator');
    const modal = document.getElementById('generator-modal');
    const closeBtn = document.getElementById('btn-close-generator');
    const bookSelect = document.getElementById('gen-book-select');
    const generateBtn = document.getElementById('btn-do-generate');
    const applyBtn = document.getElementById('btn-apply-generated');
    const exportBtn = document.getElementById('btn-export-banks');
    const importInput = document.getElementById('import-banks-file');

    // 填充聖經書卷下拉
    if (bookSelect) {
      bookSelect.innerHTML = '';
      BIBLE_BOOKS.forEach(grp => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = grp.group;
        grp.books.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b;
          opt.innerText = b;
          optgroup.appendChild(opt);
        });
        bookSelect.appendChild(optgroup);
      });
      bookSelect.value = '羅馬書';
    }

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    // 執行生成
    let tempGeneratedBank = null;
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        const book = bookSelect.value;
        const chapter = document.getElementById('gen-chapter-input').value.trim() || '1:1-10';
        const passageText = document.getElementById('gen-passage-text').value.trim();
        const theme = document.getElementById('gen-theme-input').value.trim();

        tempGeneratedBank = BibleQuestionGenerator.generateQuestionSet(book, chapter, passageText, theme);
        this.renderGeneratedPreview(tempGeneratedBank);
        applyBtn.classList.remove('hidden');
        document.getElementById('gen-preview-section').classList.remove('hidden');
      });
    }

    // 套用生成題庫
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        if (!tempGeneratedBank) return;
        this.allBanks[tempGeneratedBank.id] = tempGeneratedBank;
        this.saveCustomBanks();

        // 更新下拉
        const bankSelect = document.getElementById('bank-selector');
        const opt = document.createElement('option');
        opt.value = tempGeneratedBank.id;
        opt.innerText = tempGeneratedBank.title;
        bankSelect.appendChild(opt);
        bankSelect.value = tempGeneratedBank.id;

        this.state.activeBankId = tempGeneratedBank.id;
        this.state.usedQuestionIds = [];
        this.render();

        modal.classList.add('hidden');
        this.showFloatingBanner(`🎉 已成功套用新題庫：${tempGeneratedBank.title}`, '#10b981');
      });
    }

    // 匯出題庫為 JSON
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.allBanks, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `bible_baseball_questions_${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
      });
    }

    // 匯入題庫
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            this.allBanks = { ...this.allBanks, ...imported };
            this.saveCustomBanks();
            alert('題庫匯入成功！');
            location.reload();
          } catch (err) {
            alert('檔案格式錯誤，無法解析 JSON 題庫！');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  // 渲染生成的題目預覽卡片
  renderGeneratedPreview(bank) {
    const container = document.getElementById('gen-preview-cards');
    if (!container) return;
    container.innerHTML = '';

    const tiers = [
      { key: 'single', label: '🟢 一壘安打・經文事實', list: bank.questions.single },
      { key: 'double', label: '🔵 二壘安打・經文理解', list: bank.questions.double },
      { key: 'triple', label: '🟠 三壘安打・經文整合', list: bank.questions.triple },
      { key: 'homerun', label: '🟣 全壘打・生活應用', list: bank.questions.homerun }
    ];

    tiers.forEach(tier => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800 p-4 rounded-lg border border-slate-700 shadow';
      
      let html = `<div class="font-bold text-sm mb-2 text-slate-200">${tier.label}（${tier.list.length} 題）</div>`;
      tier.list.forEach((q, idx) => {
        html += `
          <div class="mb-3 pl-3 border-l-2 border-slate-600 text-xs">
            <div class="text-slate-300 font-semibold">Q${idx + 1}: ${q.question}</div>
            <div class="text-emerald-400 mt-1">參考解答：${q.answer}</div>
          </div>
        `;
      });
      card.innerHTML = html;
      container.appendChild(card);
    });
  }
}

// 啟動應用
window.addEventListener('DOMContentLoaded', () => {
  window.bibleBaseball = new BibleBaseballGame();
});
