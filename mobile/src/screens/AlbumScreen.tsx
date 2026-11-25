import React, { useCallback, useEffect, useState } from 'react';
import { Camera, Check, Clock, Heart, MessageCircle, UserCheck, UserPlus, Users } from 'lucide-react';
import { speechEngine } from '../services/speechEngine';
import { TopNavBar } from '../components/TopNavBar';
import { api } from '../services/api';

interface AlbumProps {
  navigate: (page: string) => void;
  currentUser: any;
  viewingUserId?: number;
}

export const AlbumScreen: React.FC<AlbumProps> = ({ navigate, currentUser, viewingUserId }) => {
  const [owner, setOwner] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friendStatus, setFriendStatus] = useState<string>('self');
  const [friendshipId, setFriendshipId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<boolean>(false);

  const isOwnAlbum = !viewingUserId || viewingUserId === currentUser?.id;

  const loadAlbum = useCallback(async (announce = false) => {
    setIsLoading(true);
    try {
      const res = await api.getAlbum(viewingUserId);
      setOwner(res.user || (isOwnAlbum ? currentUser : null));
      setPosts(res.posts || []);
      setFriendStatus(res.friend_status || (isOwnAlbum ? 'self' : 'none'));
      setFriendshipId(res.friendship_id || null);

      if (announce && res.spoken_text) {
        speechEngine.speak(res.spoken_text);
      }
    } catch (err) {
      console.error('Album load error:', err);
      const fallbackName = isOwnAlbum && currentUser?.name ? `${currentUser.name}'s Album` : 'Album';
      if (announce) {
        speechEngine.speak(`${fallbackName}. Could not load posts right now.`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [viewingUserId, isOwnAlbum, currentUser]);

  useEffect(() => {
    loadAlbum(true);
  }, [loadAlbum]);

  const ownerName = owner?.name || (isOwnAlbum ? currentUser?.name : null);
  const albumTitle = ownerName ? `${ownerName}'s Album` : 'My Album';

  const handlePhotoClick = (p: any) => {
    speechEngine.playCue('success');
    const caption = p.caption || p.ai_caption || 'Photo post';
    speechEngine.speak(`${caption}. ${p.likes_count ?? 0} likes, ${p.comments_count ?? 0} comments.`);
  };

  const handleFriendAction = async () => {
    if (!owner?.id || busyAction) return;
    setBusyAction(true);
    try {
      if (friendStatus === 'none') {
        const res = await api.sendFriendRequest(owner.id);
        setFriendStatus(res.friendship_status || 'pending_sent');
        setFriendshipId(res.friendship?.id || null);
        speechEngine.playCue('success');
        speechEngine.speak(res.spoken_text || `Friend request sent to ${owner.name}.`);
      } else if (friendStatus === 'pending_received' && friendshipId) {
        const res = await api.acceptFriendRequest(friendshipId);
        setFriendStatus('accepted');
        speechEngine.playCue('success');
        speechEngine.speak(res.spoken_text || `You are now friends with ${owner.name}.`);
      }
    } catch (err: any) {
      speechEngine.speak(err?.message || 'Unable to update friend request.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
      <TopNavBar
        title={albumTitle}
        showBack={true}
        onBack={() => navigate('feed')}
        navigate={navigate}
        currentUser={currentUser}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.15rem 1.25rem 2rem' }}>
        <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Author Summary Card */}
          <div
            className="craft-card"
            style={{
              padding: '1.15rem 1.25rem',
              borderRadius: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              {owner?.profile?.avatar_url ? (
                <img
                  src={owner.profile.avatar_url}
                  alt={ownerName || 'User'}
                  style={{ width: 56, height: 56, borderRadius: '16px', objectFit: 'cover', border: '1.5px solid var(--border)' }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '16px',
                    backgroundColor: 'var(--wz-sage-bg)',
                    color: 'var(--wz-sage)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontSize: '1.5rem',
                    fontWeight: 600,
                  }}
                >
                  {(ownerName?.trim()?.[0] || 'U').toUpperCase()}
                </div>
              )}

              <div>
                <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.35rem', color: 'var(--ink)', margin: 0 }}>
                  {ownerName || 'Wezey User'}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  {posts.length} photo post{posts.length === 1 ? '' : 's'}
                  {owner?.profile?.bio ? ` • ${owner.profile.bio}` : ''}
                </div>
              </div>
            </div>

            {!isOwnAlbum && owner?.id && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {friendStatus === 'none' && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleFriendAction}
                    style={{
                      backgroundColor: 'var(--wz-sage)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <UserPlus size={15} /> Add Friend
                  </button>
                )}
                {friendStatus === 'pending_sent' && (
                  <span
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--wz-terracotta-bg)',
                      color: 'var(--wz-terracotta)',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Clock size={14} /> Requested
                  </span>
                )}
                {friendStatus === 'pending_received' && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleFriendAction}
                    style={{
                      backgroundColor: 'var(--wz-sage)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={15} /> Accept Request
                  </button>
                )}
                {friendStatus === 'accepted' && (
                  <span
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--wz-sage-bg)',
                      color: 'var(--wz-sage)',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <UserCheck size={14} /> Friends
                  </span>
                )}
              </div>
            )}

            {isOwnAlbum && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => navigate('friends')}
                  className="wezey-secondary-btn"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.84rem' }}
                >
                  <Users size={15} /> Friends
                </button>
                <button
                  type="button"
                  onClick={() => navigate('create-post')}
                  style={{
                    backgroundColor: 'var(--wz-sage)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.48rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={15} /> New Post
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="craft-card" style={{ padding: '1.75rem', borderRadius: '1.25rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
              Loading album...
            </div>
          ) : posts.length === 0 ? (
            <div className="craft-card" style={{ padding: '2rem', borderRadius: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
                No photo posts in this album yet
              </div>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                {isOwnAlbum ? 'Capture a moment to build your personal Wezey photo album.' : 'Check back soon or connect with more friends.'}
              </p>
              {isOwnAlbum && (
                <button
                  type="button"
                  onClick={() => navigate('create-post')}
                  className="wezey-primary-btn"
                  style={{ margin: '0 auto', padding: '0.65rem 1.4rem', fontSize: '0.92rem' }}
                >
                  Share First Photo
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {posts.map((p) => {
                const imgSrc = p.media?.[0]?.file_url || p.media_url;
                const cap = p.caption || p.ai_caption || 'Photo post';
                return (
                  <div
                    key={p.id}
                    onClick={() => handlePhotoClick(p)}
                    className="craft-card"
                    style={{
                      borderRadius: '1.15rem',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {imgSrc && (
                      <div style={{ width: '100%', aspectRatio: '4 / 3', backgroundColor: 'var(--card-muted)', overflow: 'hidden' }}>
                        <img
                          src={imgSrc}
                          alt={cap}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '0.85rem' }}>
                      <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>
                        {cap}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.55rem', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Heart size={13} stroke="#BE123C" /> {p.likes_count ?? 0}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MessageCircle size={13} /> {p.comments_count ?? 0}
                        </span>
                        <span>{p.formatted_date || ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
