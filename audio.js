/**
 * 棒球計分式聖經問答遊戲 (Bible Baseball)
 * Web Audio API 音效合成引擎（無需外部音訊檔，零延遲、離線即用）
 */

class BaseballSoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // 初始化 AudioContext (需在使用者互動後啟動)
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // 木棒擊球聲 (Crack of the bat)
  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // 1. 擊球木質衝擊波 (短脈衝雜訊)
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(3.0, t);

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(1.0, t);
    gainNoise.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    noise.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(this.ctx.destination);
    noise.start(t);

    // 2. 球棒共振音 (木頭嗡聲)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // 得分 / 安打安全上壘音效 (Upbeat arpeggio)
  playSafe() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // 全壘打歡呼大號角音效 (Home Run Fanfare)
  playHomeRun() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const chords = [
      { notes: [523.25, 659.25, 783.99], time: 0, dur: 0.18 },       // C
      { notes: [587.33, 739.99, 880.00], time: 0.18, dur: 0.18 },    // D
      { notes: [659.25, 830.61, 987.77], time: 0.36, dur: 0.20 },    // E
      { notes: [783.99, 987.77, 1174.66], time: 0.56, dur: 0.45 },   // G
      { notes: [1046.50, 1318.51, 1567.98], time: 0.95, dur: 0.8 }   // High C
    ];

    chords.forEach(chord => {
      chord.notes.forEach(freq => {
        const t = this.ctx.currentTime + chord.time;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + chord.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + chord.dur + 0.05);
      });
    });
  }

  // 出局音效 (Out / Strike)
  playOut() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.3);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  // 3出局換邊 / 裁判長哨音 (Three Outs / Side Change)
  playChangeInning() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // 哨音
    const t = this.ctx.currentTime;
    const whistle = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistle.type = 'triangle';
    whistle.frequency.setValueAtTime(1800, t);
    whistle.frequency.setValueAtTime(2100, t + 0.08);
    whistle.frequency.setValueAtTime(1800, t + 0.16);
    
    whistleGain.gain.setValueAtTime(0.35, t);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    whistle.connect(whistleGain);
    whistleGain.connect(this.ctx.destination);
    whistle.start(t);
    whistle.stop(t + 0.42);

    // 換局鈴聲
    setTimeout(() => {
      if (!this.ctx) return;
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const nt = this.ctx.currentTime + idx * 0.1;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, nt);
        g.gain.setValueAtTime(0.25, nt);
        g.gain.exponentialRampToValueAtTime(0.01, nt + 0.3);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(nt);
        o.stop(nt + 0.32);
      });
    }, 250);
  }

  // 比賽結束慶祝樂 (Game Victory)
  playVictory() {
    this.playHomeRun();
    setTimeout(() => {
      this.playSafe();
    }, 1100);
  }
}

window.soundEngine = new BaseballSoundEffects();
