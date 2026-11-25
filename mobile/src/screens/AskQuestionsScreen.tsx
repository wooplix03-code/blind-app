import React, { useState, useEffect, useRef } from 'react';
import { speechEngine } from '../services/speechEngine';
import { api } from '../services/api';
import { TopNavBar } from '../components/TopNavBar';
import { Mic, Newspaper, Sun, Car, Volume2, Sparkles, Key, Send, Bot, User } from 'lucide-react';

interface AskProps {
  navigate: (page: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  displayContent: string;
  timestamp: string;
}

export const AskQuestionsScreen: React.FC<AskProps> = ({ navigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      displayContent: 'Hello! I am your Wezey Voice Assistant. Ask me anything, or tap one of the top searches below for instant layman summaries.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>('');
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    speechEngine.speak(
      'Ask Questions Assistant. Top queries are Breaking News, Current Weather, and Travel Duration. Hold anywhere on the microphone or screen to speak.'
    );

    api.getOpenAiStatus()
      .then((res) => {
        if (res.configured) setOpenAiConfigured(true);
      })
      .catch((e) => console.log('OpenAI status check error:', e));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSearching]);

  const handleSaveKey = async () => {
    if (!inputKey.trim()) return;
    try {
      await api.saveOpenAiKey(inputKey.trim());
      setOpenAiConfigured(true);
      setKeySavedMessage('OpenAI API Key saved successfully! Live GPT-4o-mini is now active.');
      speechEngine.speak('OpenAI API Key saved. GPT-4o-mini is active.');
      setTimeout(() => {
        setShowKeyModal(false);
        setKeySavedMessage(null);
      }, 2000);
    } catch (e) {
      setKeySavedMessage('Failed to save key. Please check and try again.');
    }
  };

  /**
   * Hidden System Query Engine:
   * Wraps queries into simple layman prompt formatting with system date & time,
   * while showing only the clean question in the chat bubble!
   */
  const executeQuery = async (displayLabel: string, rawHiddenQuery: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message bubble
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      displayContent: displayLabel,
      timestamp: timeNow,
    };
    setMessages((prev) => [...prev, userMsg]);

    speechEngine.playCue('mic_end');
    speechEngine.speak('Searching...');
    setIsSearching(true);

    try {
      const res = await api.aiAsk(rawHiddenQuery);
      const answerText = res.spoken_text || res.answer || 'Here is the summary of your request.';

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        displayContent: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      speechEngine.playCue('success');
      speechEngine.speak(answerText);
    } catch (err) {
      const fallbackText = 'I received your request. Here are the simplified details for your query.';
      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        displayContent: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      speechEngine.speak(fallbackText);
    } finally {
      setIsSearching(false);
    }
  };

  // Preset Top 3 Queries with Hidden Prompts
  const handleTopQuery = (type: 'news' | 'weather' | 'travel') => {
    const today = new Date().toLocaleDateString('en-MY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeNow = new Date().toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (type === 'news') {
      const hiddenPrompt = `Can you tell me what are the top 5 breaking news in malaysia now. please simply and summarize the content, with layman term for easy understanding. Please just share the news directly and nothing else. The date today is today's date - [Malaysia], [${today}], [${timeNow}]`;
      executeQuery('📰 Top 5 Breaking News in Malaysia', hiddenPrompt);
    } else if (type === 'weather') {
      const hiddenPrompt = `Can you tell me what is the current weather in Kuala Lumpur now. The date today is ${today} and the time is ${timeNow} - [Kuala Lumpur] [${today}] [${timeNow}]. Please simply and summarize the content, with layman term for easy understanding. Share the weather directly and nothing else.`;
      executeQuery('⛅ Current Weather in Kuala Lumpur', hiddenPrompt);
    } else if (type === 'travel') {
      const hiddenPrompt = `What is the duration from Penang to 19, jalan cempaka, SD12/B, Bandar Sri Damansara. Show several modes of travelling (by car, by bus, by walking and by flight) and its duration, and nothing else. Summarize in layman term for easy understanding.`;
      executeQuery('🚗 Duration: Penang to Bandar Sri Damansara', hiddenPrompt);
    }
  };

  const handleMicMouseDown = () => {
    setIsHolding(true);
    speechEngine.playCue('mic_start');
    speechEngine.speak('How can I help you?', () => {
      speechEngine.startListening((text, isFinal) => {
        if (isFinal) {
          setIsHolding(false);
          const today = new Date().toLocaleDateString();
          const timeNow = new Date().toLocaleTimeString();
          const hiddenPrompt = `User Question: "${text}". Today is ${today}, ${timeNow}. Please simplify and summarize the content, with layman term for easy understanding. Please just share the answer directly and nothing else for a blind listener.`;
          executeQuery(text, hiddenPrompt);
        }
      });
    });
  };

  const handleMicMouseUp = () => {
    if (isHolding) {
      setIsHolding(false);
      speechEngine.stopListening();
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const q = textInput.trim();
    setTextInput('');
    const today = new Date().toLocaleDateString();
    const timeNow = new Date().toLocaleTimeString();
    const hiddenPrompt = `User Question: "${q}". Today is ${today}, ${timeNow}. Please simplify and summarize the content, with layman term for easy understanding. Please just share the answer directly and nothing else for a blind listener.`;
    executeQuery(q, hiddenPrompt);
  };

  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <TopNavBar
        title="Ask Anything"
        showBack={true}
        onBack={() => navigate('menu')}
      />

      {/* OpenAI Status + Quick Suggestions Header */}
      <div style={{ padding: '0.85rem 1.25rem 0', backgroundColor: 'var(--card)', borderBottom: '1.5px solid var(--border)' }}>
        <div
          onClick={() => setShowKeyModal(!showKeyModal)}
          style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '12px',
            backgroundColor: openAiConfigured ? 'var(--wz-sage-bg)' : 'var(--wz-terracotta-bg)',
            border: '1.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.65rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={15} color={openAiConfigured ? 'var(--wz-sage)' : 'var(--wz-terracotta)'} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)' }}>
              {openAiConfigured ? 'OpenAI GPT-4o-mini Active' : 'Configure OpenAI Key for Live AI'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--ink-soft)' }}>
            <Key size={13} />
            <span>Settings</span>
          </div>
        </div>

        {showKeyModal && (
          <div
            style={{
              backgroundColor: 'var(--paper)',
              borderRadius: '12px',
              border: '1.5px solid var(--border-strong)',
              padding: '0.9rem',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)' }}>
                OpenAI API Key
              </span>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{ background: 'transparent', border: 'none', fontWeight: 700, color: 'var(--ink-soft)' }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="sk-proj-..."
                className="wz-input"
                style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
              />
              <button
                onClick={handleSaveKey}
                style={{
                  backgroundColor: '#16324F',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
            {keySavedMessage && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--wz-sage)' }}>
                {keySavedMessage}
              </div>
            )}
          </div>
        )}

        {/* Everyday Topics Pills */}
        <div style={{ paddingBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.45rem' }}>
            Everyday Questions
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            <button onClick={() => handleTopQuery('news')} className="wz-gesture-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Newspaper size={14} color="var(--wz-primary)" />
              <span>Breaking News Malaysia</span>
            </button>

            <button onClick={() => handleTopQuery('weather')} className="wz-gesture-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Sun size={14} color="var(--wz-terracotta)" />
              <span>Current Weather</span>
            </button>

            <button onClick={() => handleTopQuery('travel')} className="wz-gesture-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Car size={14} color="var(--wz-sage)" />
              <span>Travel Duration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calm Chat Thread */}
      <main
        style={{
          flex: 1,
          padding: '1.25rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          backgroundColor: 'var(--paper)',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: '8px',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '12px',
                    backgroundColor: 'var(--wz-terracotta-bg)',
                    color: 'var(--wz-terracotta)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} />
                </div>
              )}

              <div
                style={{
                  maxWidth: '78%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: '4px',
                }}
              >
                <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  {msg.displayContent}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingInline: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', fontWeight: 500 }}>
                    {msg.timestamp}
                  </span>
                  {!isUser && (
                    <button
                      onClick={() => {
                        speechEngine.playCue('success');
                        speechEngine.speak(msg.displayContent);
                      }}
                      title="Listen again"
                      style={{
                        background: 'var(--wz-terracotta-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '9999px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        color: 'var(--wz-terracotta)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Volume2 size={11} />
                      <span>Listen</span>
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '12px',
                    backgroundColor: 'var(--card-muted)',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={17} />
                </div>
              )}
            </div>
          );
        })}

        {isSearching && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '12px',
                backgroundColor: 'var(--wz-terracotta-bg)',
                color: 'var(--wz-terracotta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bot size={18} />
            </div>
            <div className="chat-bubble-ai">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Voice Hold & Spoken Input Bar */}
      <footer
        style={{
          padding: '0.9rem 1.25rem',
          backgroundColor: 'var(--card)',
          borderTop: '1.5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <form onSubmit={handleSendText} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your question here..."
            className="wz-input"
            style={{ flex: 1, padding: '0.72rem 1rem', borderRadius: '14px', fontSize: '0.95rem' }}
          />
          <button
            type="submit"
            aria-label="Send question"
            style={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              backgroundColor: '#B45309',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Send size={18} />
          </button>
        </form>

        <div
          onMouseDown={handleMicMouseDown}
          onMouseUp={handleMicMouseUp}
          onTouchStart={handleMicMouseDown}
          onTouchEnd={handleMicMouseUp}
          style={{
            width: '100%',
            padding: '0.9rem',
            borderRadius: '14px',
            backgroundColor: isHolding ? '#B91C1C' : '#B45309',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            userSelect: 'none',
          }}
        >
          {isHolding ? (
            <>
              <div className="waveform">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="wave-bar" style={{ background: '#fff', animationDelay: `${(i-1)*0.1}s` }} />
                ))}
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Listening… release when done</span>
            </>
          ) : (
            <>
              <Mic size={20} color="#ffffff" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Hold to Speak</span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
