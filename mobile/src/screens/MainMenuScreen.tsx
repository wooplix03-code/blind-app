import React, { useEffect, useState } from 'react';
import { speechEngine } from '../services/speechEngine';
import { TopNavBar } from '../components/TopNavBar';
import {
  Users,
  Camera,
  User,
  Mic,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';

interface MainMenuProps {
  navigate: (page: string) => void;
  userName: string;
}

export const MainMenuScreen: React.FC<MainMenuProps> = ({ navigate, userName }) => {
  const [isListening, setIsListening] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  useEffect(() => {
    speechEngine.speak(
      'Main Menu. Swipe left for Social. Swipe right to Ask Anything. Swipe up for Visualize. Hold anywhere and say the page name.'
    );
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleAction = (page: string) => {
    speechEngine.playCue('success');
    navigate(page);
  };

  const firstName = userName ? userName.split(' ')[0] : 'there';

  return (
    <div className="screen-content-responsive wz-menu-shell">
      <TopNavBar navigate={navigate} />

      <main className="wz-menu-main">
        {/* ── Warm Editorial Greeting Strip ── */}
        <section className="wz-welcome-strip">
          <div className="wz-welcome-left">
            <div className="wz-greeting-eyebrow">
              <span className="wz-ready-dot" aria-hidden="true" />
              <span>{getGreeting()}, {firstName}</span>
            </div>
            <h1 className="wz-greeting-name">What would you like to do?</h1>
          </div>

          <button
            type="button"
            className={`wz-voice-trigger ${isListening ? 'is-listening' : ''}`}
            onClick={() => {
              setIsListening(true);
              speechEngine.speak('Hold anywhere on screen and say the page name.');
              setTimeout(() => setIsListening(false), 3200);
            }}
          >
            <span className="wz-voice-icon">
              <Mic size={16} />
            </span>
            {isListening ? (
              <span className="waveform" style={{ height: 18 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="wave-bar"
                    style={{
                      animationDelay: `${(i - 1) * 0.1}s`,
                      background: '#DC2626',
                    }}
                  />
                ))}
              </span>
            ) : (
              <span className="wz-voice-text">
                <strong>Voice Assist</strong>
                <small>Hold &amp; speak anywhere</small>
              </span>
            )}
          </button>
        </section>

        {/* ── Balanced Paper-Craft Workspace Grid ── */}
        <section className="wz-bento-grid" aria-label="Workspace Tools">
          {/* 1. VISUALIZE — Deep Ink Hero Card */}
          <button
            type="button"
            onPointerDown={() => setActiveCard('visualization')}
            onPointerUp={() => setActiveCard(null)}
            onPointerLeave={() => setActiveCard(null)}
            onClick={() => handleAction('visualization')}
            className={`wz-card wz-card-hero ${activeCard === 'visualization' ? 'is-pressed' : ''}`}
            aria-label="Visualize - Camera and Reading Assistant"
          >
            <div className="wz-card-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div className="wz-icon-pill wz-icon-hero">
                  <Camera size={22} strokeWidth={1.9} />
                </div>
                <span className="wz-status-chip">Camera &amp; Reading</span>
              </div>
              <span className="wz-swipe-hint">Swipe ↑</span>
            </div>

            <div className="wz-card-body">
              <h2>Visualize</h2>
              <p>
                Point your camera to describe surroundings, read printed signs or menus aloud, and ask questions about what is in front of you.
              </p>
            </div>

            <div className="wz-card-footer">
              <span>Open Camera Assistant</span>
              <span className="wz-arrow-circle wz-arrow-hero">
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </span>
            </div>
          </button>

          {/* 2. ASK ANYTHING — Warm Conversational Terracotta Card */}
          <button
            type="button"
            onPointerDown={() => setActiveCard('ask-questions')}
            onPointerUp={() => setActiveCard(null)}
            onPointerLeave={() => setActiveCard(null)}
            onClick={() => handleAction('ask-questions')}
            className={`wz-card wz-card-light wz-card-ask ${activeCard === 'ask-questions' ? 'is-pressed' : ''}`}
            aria-label="Ask Anything - Voice Answers"
          >
            <div className="wz-card-top">
              <div className="wz-icon-pill wz-icon-terracotta">
                <Mic size={20} strokeWidth={2} />
              </div>
              <span className="wz-swipe-hint">Swipe →</span>
            </div>

            <div className="wz-card-body">
              <h3>Ask Anything</h3>
              <p>
                Get clear spoken answers for news, weather, travel, and everyday questions.
              </p>
            </div>

            <div className="wz-prompt-strip">
              <span>Tap or hold to talk</span>
              <ChevronRight size={16} />
            </div>
          </button>

          {/* 3. SOCIAL — Symmetrical Sage Green Card */}
          <button
            type="button"
            onPointerDown={() => setActiveCard('feed')}
            onPointerUp={() => setActiveCard(null)}
            onPointerLeave={() => setActiveCard(null)}
            onClick={() => handleAction('feed')}
            className={`wz-card wz-card-light wz-card-social wz-card-row ${activeCard === 'feed' ? 'is-pressed' : ''}`}
            aria-label="Social - Feed and Community Posts"
          >
            <div className="wz-icon-pill wz-icon-sage">
              <Users size={21} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
                  Social
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--wz-sage)',
                    backgroundColor: 'var(--wz-sage-bg)',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                  }}
                >
                  Community
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                Listen to community updates, photo descriptions, and share moments.
              </p>
            </div>
            <span className="wz-arrow-circle wz-arrow-light">
              <ChevronRight size={16} />
            </span>
          </button>

          {/* 4. MY PROFILE — Symmetrical Soft Plum Card */}
          <button
            type="button"
            onPointerDown={() => setActiveCard('profile')}
            onPointerUp={() => setActiveCard(null)}
            onPointerLeave={() => setActiveCard(null)}
            onClick={() => handleAction('profile')}
            className={`wz-card wz-card-light wz-card-profile wz-card-row ${activeCard === 'profile' ? 'is-pressed' : ''}`}
            aria-label="My Profile - Settings and Account"
          >
            <div className="wz-icon-pill wz-icon-plum">
              <User size={21} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
                  My Profile
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--ink-soft)' }}>
                  Double shake
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                Manage account details, voice language, and reading preferences.
              </p>
            </div>
            <span className="wz-arrow-circle wz-arrow-light">
              <ChevronRight size={16} />
            </span>
          </button>
        </section>

        {/* ── Quiet Keycap Gesture Footer ── */}
        <footer className="wz-gesture-dock">
          <div className="wz-gesture-pills">
            <span className="wz-gesture-label">Quick gestures:</span>
            {[
              { label: '← Social', page: 'feed' },
              { label: 'Ask →', page: 'ask-questions' },
              { label: '↑ Visualize', page: 'visualization' },
              { label: '↓ Language', page: 'language' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="wz-gesture-pill"
                onClick={() => handleAction(item.page)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="wz-shake-note">
            <span>
              Shake once for <strong>Main Menu</strong> &bull; Twice for <strong>Profile</strong>
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
};
