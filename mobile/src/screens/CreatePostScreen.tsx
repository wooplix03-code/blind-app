import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, MapPin, Mic, RefreshCw, Search, Upload, Users } from 'lucide-react';
import { speechEngine } from '../services/speechEngine';
import { api } from '../services/api';
import { TopNavBar } from '../components/TopNavBar';

interface CreatePostProps {
  navigate: (page: string) => void;
  currentUser: any;
}

interface TaggablePerson {
  id: number;
  name: string;
  initial?: string;
}

export const CreatePostScreen: React.FC<CreatePostProps> = ({ navigate, currentUser }) => {
  const [step, setStep] = useState<number>(1);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('Central City Plaza');
  const [caption, setCaption] = useState<string>('A beautiful day sharing a moment on Wezey.');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 2: Friends / People to tag
  const [tagCandidates, setTagCandidates] = useState<TaggablePerson[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagQuery, setTagQuery] = useState<string>('');
  const [isListeningCaption, setIsListeningCaption] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    setIsCameraActive(true);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    speechEngine.speak('Step 1: Capture Photo. The camera is on. Tap the screen to take a photo, or choose a photo.');
    startCamera();

    // Preload friends first, then community members as tagging candidates
    Promise.all([
      api.getFriends().catch(() => ({ friends: [], suggestions: [] })),
      api.searchUsersForTag('').catch(() => ({ users: [] })),
    ]).then(([fr, sr]) => {
      const merged: TaggablePerson[] = [];
      const seen = new Set<number>();
      for (const u of [...(fr.friends || []), ...(sr.users || [])]) {
        if (u?.id && u.id !== currentUser?.id && !seen.has(u.id)) {
          seen.add(u.id);
          merged.push({
            id: u.id,
            name: u.name,
            initial: (u.name || 'U').charAt(0).toUpperCase(),
          });
        }
      }
      setTagCandidates(merged);
    });

    return () => {
      stopCamera();
    };
  }, [currentUser?.id]);

  const advanceToTagging = () => {
    speechEngine.playCue('success');
    speechEngine.speak('Step 2: Tag friends if anyone is with you, or tap Next Step.', () => {
      setStep(2);
    });
  };

  const handleCapture = () => {
    let capturedUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';

    if (videoRef.current && isCameraActive && videoRef.current.videoWidth > 0) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          capturedUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Canvas frame capture error:', err);
      }
    }

    setCapturedPhotoUrl(capturedUrl);
    stopCamera();
    speechEngine.playCue('shutter');
    speechEngine.speak('Photo captured.', advanceToTagging);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedPhotoUrl(reader.result);
        stopCamera();
        speechEngine.speak('Photo selected.', advanceToTagging);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCapturedPhotoUrl(null);
    setStep(1);
    startCamera();
    speechEngine.speak('Camera restarted. Tap to capture photo.');
  };

  const toggleTag = (person: TaggablePerson) => {
    setSelectedTagIds((prev) => {
      const exists = prev.includes(person.id);
      const next = exists ? prev.filter((id) => id !== person.id) : [...prev, person.id];
      speechEngine.speak(exists ? `Untagged ${person.name}.` : `Tagged ${person.name}.`);
      return next;
    });
  };

  const speakCaptionInput = async () => {
    speechEngine.stopSpeaking();
    await speechEngine.ensureMicAccess();
    speechEngine.speak('Say your post caption now.', () => {
      setIsListeningCaption(true);
      const started = speechEngine.startListening(
        (text, isFinal) => {
          setCaption(text);
          if (isFinal) {
            setIsListeningCaption(false);
            speechEngine.playCue('success');
          }
        },
        () => setIsListeningCaption(false)
      );
      if (!started) setIsListeningCaption(false);
    });
  };

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    speechEngine.playCue('success');
    speechEngine.speak('Publishing your post to Wezey...');

    try {
      const formData = new FormData();
      formData.append(
        'image',
        capturedPhotoUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
      );
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }
      if (locationName.trim()) {
        formData.append('location_name', locationName.trim());
      }
      selectedTagIds.forEach((id) => formData.append('tagged_user_ids[]', String(id)));
      formData.append('use_ai_caption', caption.trim() ? '0' : '1');

      await api.createPost(formData);
      speechEngine.speak('Your post has been created successfully.', () => {
        navigate('feed');
      });
    } catch (err: any) {
      console.error('Post creation error:', err);
      speechEngine.speak(err?.message || 'Could not publish post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCandidates = tagCandidates.filter((p) =>
    p.name.toLowerCase().includes(tagQuery.trim().toLowerCase())
  );

  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
      <TopNavBar
        title="Create Post"
        showBack={true}
        onBack={() => { stopCamera(); navigate('feed'); }}
        navigate={navigate}
        currentUser={currentUser}
      />

      <div style={{ flex: 1, minHeight: 0, padding: '1.35rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Step Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
            {[1, 2, 3, 4].map((num, i) => (
              <React.Fragment key={num}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: step >= num ? 'var(--wz-sage)' : 'var(--card-muted)',
                    color: step >= num ? '#ffffff' : 'var(--ink-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {step > num ? <Check size={16} /> : num}
                </div>
                {i < 3 && (
                  <div
                    style={{
                      width: 35,
                      height: 2,
                      backgroundColor: step > num ? 'var(--wz-sage)' : 'var(--border)',
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <h2
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--ink)',
              textAlign: 'center',
              marginBottom: '1rem',
            }}
          >
            {step === 1 && 'Step 1: Capture or Upload Photo'}
            {step === 2 && 'Step 2: Tag Friends'}
            {step === 3 && 'Step 3: Add Location'}
            {step === 4 && 'Step 4: Review Caption & Publish'}
          </h2>

          {/* Step 1: Capture */}
          {step === 1 && (
            <div
              onClick={!capturedPhotoUrl ? handleCapture : undefined}
              className="craft-card"
              style={{
                flex: 1,
                backgroundColor: 'var(--card)',
                borderRadius: '1.35rem',
                border: '2px dashed var(--border-strong)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: !capturedPhotoUrl ? 'pointer' : 'default',
                minHeight: '320px',
              }}
            >
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: '1.15rem', marginBottom: '1rem' }}
                />
              ) : (
                <div
                  style={{
                    width: 82,
                    height: 82,
                    border: '2.5px solid var(--wz-sage)',
                    borderRadius: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--wz-sage)',
                    marginBottom: '1rem',
                    backgroundColor: 'var(--wz-sage-bg)',
                  }}
                >
                  <Camera size={38} strokeWidth={2} />
                </div>
              )}

              <p style={{ fontSize: '1rem', color: 'var(--ink)', fontWeight: 600, maxWidth: '300px', lineHeight: 1.45, margin: '0.5rem 0 1.1rem' }}>
                Tap screen or Capture button to take a photo, or upload from device.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleCapture(); }}
                  className="wezey-primary-btn"
                  style={{ padding: '0.7rem 1.35rem' }}
                >
                  <Camera size={18} /> Capture Photo
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="wezey-secondary-btn"
                  style={{ padding: '0.7rem 1.2rem' }}
                >
                  <Upload size={16} /> Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Steps 2-4 Preview + Interactive Controls */}
          {step > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {capturedPhotoUrl && (
                <div className="craft-card" style={{ padding: '0.85rem', borderRadius: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  <img
                    src={capturedPhotoUrl}
                    alt="Captured"
                    style={{ width: 84, height: 84, borderRadius: '0.85rem', objectFit: 'cover', border: '1.5px solid var(--wz-sage)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--wz-sage)', fontSize: '0.95rem' }}>Photo ready</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                      {selectedTagIds.length} friend{selectedTagIds.length === 1 ? '' : 's'} tagged
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="wezey-secondary-btn"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    <RefreshCw size={14} /> Retake
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="craft-card" style={{ padding: '1rem 1.15rem', borderRadius: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '9999px', padding: '0.45rem 0.85rem' }}>
                    <Search size={16} color="var(--ink-soft)" />
                    <input
                      type="text"
                      value={tagQuery}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setTagQuery(e.target.value)}
                      placeholder="Filter friends to tag..."
                      style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent', color: 'var(--ink)', fontSize: '0.92rem' }}
                    />
                  </div>

                  {filteredCandidates.length === 0 ? (
                    <div style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} /> No people available to tag yet — you can continue to the next step.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                      {filteredCandidates.map((person) => {
                        const isSelected = selectedTagIds.includes(person.id);
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => toggleTag(person)}
                            style={{
                              padding: '0.45rem 0.9rem',
                              borderRadius: '9999px',
                              border: isSelected ? '1.5px solid var(--wz-sage)' : '1.5px solid var(--border)',
                              backgroundColor: isSelected ? 'var(--wz-sage-bg)' : 'var(--paper)',
                              color: isSelected ? 'var(--wz-sage)' : 'var(--ink)',
                              fontWeight: 700,
                              fontSize: '0.86rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected && <Check size={14} />}
                            {person.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="craft-card" style={{ padding: '1rem 1.15rem', borderRadius: '1.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>
                    <MapPin size={15} /> Location Name
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Where was this taken? (optional)"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '0.85rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--paper)',
                      color: 'var(--ink)',
                      fontSize: '0.98rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="craft-card" style={{ padding: '1rem 1.15rem', borderRadius: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-soft)' }}>Post Caption</span>
                    <button
                      type="button"
                      onClick={speakCaptionInput}
                      className="wezey-secondary-btn"
                      style={{
                        padding: '0.35rem 0.8rem',
                        fontSize: '0.8rem',
                        borderColor: isListeningCaption ? '#DC2626' : undefined,
                        color: isListeningCaption ? '#DC2626' : undefined,
                      }}
                    >
                      <Mic size={13} /> {isListeningCaption ? 'Listening...' : 'Speak'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={caption}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Describe this moment (or leave blank to auto-generate with AI)"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '0.9rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--paper)',
                      color: 'var(--ink)',
                      fontSize: '0.98rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.35rem' }}>
                {step > 2 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(2, s - 1))}
                    className="wezey-secondary-btn"
                    style={{ padding: '0.8rem 1.25rem' }}
                  >
                    ← Back
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={
                    step === 4
                      ? handleFinish
                      : () => {
                          const next = step + 1;
                          setStep(next);
                          if (next === 3) speechEngine.speak(`Step 3: Location set to ${locationName || 'unspecified'}.`);
                          if (next === 4) speechEngine.speak(`Step 4: Review caption: ${caption}`);
                        }
                  }
                  className="wezey-primary-btn"
                  style={{ flex: 1 }}
                >
                  {step === 4 ? (isSubmitting ? 'Publishing...' : 'Publish Post') : 'Next Step →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
