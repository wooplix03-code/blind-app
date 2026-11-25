import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Images,
  Mic,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { TopNavBar } from '../components/TopNavBar';
import { api } from '../services/api';
import { speechEngine } from '../services/speechEngine';

interface FriendsScreenProps {
  navigate: (page: string) => void;
  currentUser: any;
}

type TabKey = 'requests' | 'friends' | 'discover';

interface PersonCardData {
  id: number;
  name: string;
  initial: string;
  phone_number?: string;
  bio?: string | null;
  avatar_url?: string | null;
  posts_count: number;
  friendship_status: 'self' | 'accepted' | 'pending_sent' | 'pending_received' | 'none';
  friendship_id?: number | null;
  mutual_count: number;
  mutual_names: string[];
  spoken_summary: string;
  requested_at_human?: string;
  spoken_prompt?: string;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({ navigate, currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('discover');
  const [friends, setFriends] = useState<PersonCardData[]>([]);
  const [incoming, setIncoming] = useState<PersonCardData[]>([]);
  const [sent, setSent] = useState<PersonCardData[]>([]);
  const [suggestions, setSuggestions] = useState<PersonCardData[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PersonCardData[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isListeningSearch, setIsListeningSearch] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const loadFriendsData = useCallback(async (announce = false) => {
    setIsLoading(true);
    try {
      const res = await api.getFriends();
      const loadedFriends: PersonCardData[] = res.friends || [];
      const loadedIncoming: PersonCardData[] = res.incoming_requests || [];
      const loadedSent: PersonCardData[] = res.sent_requests || [];
      const loadedSuggestions: PersonCardData[] = res.suggestions || [];

      setFriends(loadedFriends);
      setIncoming(loadedIncoming);
      setSent(loadedSent);
      setSuggestions(loadedSuggestions);

      setActiveTab((prev) => {
        if (loadedIncoming.length > 0) return 'requests';
        if (prev === 'requests' && loadedIncoming.length === 0) {
          return loadedFriends.length > 0 ? 'friends' : 'discover';
        }
        if (prev === 'discover' && loadedFriends.length > 0) return 'friends';
        return prev;
      });

      if (announce && res.spoken_text) {
        speechEngine.speak(res.spoken_text);
      }
    } catch (err) {
      console.error('Friends fetch error:', err);
      setFeedbackBanner('Unable to load friends right now. Check connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriendsData(true);
  }, [loadFriendsData]);

  const runSearch = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.searchPeople(q);
      setSearchResults(res.users || []);
      if (res.spoken_text) {
        speechEngine.speak(res.spoken_text);
      }
    } catch (err) {
      console.error('People search error:', err);
      setFeedbackBanner('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleVoiceSearch = async () => {
    speechEngine.stopSpeaking();
    setFeedbackBanner(null);
    await speechEngine.ensureMicAccess();

    speechEngine.speak('Say the name or phone number of the person you want to find.', () => {
      setIsListeningSearch(true);
      const started = speechEngine.startListening(
        (text, isFinal) => {
          setSearchQuery(text);
          if (isFinal) {
            setIsListeningSearch(false);
            speechEngine.playCue('success');
            runSearch(text);
          }
        },
        () => setIsListeningSearch(false)
      );
      if (!started) setIsListeningSearch(false);
    });
  };

  const handleAction = async (
    userId: number,
    action: () => Promise<any>,
    fallbackSpeech: string
  ) => {
    setBusyUserId(userId);
    setFeedbackBanner(null);
    try {
      const res = await action();
      speechEngine.playCue('success');
      const msg = res?.message || fallbackSpeech;
      setFeedbackBanner(msg);
      speechEngine.speak(res?.spoken_text || msg);
      await loadFriendsData(false);
      if (searchQuery.trim()) {
        const sr = await api.searchPeople(searchQuery.trim());
        setSearchResults(sr.users || []);
      }
    } catch (err: any) {
      const msg = err?.message || 'Could not update friend status.';
      setFeedbackBanner(msg);
      speechEngine.speak(msg);
    } finally {
      setBusyUserId(null);
    }
  };

  const renderPersonCard = (person: PersonCardData, showRequestActions = false) => {
    const isBusy = busyUserId === person.id;

    return (
      <div
        key={`${person.id}-${person.friendship_status}-${showRequestActions ? 'req' : 'list'}`}
        onClick={() => speechEngine.speak(person.spoken_prompt || person.spoken_summary)}
        className="craft-card"
        style={{
          flexShrink: 0,
          borderRadius: '1.25rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.9rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1, minWidth: '210px' }}>
          {person.avatar_url ? (
            <img
              src={person.avatar_url}
              alt={person.name}
              style={{
                width: 50,
                height: 50,
                borderRadius: '14px',
                objectFit: 'cover',
                border: '1.5px solid var(--border)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '14px',
                backgroundColor: 'var(--wz-sage-bg)',
                color: 'var(--wz-sage)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Newsreader', Georgia, serif",
                fontSize: '1.35rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {person.initial}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>
              {person.name}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', fontWeight: 500, marginTop: '2px' }}>
              {person.mutual_count > 0
                ? `${person.mutual_count} mutual friend${person.mutual_count === 1 ? '' : 's'}${person.mutual_names[0] ? ` • ${person.mutual_names[0]}` : ''}`
                : `${person.posts_count} post${person.posts_count === 1 ? '' : 's'} on Wezey`}
              {person.requested_at_human ? ` • Sent ${person.requested_at_human}` : ''}
            </div>
            {person.bio && (
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: '4px' }}>
                {person.bio}
              </div>
            )}
          </div>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={() => navigate(`album:${person.id}`)}
            className="wezey-secondary-btn"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          >
            <Images size={14} /> Album
          </button>

          {person.friendship_status === 'none' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                handleAction(
                  person.id,
                  () => api.sendFriendRequest(person.id),
                  `Friend request sent to ${person.name}.`
                )
              }
              style={{
                backgroundColor: 'var(--wz-sage)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.5rem 0.95rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                opacity: isBusy ? 0.65 : 1,
              }}
            >
              <UserPlus size={15} /> Add Friend
            </button>
          )}

          {person.friendship_status === 'pending_received' && person.friendship_id && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  handleAction(
                    person.id,
                    () => api.acceptFriendRequest(person.friendship_id!),
                    `Accepted friend request from ${person.name}.`
                  )
                }
                style={{
                  backgroundColor: 'var(--wz-sage)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.5rem 0.95rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  opacity: isBusy ? 0.65 : 1,
                }}
              >
                <Check size={15} /> Accept
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  handleAction(
                    person.id,
                    () => api.declineFriendRequest(person.friendship_id!),
                    `Declined request from ${person.name}.`
                  )
                }
                className="wezey-secondary-btn"
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', color: '#BE123C' }}
              >
                <X size={14} /> Decline
              </button>
            </>
          )}

          {person.friendship_status === 'pending_sent' && (
            <>
              <span
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--wz-terracotta-bg)',
                  color: 'var(--wz-terracotta)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Clock size={14} /> Requested
              </span>
              {person.friendship_id && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    handleAction(
                      person.id,
                      () => api.cancelFriendRequest(person.friendship_id!),
                      `Cancelled friend request to ${person.name}.`
                    )
                  }
                  className="wezey-secondary-btn"
                  style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
              )}
            </>
          )}

          {person.friendship_status === 'accepted' && (
            <>
              <span
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--wz-sage-bg)',
                  color: 'var(--wz-sage)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <UserCheck size={14} /> Friends
              </span>
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  handleAction(
                    person.id,
                    () => api.removeFriend(person.id),
                    `Removed ${person.name} from your friends.`
                  )
                }
                className="wezey-secondary-btn"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', color: '#BE123C' }}
                aria-label={`Remove ${person.name}`}
              >
                <UserMinus size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
      <TopNavBar
        title="Friends"
        showBack={true}
        onBack={() => navigate('feed')}
        navigate={navigate}
        currentUser={currentUser}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.1rem 1.25rem 2rem' }}>
        <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Find Friends Search Bar */}
          <div className="craft-card" style={{ padding: '0.85rem 1rem', borderRadius: '1.15rem' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(searchQuery);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '180px' }}>
                <Search size={19} color="var(--ink-soft)" />
                <input
                  type="text"
                  aria-label="Search friends by name or phone"
                  value={searchQuery}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (!val.trim()) setSearchResults(null);
                  }}
                  placeholder="Find friends by name or phone..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.98rem',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    backgroundColor: 'transparent',
                  }}
                />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="wezey-secondary-btn"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={handleVoiceSearch}
                className="wezey-secondary-btn"
                style={{
                  padding: '0.48rem 0.85rem',
                  fontSize: '0.84rem',
                  borderColor: isListeningSearch ? '#DC2626' : undefined,
                  color: isListeningSearch ? '#DC2626' : undefined,
                }}
              >
                <Mic size={14} /> {isListeningSearch ? 'Listening...' : 'Speak'}
              </button>

              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--wz-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.52rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
          </div>

          {feedbackBanner && (
            <div
              role="status"
              aria-live="polite"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.95rem',
                backgroundColor: 'var(--wz-sage-bg)',
                border: '1px solid var(--border)',
                color: 'var(--wz-sage)',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {feedbackBanner}
            </div>
          )}

          {/* Search Results Mode */}
          {searchResults !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                  {isSearching ? 'Searching...' : `Search Results (${searchResults.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="wezey-secondary-btn"
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                >
                  Back to All
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div className="craft-card" style={{ padding: '1.5rem', borderRadius: '1.2rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
                  No users found matching &ldquo;{searchQuery}&rdquo;. Ask your friend to register on Wezey first!
                </div>
              ) : (
                searchResults.map((p) => renderPersonCard(p))
              )}
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '9999px',
                    border: '1.5px solid var(--border)',
                    backgroundColor: activeTab === 'requests' ? 'var(--wz-primary)' : 'var(--card)',
                    color: activeTab === 'requests' ? '#ffffff' : 'var(--ink)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Requests ({incoming.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('friends')}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '9999px',
                    border: '1.5px solid var(--border)',
                    backgroundColor: activeTab === 'friends' ? 'var(--wz-primary)' : 'var(--card)',
                    color: activeTab === 'friends' ? '#ffffff' : 'var(--ink)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  My Friends ({friends.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '9999px',
                    border: '1.5px solid var(--border)',
                    backgroundColor: activeTab === 'discover' ? 'var(--wz-primary)' : 'var(--card)',
                    color: activeTab === 'discover' ? '#ffffff' : 'var(--ink)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Discover People ({suggestions.length})
                </button>
              </div>

              {isLoading ? (
                <div className="craft-card" style={{ padding: '1.75rem', borderRadius: '1.25rem', textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 600 }}>
                  Loading your Wezey circle...
                </div>
              ) : (
                <>
                  {activeTab === 'requests' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.2rem', color: 'var(--ink)', margin: 0 }}>
                        Incoming Friend Requests
                      </h3>
                      {incoming.length === 0 ? (
                        <div className="craft-card" style={{ padding: '1.25rem', borderRadius: '1.15rem', color: 'var(--ink-soft)' }}>
                          No pending friend requests right now.
                        </div>
                      ) : (
                        incoming.map((p) => renderPersonCard(p, true))
                      )}

                      {sent.length > 0 && (
                        <>
                          <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.15rem', color: 'var(--ink)', margin: '0.75rem 0 0 0' }}>
                            Sent Requests ({sent.length})
                          </h3>
                          {sent.map((p) => renderPersonCard(p))}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'friends' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {friends.length === 0 ? (
                        <div className="craft-card" style={{ padding: '1.5rem', borderRadius: '1.25rem', textAlign: 'center' }}>
                          <Users size={34} color="var(--wz-sage)" style={{ marginBottom: '0.5rem' }} />
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>
                            You have not connected with friends yet
                          </div>
                          <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', margin: '0.35rem 0 1rem' }}>
                            Open Discover People or search by name/phone to send a friend request.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('discover')}
                            className="wezey-primary-btn"
                            style={{ margin: '0 auto', padding: '0.65rem 1.4rem', fontSize: '0.92rem' }}
                          >
                            Discover People
                          </button>
                        </div>
                      ) : (
                        friends.map((p) => renderPersonCard(p))
                      )}
                    </div>
                  )}

                  {activeTab === 'discover' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {suggestions.length === 0 ? (
                        <div className="craft-card" style={{ padding: '1.5rem', borderRadius: '1.25rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
                          You have already connected with or requested everyone currently on Wezey!
                        </div>
                      ) : (
                        suggestions.map((p) => renderPersonCard(p))
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
