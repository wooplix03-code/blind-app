import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Globe, User } from 'lucide-react';
import { speechEngine } from '../services/speechEngine';
import { themePrefs, type DisplayMode, type TextScale } from '../services/themePrefs';

interface TopNavBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  navigate?: (page: string) => void;
  currentUser?: any;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  title,
  showBack = false,
  onBack,
  navigate,
  currentUser,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mode, setMode] = useState<DisplayMode>(() => themePrefs.getMode());
  const [scale, setScale] = useState<TextScale>(() => themePrefs.getScale());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    const onThemeSync = () => {
      setMode(themePrefs.getMode());
      setScale(themePrefs.getScale());
    };
    window.addEventListener('wezey:theme-change', onThemeSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('wezey:theme-change', onThemeSync);
    };
  }, []);

  return (
    <header
      style={{
        height: '66px',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--card)',
        borderBottom: '1.5px solid var(--border)',
        zIndex: 50,
        flexShrink: 0,
        gap: '0.75rem',
      }}
    >
      {/* Left section: Back button or Warm Editorial Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {showBack ? (
          <button
            onClick={onBack}
            aria-label="Go Back"
            style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: 'var(--paper)',
              border: '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={19} />
          </button>
        ) : (
          <div
            onClick={() => navigate && navigate('menu')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: mode === 'contrast' ? '#FACC15' : '#16324F',
                color: mode === 'contrast' ? '#111110' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Newsreader', Georgia, serif",
                fontWeight: 600,
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              W
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontSize: '1.22rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                Wezey
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--ink-soft)',
                  letterSpacing: '0.04em',
                }}
              >
                Accessible Workspace
              </div>
            </div>
          </div>
        )}

        {title && showBack && (
          <span
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: '1.35rem',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              marginLeft: '0.25rem',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
        )}
      </div>

      {/* Center: Quiet Human Voice Status Pill */}
      <button
        type="button"
        className="topbar-voice-pill"
        onClick={() =>
          speechEngine.speak('Voice assistant is ready. You can press and hold anywhere to talk.')
        }
        style={{
          alignItems: 'center',
          gap: '8px',
          padding: '0.38rem 0.9rem',
          backgroundColor: 'var(--wz-sage-bg)',
          borderRadius: '9999px',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--wz-sage)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <Volume2 size={15} color="var(--wz-sage)" style={{ flexShrink: 0 }} />
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--wz-sage)',
            whiteSpace: 'nowrap',
          }}
        >
          Voice Ready
        </span>
      </button>

      {/* Right: Display Accessibility Quick Controls + Clock + Globe + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setScale(themePrefs.toggleScale())}
          aria-pressed={scale === 'large'}
          title="Toggle large text size"
          style={{
            height: 36,
            padding: '0 0.65rem',
            borderRadius: '10px',
            backgroundColor: 'var(--paper)',
            border: '1.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--ink)',
            fontSize: '0.76rem',
            fontWeight: 700,
          }}
        >
          <span>Aa</span>
          <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>
            {scale === 'large' ? 'Large' : 'Normal'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode(themePrefs.toggleMode())}
          aria-pressed={mode === 'contrast'}
          title="Toggle high contrast mode"
          style={{
            height: 36,
            padding: '0 0.65rem',
            borderRadius: '10px',
            backgroundColor: mode === 'contrast' ? '#FACC15' : 'var(--paper)',
            border: '1.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: mode === 'contrast' ? '#111110' : 'var(--ink)',
            fontSize: '0.76rem',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              border: '1.5px solid currentColor',
              background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)',
              display: 'inline-block',
            }}
          />
          <span className="topbar-voice-pill" style={{ display: 'inline' }}>
            {mode === 'contrast' ? 'Paper' : 'Contrast'}
          </span>
        </button>

        <div
          className="topbar-voice-pill"
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--ink-soft)',
            padding: '0.4rem 0.65rem',
            backgroundColor: 'var(--paper)',
            borderRadius: '10px',
            border: '1.5px solid var(--border)',
          }}
        >
          {currentTime || '12:00'}
        </div>

        {navigate && (
          <>
            <button
              onClick={() => navigate('language')}
              aria-label="Language Preferences"
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'var(--paper)',
                border: '1.5px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <Globe size={17} />
            </button>

            <button
              onClick={() => navigate('profile')}
              aria-label="User Profile"
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'var(--paper)',
                border: '1.5px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink)',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={17} />
              )}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
