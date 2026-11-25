import { speechEngine } from './speechEngine';

export type DisplayMode = 'paper' | 'contrast';
export type TextScale = 'normal' | 'large';

const MODE_KEY = 'wezey_display_mode';
const SCALE_KEY = 'wezey_text_scale';

export const themePrefs = {
  getMode(): DisplayMode {
    try {
      const val = localStorage.getItem(MODE_KEY);
      return val === 'contrast' ? 'contrast' : 'paper';
    } catch {
      return 'paper';
    }
  },

  getScale(): TextScale {
    try {
      const val = localStorage.getItem(SCALE_KEY);
      return val === 'large' ? 'large' : 'normal';
    } catch {
      return 'normal';
    }
  },

  apply(): void {
    const mode = this.getMode();
    const scale = this.getScale();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-mode', mode);
      document.documentElement.style.fontSize = scale === 'large' ? '18px' : '16px';
    }
  },

  toggleMode(): DisplayMode {
    const next: DisplayMode = this.getMode() === 'paper' ? 'contrast' : 'paper';
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // ignore
    }
    this.apply();
    window.dispatchEvent(new CustomEvent('wezey:theme-change'));
    speechEngine.speak(
      next === 'contrast' ? 'High contrast mode turned on.' : 'Warm paper mode turned on.'
    );
    return next;
  },

  toggleScale(): TextScale {
    const next: TextScale = this.getScale() === 'normal' ? 'large' : 'normal';
    try {
      localStorage.setItem(SCALE_KEY, next);
    } catch {
      // ignore
    }
    this.apply();
    window.dispatchEvent(new CustomEvent('wezey:theme-change'));
    speechEngine.speak(next === 'large' ? 'Large text enabled.' : 'Normal text size restored.');
    return next;
  },
};
