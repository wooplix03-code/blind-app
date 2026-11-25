import React, { useRef, useState } from 'react';
import { speechEngine } from '../services/speechEngine';
import { api } from '../services/api';

interface GlobalGestureOverlayProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSingleTap?: () => void;
  onVoiceCommand?: (command: string) => void;
  onLanguageToggle?: () => void;
  onShakeOnce?: () => void;
  onShakeTwice?: () => void;
  currentPage: string;
  navigate: (page: string) => void;
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export const GlobalGestureOverlay: React.FC<GlobalGestureOverlayProps> = ({
  currentPage,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onSingleTap,
  onVoiceCommand,
  onLanguageToggle,
  onShakeOnce,
  onShakeTwice,
  navigate,
  isAuthenticated,
  children,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');

  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const holdTimer = useRef<any>(null);
  const isHoldActive = useRef<boolean>(false);
  const speechTranscriptRef = useRef<string>('');

  const lastShakeTime = useRef<number>(0);
  const shakeCount = useRef<number>(0);
  const shakeTimer = useRef<any>(null);

  // Device Accelerometer Shake Detection
  // Shake 1 time: Return to Main Menu
  // Shake 2 times: Access Profile
  React.useEffect(() => {
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      if (magnitude > 17) {
        const now = Date.now();
        if (now - lastShakeTime.current > 300) {
          lastShakeTime.current = now;
          shakeCount.current += 1;

          if (shakeTimer.current) {
            clearTimeout(shakeTimer.current);
          }

          shakeTimer.current = setTimeout(() => {
            if (shakeCount.current >= 2) {
              speechEngine.playCue('success');
              if (onShakeTwice) onShakeTwice();
            } else if (shakeCount.current === 1) {
              speechEngine.playCue('success');
              if (onShakeOnce) onShakeOnce();
            }
            shakeCount.current = 0;
            shakeTimer.current = null;
          }, 850);
        }
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, [onShakeOnce, onShakeTwice]);

  const MIN_SWIPE_DISTANCE = 45;
  const HOLD_THRESHOLD_MS = 400;

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button')) {
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    touchStartPos.current = { x: clientX, y: clientY, time: Date.now() };
    isHoldActive.current = false;
    speechTranscriptRef.current = '';

    holdTimer.current = setTimeout(() => {
      isHoldActive.current = true;
      setIsRecording(true);
      setVoiceStatus('Listening... Speak now');

      speechEngine.playCue('mic_start');
      speechEngine.speak('How can I help?', () => {
        speechEngine.startListening(
          (transcript, isFinal) => {
            speechTranscriptRef.current = transcript;
            setSpokenTranscript(transcript);
            if (isFinal) {
              processGlobalVoiceCommand(transcript);
            }
          },
          (err) => {
            console.log('Voice capture error:', err);
          }
        );
      });
    }, HOLD_THRESHOLD_MS);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartPos.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const diffX = Math.abs(clientX - touchStartPos.current.x);
    const diffY = Math.abs(clientY - touchStartPos.current.y);

    if ((diffX > 25 || diffY > 25) && !isHoldActive.current) {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }

    if (isHoldActive.current) {
      isHoldActive.current = false;
      setIsRecording(false);
      setVoiceStatus('Searching...');
      speechEngine.playCue('mic_end');
      speechEngine.speak('Searching...');
      speechEngine.stopListening();

      setTimeout(() => {
        const command = speechTranscriptRef.current.trim();
        if (command) {
          processGlobalVoiceCommand(command);
        } else {
          setVoiceStatus(null);
        }
      }, 500);
      return;
    }

    if (!touchStartPos.current) return;

    const clientX = 'changedTouches' in e ? (e as React.TouchEvent).changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? (e as React.TouchEvent).changedTouches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = clientX - touchStartPos.current.x;
    const deltaY = clientY - touchStartPos.current.y;
    const deltaTime = Date.now() - touchStartPos.current.time;

    if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && deltaTime < 350) {
      if (onSingleTap) onSingleTap();
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
      if (deltaX < 0) {
        // Swipe Left: Acts as back button everywhere
        speechEngine.playCue('success');
        if (onSwipeLeft) onSwipeLeft();
      } else {
        speechEngine.playCue('success');
        if (onSwipeRight) onSwipeRight();
      }
    } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > MIN_SWIPE_DISTANCE) {
      if (!isAuthenticated) {
        speechEngine.speak('Please register or login first to access this feature.');
        return;
      }
      if (deltaY < 0) {
        speechEngine.playCue('success');
        if (onSwipeUp) onSwipeUp();
      } else {
        // Swipe Down: Change language between Malay and English
        speechEngine.playCue('success');
        if (onLanguageToggle) {
          onLanguageToggle();
        } else if (onSwipeDown) {
          onSwipeDown();
        }
      }
    }

    touchStartPos.current = null;
  };

  const processGlobalVoiceCommand = async (command: string) => {
    setVoiceStatus(`Interpreting: "${command}"`);

    // Clean Wake-Word Support: e.g. "Wezey, can you tell me..." or "Wezey, show me..."
    let cleanCommand = command.trim();
    if (cleanCommand.toLowerCase().startsWith('wezey')) {
      cleanCommand = cleanCommand.replace(/^wezey[,:\s]*/i, '').trim();
    }
    const lower = cleanCommand.toLowerCase();

    if (onVoiceCommand) onVoiceCommand(command);

    if (!isAuthenticated) {
      if (lower.includes('register') || lower.includes('sign up')) {
        speechEngine.speak('Opening registration.');
        navigate('register');
      } else if (lower.includes('login') || lower.includes('sign in')) {
        speechEngine.speak('Opening login.');
        navigate('login');
      } else {
        speechEngine.speak('Please register or login to access Wezey features.');
      }
      setTimeout(() => {
        setVoiceStatus(null);
        setSpokenTranscript('');
      }, 2500);
      return;
    }

    // Universal navigation keywords that work everywhere
    if (lower.includes('menu') || lower.includes('home') || (lower === 'main')) {
      speechEngine.speak('Returning to Main Menu.');
      navigate('menu');
      setTimeout(() => { setVoiceStatus(null); setSpokenTranscript(''); }, 2000);
      return;
    } else if (lower.includes('logout') || lower.includes('sign out')) {
      await api.logout();
      speechEngine.speak('You have logged out.');
      navigate('welcome');
      setTimeout(() => { setVoiceStatus(null); setSpokenTranscript(''); }, 2000);
      return;
    }

    // -------------------------------------------------------------
    // CONTEXT-AWARE PRESS & HOLD BY CURRENT PAGE
    // -------------------------------------------------------------

    // 1. MAIN MENU PAGE
    // User can hold and say which page they want.
    // If user asks any actual question on Main Menu, AI smartly directs to “Ask Questions” page:
    // "Directing to Ask Questions page" -> searching -> then speaks answer!
    if (currentPage === 'menu') {
      if (lower.includes('visual') || lower.includes('camera') || lower.includes('see') || lower.includes('look')) {
        speechEngine.speak('Opening Visualization Page.');
        navigate('visualization');
      } else if (lower.includes('friend') || lower.includes('people') || lower.includes('request') || lower.includes('connect')) {
        speechEngine.speak('Opening Friends.');
        navigate('friends');
      } else if (lower.includes('social') || lower.includes('feed')) {
        speechEngine.speak('Opening Social Page.');
        navigate('feed');
      } else if (lower.includes('profile') || lower.includes('account')) {
        speechEngine.speak('Your profile is now open.');
        navigate('profile');
      } else if (lower.includes('album')) {
        speechEngine.speak('Opening Album.');
        navigate('album');
      } else if (lower.includes('create') && (lower.includes('post') || lower.includes('photo'))) {
        speechEngine.speak('Opening Create Post.');
        navigate('create-post');
      } else if (lower.includes('search') || lower.includes('find post')) {
        speechEngine.speak('Opening Post Search.');
        navigate('search-posts');
      } else if (lower.includes('language') || lower.includes('bahasa') || lower.includes('malay') || lower.includes('english')) {
        if (onLanguageToggle) onLanguageToggle();
      } else {
        // User asked a question on Main Menu -> Smart redirection flow
        speechEngine.speak('Directing to Ask Questions page.', () => {
          navigate('ask-questions');
          speechEngine.speak('Searching...');
          api.aiAsk(cleanCommand)
            .then((res) => {
              speechEngine.speak(res.spoken_text || res.answer);
            })
            .catch(() => {
              speechEngine.speak(`Here is the Ask Questions page for: ${cleanCommand}`);
            });
        });
      }
      setTimeout(() => {
        setVoiceStatus(null);
        setSpokenTranscript('');
      }, 2500);
      return;
    }

    // 2. VISUALIZATION PAGE
    // Press and hold allows user to ask questions about the photo they took
    if (currentPage === 'visualization' || currentPage === 'visual') {
      speechEngine.speak('Searching photo details...');
      try {
        const res = await api.aiContextualAsk(cleanCommand, 'default-session');
        speechEngine.speak(res.spoken_text || res.answer);
      } catch {
        speechEngine.speak(`Analyzing captured photo for: ${cleanCommand}`);
      }
      setTimeout(() => {
        setVoiceStatus(null);
        setSpokenTranscript('');
      }, 2500);
      return;
    }

    // 3. SOCIAL PAGE (FEED)
    // Press and hold allows user to ask questions within the social page
    if (currentPage === 'feed' || currentPage === 'social') {
      if (lower.includes('friend') || lower.includes('people') || lower.includes('request')) {
        speechEngine.speak('Opening Friends.');
        navigate('friends');
      } else if (lower.includes('album')) {
        speechEngine.speak('Opening Album.');
        navigate('album');
      } else if (lower.includes('search') || lower.includes('find')) {
        speechEngine.speak('Opening Post Search.');
        navigate('search-posts');
      } else if (lower.includes('create') || lower.includes('new post')) {
        speechEngine.speak('Opening Create Post.');
        navigate('create-post');
      } else {
        speechEngine.speak(`Checking social feed for: ${cleanCommand}`);
        try {
          const searchRes = await api.searchPosts(cleanCommand);
          if (searchRes.posts && searchRes.posts.length > 0) {
            speechEngine.speak(`Found ${searchRes.posts.length} matching posts on your feed.`);
          } else {
            speechEngine.speak('No matching posts found. Showing recent community posts.');
          }
        } catch {
          speechEngine.speak('Reading your social feed.');
        }
      }
      setTimeout(() => {
        setVoiceStatus(null);
        setSpokenTranscript('');
      }, 2500);
      return;
    }

    // 4. DEFAULT / OTHER PAGES (e.g. Ask Questions page or general)
    try {
      const res = await api.aiAsk(cleanCommand);
      speechEngine.speak(res.spoken_text || res.answer);
    } catch {
      speechEngine.speak(`Command received: ${cleanCommand}.`);
    }

    setTimeout(() => {
      setVoiceStatus(null);
      setSpokenTranscript('');
    }, 2500);
  };

  return (
    <div
      className="app-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* Active Screen Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Voice Assistant Modal */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(13, 59, 115, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.8)',
              marginBottom: '1.5rem',
              animation: 'pulse 1.2s infinite',
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>🎙️</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Listening...
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', maxWidth: '300px' }}>
            Hold screen and speak. Release finger when done.
          </p>
          {spokenTranscript && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.6rem 1.2rem',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '0.75rem',
                fontSize: '1.05rem',
                color: '#38bdf8',
                fontWeight: 700,
              }}
            >
              "{spokenTranscript}"
            </div>
          )}
        </div>
      )}

      {/* Status Pill */}
      {voiceStatus && !isRecording && (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0d3b73',
            color: '#fff',
            padding: '0.5rem 1.25rem',
            borderRadius: '999px',
            fontWeight: 800,
            fontSize: '0.9rem',
            zIndex: 9000,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {voiceStatus}
        </div>
      )}
    </div>
  );
};
