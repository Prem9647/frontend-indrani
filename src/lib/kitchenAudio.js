// Web Audio chime & Tamil Text-To-Speech announcement for Kitchen Display

let audioCtx = null;
let soundEnabled = true;
let isAudioUnlocked = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  isAudioUnlocked = true;
}

// Automatically unlock audio on first user click anywhere on the page
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const autoUnlock = () => {
    unlockAudio();
    document.removeEventListener("click", autoUnlock);
    document.removeEventListener("touchstart", autoUnlock);
    document.removeEventListener("keydown", autoUnlock);
  };
  document.addEventListener("click", autoUnlock, { once: true });
  document.addEventListener("touchstart", autoUnlock, { once: true });
  document.addEventListener("keydown", autoUnlock, { once: true });
}

/**
 * Plays a pleasant 2-tone kitchen order chime (Ding-Dong)
 */
export function playKitchenChime() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // First tone (587 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Second tone (880 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.21);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.72);
  } catch (e) {
    console.warn("Kitchen chime error:", e);
  }
}

/**
 * Find the best available Tamil voice from the device/browser
 */
function getTamilVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];

  // 1. Look for native Tamil voice (ta-IN, ta, or named Tamil)
  const taVoice = voices.find(
    (v) =>
      v.lang === "ta-IN" ||
      v.lang === "ta_IN" ||
      v.lang.startsWith("ta") ||
      v.name.toLowerCase().includes("tamil")
  );
  if (taVoice) return taVoice;

  // 2. Indian English voice fallback (good pronunciation for Indian dish names)
  const inVoice = voices.find(
    (v) =>
      v.lang === "en-IN" ||
      v.lang === "en_IN" ||
      v.name.toLowerCase().includes("india")
  );
  if (inVoice) return inVoice;

  // 3. Any standard voice
  return voices.find((v) => v.lang.startsWith("en-")) || null;
}

/**
 * Speaks Tamil voice announcement using Web Speech Synthesis
 */
export function speakTamilVoice(text) {
  if (!soundEnabled) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel(); // Clear any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ta-IN";
    utterance.rate = 0.9; // Clear, easy to understand rate
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = getTamilVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error:", e);
  }
}

/**
 * Announce incoming order with Chime + Tamil Voice
 */
export function announceKitchenOrder(payload, isUpdate = false) {
  if (!payload) return;

  const isParcel = payload.tableNumber === "parcel" || payload.tableNumber === 0;
  const tableText = isParcel ? "பார்சல்" : `டேபிள் ${String(payload.tableNumber ?? "").trim()}`;

  // Create clean item summary
  const items = Array.isArray(payload.items) ? payload.items.filter((i) => i.status !== "cancelled") : [];
  if (items.length === 0) return;

  const itemSummary = items.map((i) => `${i.quantity} ${i.name}`).join(", ");

  let voiceText = "";
  if (isUpdate) {
    // When adding new item(s) to existing table:
    voiceText = `${tableText}. ${itemSummary}.`;
  } else {
    // When an entirely new order is placed:
    voiceText = `${tableText}. புதிய ஆர்டர். ${itemSummary}.`;
  }

  unlockAudio();
  playKitchenChime();

  // Speak voice announcement after the chime plays (~450ms delay)
  setTimeout(() => {
    speakTamilVoice(voiceText);
  }, 450);
}

export function testKitchenAudio() {
  unlockAudio();
  playKitchenChime();
  setTimeout(() => {
    speakTamilVoice("சமையலறை குரல் அறிவிப்பு தயாராக உள்ளது");
  }, 450);
}

export function getSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(val) {
  soundEnabled = !!val;
  if (soundEnabled) {
    unlockAudio();
  }
  return soundEnabled;
}
