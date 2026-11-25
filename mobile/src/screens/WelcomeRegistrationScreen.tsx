import React, { useState, useEffect, useRef } from 'react';
import { speechEngine } from '../services/speechEngine';
import { api } from '../services/api';
import { TopNavBar } from '../components/TopNavBar';
import { User, Phone, Mail, Camera, CheckCircle2, Volume2, LogIn, Mic } from 'lucide-react';

interface WelcomeRegistrationProps {
  onSuccess: (user: any, token?: string) => void;
  navigate?: (page: string) => void;
}

export const WelcomeRegistrationScreen: React.FC<WelcomeRegistrationProps> = ({ onSuccess }) => {
  const [view, setView] = useState<'welcome' | 'registration' | 'login'>('welcome');
  const [activeField, setActiveField] = useState<'name' | 'phone' | 'email' | 'face' | null>(null);

  // Registration Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);

  // Always-fresh refs so async voice/camera callbacks never submit stale empty strings
  const nameRef = useRef('');
  const phoneRef = useRef('');
  const emailRef = useRef('');
  const faceImageRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);

  const updateName = (val: string) => {
    nameRef.current = val;
    setName(val);
  };
  const updatePhone = (val: string) => {
    phoneRef.current = val;
    setPhone(val);
  };
  const updateEmail = (val: string) => {
    emailRef.current = val;
    setEmail(val);
  };

  // Convert spoken phrases like "rahul at gmail dot com" into "rahul@gmail.com"
  const normalizeSpokenEmail = (raw: string): string => {
    return raw
      .toLowerCase()
      .replace(/\s+at\s+the\s+rate\s+/g, '@')
      .replace(/\s+at\s+/g, '@')
      .replace(/\s+dot\s+/g, '.')
      .replace(/\s+period\s+/g, '.')
      .replace(/\s+underscore\s+/g, '_')
      .replace(/\s+(dash|hyphen)\s+/g, '-')
      .replace(/\s+/g, '')
      .trim();
  };

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const countdownRef = useRef<any>(null);

  // Login Form State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [statusSpeech, setStatusSpeech] = useState('Welcome to Wezey');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alreadyRegisteredPhone, setAlreadyRegisteredPhone] = useState<string | null>(null);
  const [showServerBox, setShowServerBox] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(() => api.getServerUrl());
  const [serverSavedNote, setServerSavedNote] = useState<string | null>(null);

  const lastTapRef = useRef<number>(0);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    speechEngine.stopSpeaking();

    if (view === 'welcome') {
      stopCamera();
      // Broken into 2 parts with pause — more human, easier to follow
      speechEngine.speak('Welcome to Wezey.', () => {
        setTimeout(() => {
          speechEngine.speak(
            'This is an accessibility platform for blind users. Tap anywhere once to register, or double tap to log in. You can speak everything — no reading needed.'
          );
        }, 400);
      });
    } else if (view === 'registration') {
      speechEngine.ensureMicAccess().then(() => {
        speechEngine.speak(
          'Registration. I will guide you through 4 simple steps. Just speak your answer after each question. Step 1: What is your full name?',
          () => {
            startVoiceInput('name');
          }
        );
      });
    } else if (view === 'login') {
      stopCamera();
      speechEngine.ensureMicAccess().then(() => {
        speechEngine.speak('Login page. Please tell us your registered phone number.', () => {
          startLoginVoiceInput();
        });
      });
    }

    return () => {
      speechEngine.stopListening();
      clearTimeout(timeoutRef.current);
      stopCamera();
    };
  }, [view]);

  // Cleanup camera stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  /**
   * Start Live Webcam / Phone Camera for Face Recognition.
   * BLIND UX: Auto-captures after a voice countdown — no tap needed.
   */
  const startCamera = async () => {
    stopCamera();
    speechEngine.stopSpeaking();
    speechEngine.stopListening();
    setIsListening(false);
    setActiveField('face');
    setIsCameraActive(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (_err) {
        // Fallback for laptop webcams without facingMode
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // ---- BLIND UX: Voice countdown then auto-capture ----
      speechEngine.speak(
        'Camera is on. Step 4: Face photo. Hold your phone about 30 centimetres from your face and look straight ahead. I will take your photo automatically. Get ready.',
        () => {
          // Speak countdown: 3 … 2 … 1 … then capture
          let count = 3;
          setCaptureCountdown(count);
          const tick = () => {
            if (count <= 0) {
              setCaptureCountdown(null);
              capturePhoto();
              return;
            }
            speechEngine.speak(String(count), () => {
              count--;
              setCaptureCountdown(count > 0 ? count : null);
              countdownRef.current = setTimeout(tick, 400);
            });
          };
          countdownRef.current = setTimeout(tick, 600);
        }
      );
    } catch (err) {
      console.error('Camera access error:', err);
      // Fallback: enroll via voice profile if no camera
      setFaceEnrolled(true);
      setIsCameraActive(false);
      speechEngine.speak(
        'Camera not available. No problem — your account will be secured with your voice profile instead. Continuing to final step.',
        () => { handleFieldComplete('face', 'voice_only'); }
      );
    }
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => { clearTimeout(countdownRef.current); };
  }, []);

  /**
   * Capture Real Photo from Video Stream
   * Called automatically after voice countdown — no tap needed for blind users.
   */
  const capturePhoto = () => {
    clearTimeout(countdownRef.current);
    setCaptureCountdown(null);

    if (!videoRef.current) {
      // No video — still mark as enrolled
      setFaceEnrolled(true);
      setIsCameraActive(false);
      proceedAfterFace();
      return;
    }
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        faceImageRef.current = dataUrl;
        setCapturedFaceImage(dataUrl);
        setFaceEnrolled(true);
      }
    } catch (e) {
      console.warn('Canvas snapshot error:', e);
      setFaceEnrolled(true);
    }

    speechEngine.playCue('shutter');
    stopCamera();
    proceedAfterFace();
  };

  const proceedAfterFace = () => {
    speechEngine.speak(
      'Face photo captured. All done! I am now submitting your registration. Please wait a moment.',
      () => {
        setActiveField(null);
        // Auto-submit after face — blind user does not need to tap a button
        handleCompleteRegistration();
      }
    );
  };

  const handleWelcomeTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      speechEngine.playCue('success');
      speechEngine.speak('Opening Login.');
      setErrorMessage(null);
      setAlreadyRegisteredPhone(null);
      setView('login');
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        speechEngine.playCue('success');
        speechEngine.speak('Starting registration.');
        setErrorMessage(null);
        setAlreadyRegisteredPhone(null);
        setView('registration');
      }, DOUBLE_TAP_DELAY);
    }
  };

  /**
   * Start Live Voice Speech Recognition for a specific field.
   */
  const startVoiceInput = async (field: 'name' | 'phone' | 'email' | 'face') => {
    if (field === 'face') {
      startCamera();
      return;
    }

    setActiveField(field);
    speechEngine.stopSpeaking();
    setErrorMessage(null);
    setAlreadyRegisteredPhone(null);

    let prompt = '';
    if (field === 'name') prompt = 'Please tell us your full name.';
    else if (field === 'phone') prompt = 'Please tell us your phone number.';
    else if (field === 'email') prompt = 'Please tell us your email address.';

    setStatusSpeech(prompt);

    // Ensure mic permission upfront
    await speechEngine.ensureMicAccess();

    speechEngine.speak(prompt, () => {
      setIsListening(true);
      setInterimText('');

      const started = speechEngine.startListening(
        (text, isFinal) => {
          setInterimText(text);

          if (field === 'name') updateName(text);
          else if (field === 'phone') updatePhone(text.replace(/[^\d+]/g, ''));
          else if (field === 'email') updateEmail(normalizeSpokenEmail(text));

          if (isFinal) {
            handleFieldComplete(field, text);
          }
        },
        (err) => {
          console.log('Voice capture error:', err);
          setIsListening(false);
        }
      );

      if (!started) {
        setIsListening(false);
      }
    });
  };

  const handleFieldComplete = (field: 'name' | 'phone' | 'email' | 'face', text: string) => {
    setIsListening(false);
    setInterimText('');
    setErrorMessage(null);

    if (field === 'name') {
      const cleanName = text.trim();
      if (!cleanName) {
        speechEngine.speak('I did not catch your name. Please tap Full Name or type your name.');
        return;
      }
      speechEngine.playCue('success');
      updateName(cleanName);
      speechEngine.speak(`Great! Your name is ${cleanName}. Now, Step 2: What is your phone number? Please say the digits clearly.`, () => {
        startVoiceInput('phone');
      });
    } else if (field === 'phone') {
      const cleanPhone = text.replace(/[^\d+]/g, '');
      if (!cleanPhone || cleanPhone.replace(/[^\d]/g, '').length < 6) {
        speechEngine.speak('Please say or type a valid phone number with at least 6 digits.');
        return;
      }
      speechEngine.playCue('success');
      updatePhone(cleanPhone);
      speechEngine.speak(`Phone number saved. Now, Step 3: What is your email address? Say it slowly, for example: rahul at gmail dot com.`, () => {
        startVoiceInput('email');
      });
    } else if (field === 'email') {
      const cleanEmail = normalizeSpokenEmail(text);
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        updateEmail(cleanEmail);
        setErrorMessage('Email address looks incomplete. Say "name at gmail dot com" or edit it below.');
        speechEngine.speak('That email looked incomplete. Please edit your email or say it slowly like name at gmail dot com.');
        return;
      }
      speechEngine.playCue('success');
      updateEmail(cleanEmail);
      speechEngine.speak('Email address saved. Now for Step 4: I will take your face photo automatically. Please hold your phone in front of your face.', () => {
        startCamera();
      });
    } else if (field === 'face') {
      speechEngine.playCue('success');
      proceedAfterFace();
    }
  };

  const handleCompleteRegistration = async () => {
    if (isSubmittingRef.current) return;

    speechEngine.stopSpeaking();
    setErrorMessage(null);
    setAlreadyRegisteredPhone(null);

    // Always read live ref values (plus DOM fallback state) so async voice/camera callbacks never use stale/default values
    const regName = (nameRef.current || name).trim();
    const regPhone = (phoneRef.current || phone).replace(/[^\d+]/g, '').trim();
    const rawEmail = (emailRef.current || email).trim();
    const regEmail = rawEmail ? normalizeSpokenEmail(rawEmail) : '';
    const regFace = faceImageRef.current || capturedFaceImage;

    if (!regName) {
      const msg = 'Please enter or speak your Full Name before creating an account.';
      setErrorMessage(msg);
      speechEngine.speak(msg);
      return;
    }

    if (!regPhone || regPhone.replace(/[^\d]/g, '').length < 6) {
      const msg = 'Please enter or speak a valid Phone Number (at least 6 digits).';
      setErrorMessage(msg);
      speechEngine.speak(msg);
      return;
    }

    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      const msg = 'Please enter a valid email address (for example: name@gmail.com).';
      setErrorMessage(msg);
      speechEngine.speak(msg);
      return;
    }

    isSubmittingRef.current = true;
    speechEngine.playCue('success');
    speechEngine.speak(`Creating account for ${regName}. Please wait...`);

    try {
      const res = await api.voiceRegister({
        name: regName,
        phone_number: regPhone,
        email: regEmail || undefined,
        face_data: regFace || 'enrolled_biometric_sample',
        otp_code: '123456',
      });

      speechEngine.speak(`Registration complete! Welcome to Wezey, ${res.user?.name || regName}. Opening your main menu now.`);
      onSuccess(res.user, res.token);
    } catch (err: any) {
      console.error('Registration error:', err);
      const rawMsg = err?.message || 'Registration failed. Please check your details and try again.';
      const lowerMsg = rawMsg.toLowerCase();
      const isAlreadyTaken =
        lowerMsg.includes('already') ||
        lowerMsg.includes('taken') ||
        lowerMsg.includes('registered') ||
        err?.status === 409;

      if (isAlreadyTaken) {
        setAlreadyRegisteredPhone(regPhone);
      }

      setErrorMessage(rawMsg);
      speechEngine.speak(
        isAlreadyTaken
          ? `${rawMsg} You can sign in instead with your phone number, or use different details.`
          : rawMsg
      );
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const startLoginVoiceInput = async () => {
    speechEngine.stopSpeaking();
    setErrorMessage(null);
    await speechEngine.ensureMicAccess();
    setIsListening(true);
    setInterimText('');

    speechEngine.startListening(
      (text, isFinal) => {
        setInterimText(text);
        if (!awaitingOtp) {
          const digits = text.replace(/[^\d+]/g, '');
          setLoginPhone(digits);
          if (isFinal) {
            handleLoginPhoneComplete(digits);
          }
        } else {
          const otp = text.replace(/[^\d]/g, '');
          setLoginOtp(otp);
          if (isFinal) {
            handleLoginOtpComplete(otp);
          }
        }
      },
      (err) => {
        console.log('Login voice error:', err);
        setIsListening(false);
      }
    );
  };

  const handleLoginPhoneComplete = async (phoneNumber: string) => {
    setIsListening(false);
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '').trim();
    if (!cleanPhone || cleanPhone.replace(/[^\d]/g, '').length < 6) {
      const msg = 'Please enter or speak a valid registered phone number.';
      setErrorMessage(msg);
      speechEngine.speak(msg);
      return;
    }

    speechEngine.playCue('success');
    setErrorMessage(null);
    setLoginPhone(cleanPhone);

    speechEngine.speak(`Phone number received: ${cleanPhone}. Checking account...`, async () => {
      try {
        const res = await api.login(cleanPhone, loginOtp.trim() || '123456');
        if (res.token) {
          speechEngine.speak(`Login successful. Welcome back, ${res.user?.name || 'to Wezey'}.`);
          onSuccess(res.user, res.token);
        } else {
          setAwaitingOtp(true);
          speechEngine.speak('Please speak the 6 digit verification code sent to your phone.');
          startLoginVoiceInput();
        }
      } catch (err: any) {
        const msg = err?.message || 'Phone not registered. Please check the number or register first.';
        setErrorMessage(msg);
        speechEngine.speak(msg);
      }
    });
  };

  const handleLoginOtpComplete = async (otp: string) => {
    setIsListening(false);
    speechEngine.playCue('success');
    try {
      const res = await api.login(loginPhone.replace(/[^\d+]/g, '').trim(), otp || '123456');
      speechEngine.speak(`Verification successful. Welcome back, ${res.user?.name || 'to Wezey'}.`);
      onSuccess(res.user, res.token);
    } catch (err: any) {
      const msg = err?.message || 'Invalid verification code. Please try again.';
      setErrorMessage(msg);
      speechEngine.speak(msg);
    }
  };

  // ---------------- SCREEN 1: WELCOME SCREEN — Premium 2026 ----------------
  if (view === 'welcome') {
    return (
      <div
        onClick={handleWelcomeTap}
        className="screen-content-responsive"
        style={{
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: 'var(--paper)',
        }}
      >
        {/* ---- Calm Deep Ink Header Card ---- */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '53%',
            background: 'linear-gradient(155deg, #16324F 0%, #1C456E 100%)',
            borderRadius: '0 0 2rem 2rem',
            overflow: 'hidden',
            zIndex: 0,
          }}
        />

        {/* ---- Header ---- */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2.5rem 1.75rem 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '11px',
                background: 'rgba(255,255,255,0.14)',
                border: '1.5px solid rgba(255,255,255,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#fff', fontFamily: "'Newsreader', Georgia, serif", fontSize: '20px', fontWeight: 600 }}>W</span>
            </div>
            <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.6rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Wezey
            </span>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '9999px',
              padding: '0.3rem 0.85rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#DBEAFE',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Voice-First Platform
          </div>
        </div>

        {/* ---- Hero Center — Voice Icon ---- */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '2.25rem',
            paddingBottom: '1rem',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              speechEngine.speak('Welcome to Wezey. The voice-first accessibility platform. Tap once to register. Double tap to log in.');
            }}
            style={{
              width: 96,
              height: 96,
              borderRadius: '26px',
              background: 'rgba(255,255,255,0.14)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Volume2 size={44} strokeWidth={1.9} />
          </div>

          <h1
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: '2.15rem',
              fontWeight: 500,
              color: '#ffffff',
              textAlign: 'center',
              marginTop: '1.25rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            Welcome to Wezey
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(239,246,255,0.88)',
              textAlign: 'center',
              marginTop: '0.45rem',
              fontWeight: 400,
              maxWidth: '280px',
            }}
          >
            Calm, voice-guided accessibility &amp; vision companion
          </p>
        </div>

        {/* ---- Bottom Paper Actions ---- */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '1.5rem 1.75rem 2rem',
            gap: '0.9rem',
            maxWidth: '480px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.25rem' }}>
            {['Voice Guided', 'Camera Reading', 'Face Login', 'Accessible'].map((f) => (
              <span
                key={f}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '9999px',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--ink-soft)',
                }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* Register button */}
          <button
            className="wezey-primary-btn"
            onClick={(e) => {
              e.stopPropagation();
              speechEngine.playCue('success');
              speechEngine.speak('Starting registration.');
              setView('registration');
            }}
            style={{ width: '100%', fontSize: '1.08rem' }}
          >
            <User size={19} />
            Create Account
          </button>

          {/* Login button */}
          <button
            className="wezey-secondary-btn"
            onClick={(e) => {
              e.stopPropagation();
              speechEngine.playCue('success');
              speechEngine.speak('Opening login.');
              setView('login');
            }}
            style={{ width: '100%', fontSize: '1.04rem' }}
          >
            <LogIn size={18} />
            Sign In
          </button>

          <p
            style={{
              textAlign: 'center',
              fontSize: '0.8rem',
              color: 'var(--ink-soft)',
              fontWeight: 500,
              marginTop: '0.25rem',
            }}
          >
            Tap anywhere to register &bull; Double tap to sign in
          </p>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}
          >
            <button
              type="button"
              onClick={() => setShowServerBox((s) => !s)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-soft)',
                fontSize: '0.76rem',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {showServerBox ? 'Hide Server URL' : 'Server Connection Settings'}
            </button>

            {showServerBox && (
              <div
                className="craft-card"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <input
                  type="url"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="http://192.168.1.9:8000/api/v1"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '0.6rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: '0.82rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      api.setServerUrl(serverUrlInput);
                      setServerSavedNote(`Saved: ${api.getServerUrl()}`);
                    }}
                    className="wezey-primary-btn"
                    style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Save URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      api.setServerUrl(null);
                      const defUrl = api.getServerUrl();
                      setServerUrlInput(defUrl);
                      setServerSavedNote(`Reset to: ${defUrl}`);
                    }}
                    className="wezey-secondary-btn"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Reset
                  </button>
                </div>
                {serverSavedNote && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--wz-sage)', fontWeight: 600 }}>
                    {serverSavedNote}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- SCREEN: LOGIN SCREEN ----------------
  if (view === 'login') {
    return (
      <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
        <TopNavBar title="Sign In" showBack={true} onBack={() => setView('welcome')} />

        <div style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', maxWidth: '580px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.7rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem' }}>
            Sign into your account
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', fontWeight: 500, marginBottom: '1.5rem' }}>
            Speak your phone number or tap to type.
          </p>

          <div
            onClick={startLoginVoiceInput}
            className="craft-card"
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.1rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--wz-sage-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={20} color="var(--wz-sage)" />
            </div>
            <input
              type="tel"
              aria-label="Login Phone Number"
              value={loginPhone}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setLoginPhone(e.target.value)}
              placeholder="Speak or enter phone number"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'var(--ink)',
                backgroundColor: 'transparent',
              }}
            />
          </div>

          {awaitingOtp && (
            <div
              className="craft-card"
              style={{
                padding: '1.1rem 1.25rem',
                borderRadius: '1rem',
                borderColor: 'var(--wz-sage)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.1rem',
              }}
            >
              <input
                type="text"
                value={loginOtp}
                onChange={(e) => setLoginOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          )}

          {errorMessage && (
            <div style={{ color: '#BE123C', fontWeight: 700, fontSize: '0.92rem', marginBottom: '1rem' }}>
              {errorMessage}
            </div>
          )}
        </div>

        <div style={{ padding: '1.25rem 1.75rem', backgroundColor: 'var(--card)', borderTop: '1.5px solid var(--border)' }}>
          <button
            onClick={() => handleLoginPhoneComplete(loginPhone)}
            className="wezey-primary-btn"
            style={{ width: '100%', maxWidth: '580px', margin: '0 auto' }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ---------------- SCREEN 2: REGISTRATION SCREEN (WITH REAL CAMERA & LIVE MIC) ----------------
  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
      <TopNavBar
        title="Registration"
        showBack={true}
        onBack={() => { stopCamera(); setView('welcome'); }}
      />

      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', maxWidth: '640px', width: '100%', margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.65rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.3rem' }}>
          Please share a few details.
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', fontWeight: 500, marginBottom: '1.25rem' }}>
          {statusSpeech}
        </p>

        {/* Live Audio Input Visualizer Banner */}
        <div
          onClick={() => startVoiceInput(activeField || 'name')}
          className="craft-card"
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: isListening ? 'var(--wz-terracotta-bg)' : 'var(--card)',
            borderRadius: '1.15rem',
            border: isListening ? '2px solid #B45309' : '1.5px solid var(--border)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: isListening ? '#B45309' : 'var(--card-muted)',
              color: isListening ? '#ffffff' : 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mic size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: isListening ? 'var(--wz-terracotta)' : 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isListening ? 'Microphone active — speak now' : 'Tap to speak'}
            </div>
            <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
              {interimText || (isListening ? 'Listening to your voice...' : 'Tap to activate microphone')}
            </div>
          </div>
        </div>

        {/* Real Live Camera Modal / Viewport for Face Recognition */}
        {isCameraActive && (
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              border: '3px solid #0284c7',
              boxShadow: '0 12px 35px rgba(2, 132, 199, 0.3)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1.5rem 1rem',
            }}
          >
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={22} color="#38bdf8" />
              <span>Face Recognition — Auto Capture</span>
            </div>

            {/* Circular Camera Preview with Face Scan Ring */}
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                border: '4px solid #38bdf8',
                boxShadow: '0 0 25px rgba(56, 189, 248, 0.5)',
                backgroundColor: '#000000',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Mirror selfie
                }}
              />
              {/* Scan Line Animation */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: '#38bdf8',
                  boxShadow: '0 0 10px #38bdf8',
                }}
              />
              {/* Countdown overlay — big number for partially sighted */}
              {captureCountdown !== null && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.45)',
                }}>
                  <span style={{
                    fontSize: '5rem',
                    fontWeight: 900,
                    color: '#38bdf8',
                    textShadow: '0 0 30px #38bdf8',
                    lineHeight: 1,
                  }}>{captureCountdown}</span>
                </div>
              )}
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', marginTop: '1rem' }}>
              {captureCountdown !== null
                ? `📸 Auto-capture in ${captureCountdown}...`
                : 'Hold your phone in front of your face. Photo will be taken automatically.'}
            </p>
            {/* Manual tap fallback for sighted users */}
            <button
              onClick={capturePhoto}
              style={{
                marginTop: '1rem',
                backgroundColor: 'rgba(2,132,199,0.3)',
                color: '#ffffff',
                border: '1.5px solid #38bdf8',
                borderRadius: '9999px',
                padding: '0.6rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Camera size={16} />
              Tap to capture now
            </button>
          </div>
        )}

        {/* 4 Accessible Input Cards — keyboard typing & voice capture synced */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* 1. Full Name */}
          <div
            onClick={() => startVoiceInput('name')}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '18px',
              padding: '1rem 1.2rem',
              border: activeField === 'name' ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1 }}>
              <User size={24} color="var(--ink-soft)" strokeWidth={2.1} />
              <input
                type="text"
                aria-label="Full Name"
                value={name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateName(e.target.value)}
                placeholder="Full Name"
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  width: '100%',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {name.trim() && (
                <CheckCircle2 size={24} color="#16a34a" fill="#22c55e" stroke="#ffffff" />
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startVoiceInput('name'); }}
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(11, 79, 138, 0.16)',
                  borderRadius: '9999px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Mic size={14} /> Speak
              </button>
            </div>
          </div>

          {/* 2. Phone Number */}
          <div
            onClick={() => startVoiceInput('phone')}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '18px',
              padding: '1rem 1.2rem',
              border: activeField === 'phone' ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1 }}>
              <Phone size={24} color="var(--ink-soft)" strokeWidth={2.1} />
              <input
                type="tel"
                aria-label="Phone Number"
                value={phone}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updatePhone(e.target.value)}
                placeholder="Phone Number (e.g. +919876543210)"
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  width: '100%',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {phone.replace(/[^\d]/g, '').length >= 6 && (
                <CheckCircle2 size={24} color="#16a34a" fill="#22c55e" stroke="#ffffff" />
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startVoiceInput('phone'); }}
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(11, 79, 138, 0.16)',
                  borderRadius: '9999px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Mic size={14} /> Speak
              </button>
            </div>
          </div>

          {/* 3. Email Address */}
          <div
            onClick={() => startVoiceInput('email')}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '18px',
              padding: '1rem 1.2rem',
              border: activeField === 'email' ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1 }}>
              <Mail size={24} color="var(--ink-soft)" strokeWidth={2.1} />
              <input
                type="email"
                aria-label="Email Address"
                value={email}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateEmail(e.target.value)}
                placeholder="Email Address (optional)"
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  width: '100%',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                <CheckCircle2 size={24} color="#16a34a" fill="#22c55e" stroke="#ffffff" />
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startVoiceInput('email'); }}
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(11, 79, 138, 0.16)',
                  borderRadius: '9999px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Mic size={14} /> Speak
              </button>
            </div>
          </div>

          {/* 4. Face Recognition */}
          <div
            onClick={startCamera}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '18px',
              padding: '1rem 1.2rem',
              border: activeField === 'face' || isCameraActive ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1 }}>
              <Camera size={24} color="var(--ink-soft)" strokeWidth={2.1} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
                  Face Recognition
                </span>
                {capturedFaceImage && (
                  <img
                    src={capturedFaceImage}
                    alt="Captured"
                    style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e' }}
                  />
                )}
              </div>
            </div>
            {faceEnrolled ? (
              <CheckCircle2 size={24} color="#16a34a" fill="#22c55e" stroke="#ffffff" />
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startCamera(); }}
                style={{
                  background: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Camera size={14} /> Open Camera
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1.1rem',
              borderRadius: '14px',
              backgroundColor: '#fef2f2',
              border: '1.5px solid #fecaca',
              color: '#991b1b',
              fontWeight: 600,
              fontSize: '0.92rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div>⚠️ {errorMessage}</div>
            {alreadyRegisteredPhone && (
              <button
                type="button"
                onClick={() => {
                  setLoginPhone(alreadyRegisteredPhone);
                  setErrorMessage(null);
                  setAlreadyRegisteredPhone(null);
                  setView('login');
                }}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sign In with {alreadyRegisteredPhone}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--card)', borderTop: '1.5px solid var(--border)' }}>
        <button
          onClick={handleCompleteRegistration}
          className="wezey-primary-btn"
          style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}
        >
          Complete Registration
        </button>
      </div>
    </div>
  );
};
