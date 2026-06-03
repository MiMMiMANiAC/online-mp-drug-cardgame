type SoundName = "button" | "card-play" | "attack" | "hit" | "turn-start" | "victory" | "defeat";

let context: AudioContext | null = null;
let unlocked = false;
let soundEnabled = true;
let masterVolume = 1;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function setMasterVolume(volume: number) {
  masterVolume = Math.max(0, Math.min(1, volume));
}

export function unlockAudio() {
  const audio = getContext();
  if (!audio) return;
  void audio.resume();
  unlocked = true;
}

export function playSound(name: SoundName) {
  const audio = getContext();
  if (!audio || !unlocked || !soundEnabled || masterVolume <= 0) return;

  const now = audio.currentTime;
  switch (name) {
    case "button":
      blip(audio, now, 300, 0.035, 0.04 * masterVolume);
      break;
    case "card-play":
      blip(audio, now, 220, 0.08, 0.06 * masterVolume);
      blip(audio, now + 0.055, 440, 0.1, 0.055 * masterVolume);
      break;
    case "attack":
      sweep(audio, now, 180, 70, 0.16, 0.1 * masterVolume);
      break;
    case "hit":
      noise(audio, now, 0.12, 0.08 * masterVolume);
      blip(audio, now, 95, 0.08, 0.07 * masterVolume);
      break;
    case "turn-start":
      blip(audio, now, 240, 0.12, 0.06 * masterVolume);
      blip(audio, now + 0.11, 360, 0.16, 0.08 * masterVolume);
      blip(audio, now + 0.23, 540, 0.2, 0.08 * masterVolume);
      break;
    case "victory":
      [330, 440, 660, 880].forEach((frequency, index) => {
        blip(audio, now + index * 0.11, frequency, 0.18, 0.08 * masterVolume);
      });
      break;
    case "defeat":
      sweep(audio, now, 180, 55, 0.42, 0.1 * masterVolume);
      break;
  }
}

function getContext() {
  if (typeof window === "undefined") return null;
  if (!context) context = new AudioContext();
  return context;
}

function blip(audio: AudioContext, start: number, frequency: number, duration: number, volume: number) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function sweep(
  audio: AudioContext,
  start: number,
  fromFrequency: number,
  toFrequency: number,
  duration: number,
  volume: number,
) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(fromFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(toFrequency, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function noise(audio: AudioContext, start: number, duration: number, volume: number) {
  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  const source = audio.createBufferSource();
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(audio.destination);
  source.start(start);
}
