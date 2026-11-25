import React, { useEffect, useState } from 'react';
import { speechEngine } from '../services/speechEngine';
import { TopNavBar } from '../components/TopNavBar';
import { Languages, Volume2, Mic, Globe2, ChevronRight, Check } from 'lucide-react';

interface LanguageProps {
  navigate: (page: string) => void;
  currentLanguage: string;
  onLanguageChanged: (code: string) => void;
}

export const LanguageScreen: React.FC<LanguageProps> = ({
  navigate,
  currentLanguage,
  onLanguageChanged,
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const langList = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
  ];

  useEffect(() => {
    speechEngine.speak(
      'Language settings. Choose Change Language, Text to Speech, Speech to Text, or Translation.'
    );
  }, []);

  const handleSelectLanguage = (l: typeof langList[0]) => {
    speechEngine.playCue('success');
    speechEngine.currentLanguage = l.code;
    onLanguageChanged(l.code);

    const confirmation = l.code === 'ms'
      ? 'Bahasa pilihan anda telah ditukar kepada Bahasa Melayu.'
      : l.code === 'hi'
      ? 'आपकी पसंदीदा भाषा हिंदी में बदल दी गई है।'
      : `Your preferred language has been changed to ${l.name}.`;

    speechEngine.speak(confirmation, () => {
      setActiveSubmenu(null);
    }, l.code);
  };

  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
      <TopNavBar
        title="Language Settings"
        showBack={true}
        onBack={() => navigate('profile')}
      />

      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        {activeSubmenu === 'change_lang' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.35rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Select Preferred Language
              </h3>
              <button
                onClick={() => setActiveSubmenu(null)}
                className="wz-gesture-pill"
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {langList.map((l) => (
                <div
                  key={l.code}
                  onClick={() => handleSelectLanguage(l)}
                  className="craft-card"
                  style={{
                    borderRadius: '1rem',
                    padding: '1rem 1.25rem',
                    border: currentLanguage === l.code ? '2px solid #16324F' : '1.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}>{l.name}</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--ink-soft)' }}>{l.native}</div>
                  </div>
                  {currentLanguage === l.code && <Check size={20} color="#16324F" strokeWidth={2.5} />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div
              onClick={() => {
                speechEngine.speak('Select your preferred voice language.');
                setActiveSubmenu('change_lang');
              }}
              className="craft-card"
              style={{
                borderRadius: '1.15rem',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--wz-plum-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Languages size={21} color="var(--wz-plum)" strokeWidth={2} />
                </div>
                <span style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
                  Change Language
                </span>
              </div>
              <ChevronRight size={20} color="var(--ink-soft)" />
            </div>

            <div
              onClick={() => speechEngine.speak('Text to Speech is enabled. All visual text and posts are automatically converted to clear audio.')}
              className="craft-card"
              style={{
                borderRadius: '1.15rem',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--wz-sage-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Volume2 size={21} color="var(--wz-sage)" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
                    Text to Speech
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
                    Convert written text and posts into voice
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="var(--ink-soft)" />
            </div>

            <div
              onClick={() => speechEngine.speak('Speech to Text is active. You can press and hold anywhere on the screen to talk.')}
              className="craft-card"
              style={{
                borderRadius: '1.15rem',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--wz-terracotta-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={21} color="var(--wz-terracotta)" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
                    Speech to Text
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
                    Speak naturally instead of typing
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="var(--ink-soft)" />
            </div>

            <div
              onClick={() => speechEngine.speak('Translation active. Incoming posts in foreign languages are automatically translated to your preferred language.')}
              className="craft-card"
              style={{
                borderRadius: '1.15rem',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--card-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe2 size={21} color="var(--ink)" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
                    Translation
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
                    Translate posts into your preferred language
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="var(--ink-soft)" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
