import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Edit3,
  Heart,
  Images,
  MapPin,
  MessageCircle,
  Mic,
  Search,
  Send,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
} from 'lucide-react';
import { TopNavBar } from '../components/TopNavBar';
import { api } from '../services/api';
import { speechEngine } from '../services/speechEngine';

interface FeedProps {
  navigate: (page: string) => void;
  currentUser: any;
}

interface FeedComment {
  id: number;
  comment_text: string;
  formatted_date?: string;
  user?: {
    id: number;
    name: string;
  };
}

interface FeedPost {
  id: number;
  userId?: number;
  authorInitial: string;
  authorName: string;
  authorAvatar?: string | null;
  timeAgo: string;
  imageUrl: string | null;
  caption: string;
  locationName?: string | null;
  tags?: Array<{ id: number; user_id: number; tagged_name?: string; user?: { name: string } }>;
  likes: number;
  liked: boolean;
  commentsCount: number;
  comments: FeedComment[];
  friendStatus: 'self' | 'accepted' | 'pending_sent' | 'pending_received' | 'none';
  friendshipId?: number | null;
}

export const SocialFeedScreen: React.FC<FeedProps> = ({ navigate, currentUser }) => {
  const [scope, setScope] = useState<'all' | 'friends'>('all');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [incomingRequestsCount, setIncomingRequestsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePostIndex, setActivePostIndex] = useState<number>(0);

  const [busyFriendAuthorId, setBusyFriendAuthorId] = useState<number | null>(null);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<number | null>(null);
  const [listeningCommentPostId, setListeningCommentPostId] = useState<number | null>(null);

  const feedContainerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasSpokenIntroRef = useRef<boolean>(false);

  const readPost = useCallback((post?: FeedPost) => {
    if (!post) return;
    speechEngine.stopSpeaking();
    const tagNames = (post.tags || []).map((t) => t.tagged_name || t.user?.name).filter(Boolean);
    const withText = tagNames.length > 0 ? ` With ${tagNames.join(', ')}.` : '';
    speechEngine.speak(`${post.authorName} posted: ${post.caption}.${withText}`);
  }, []);

  const fetchFeed = useCallback(async (selectedScope: 'all' | 'friends', announce = false) => {
    setIsLoading(true);
    try {
      const res = await api.getFeed(1, selectedScope);
      setFriendsCount(res.friends_count ?? 0);
      setIncomingRequestsCount(res.incoming_requests_count ?? 0);

      if (Array.isArray(res.data)) {
        const mapped: FeedPost[] = res.data.map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          authorInitial: (p.user?.name || 'U').charAt(0).toUpperCase(),
          authorName: p.user?.name || 'Community Member',
          authorAvatar: p.user?.profile?.avatar_url || null,
          timeAgo: p.formatted_date || 'recently',
          imageUrl: p.media?.[0]?.file_url || p.media_url || null,
          caption: p.caption || p.ai_caption || 'A shared moment on Wezey.',
          locationName: p.location_name || null,
          tags: p.tags || [],
          likes: p.likes_count ?? 0,
          liked: Boolean(p.liked_by_me),
          commentsCount: p.comments_count ?? 0,
          comments: Array.isArray(p.comments) ? p.comments : [],
          friendStatus: p.friend_status || (p.user_id === currentUser?.id ? 'self' : 'none'),
          friendshipId: p.friendship_id || null,
        }));
        setPosts(mapped);
        setActivePostIndex(0);

        if (announce && mapped.length > 0) {
          const feedTitle = currentUser?.name ? `${currentUser.name}'s Social Feed` : 'Social Feed';
          const reqHint = (res.incoming_requests_count ?? 0) > 0
            ? ` You have ${res.incoming_requests_count} pending friend request${res.incoming_requests_count === 1 ? '' : 's'}.`
            : '';
          speechEngine.speak(`${feedTitle}.${reqHint} Tap any post to hear it read aloud.`, () => {
            readPost(mapped[0]);
          });
        } else if (announce && mapped.length === 0) {
          speechEngine.speak(
            selectedScope === 'friends'
              ? 'No posts from friends yet. Tap Find Friends to connect with people on Wezey.'
              : 'Social Feed is empty right now.'
          );
        }
      }
    } catch (err) {
      console.error('Feed fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUser?.name, readPost]);

  useEffect(() => {
    const shouldAnnounce = !hasSpokenIntroRef.current;
    hasSpokenIntroRef.current = true;
    fetchFeed(scope, shouldAnnounce);
  }, [scope, fetchFeed]);

  const handleScroll = () => {
    if (!feedContainerRef.current) return;
    const containerRect = feedContainerRef.current.getBoundingClientRect();

    posts.forEach((post, idx) => {
      const el = postRefs.current[idx];
      if (el) {
        const rect = el.getBoundingClientRect();
        const relTop = rect.top - containerRect.top;
        if (relTop <= 120 && relTop + rect.height > 120) {
          if (activePostIndex !== idx) {
            setActivePostIndex(idx);
            readPost(post);
          }
        }
      }
    });
  };

  const handleLike = async (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.likePost(postId);
      const isNowLiked = res.status === 'liked';
      speechEngine.playCue('success');
      speechEngine.speak(res.spoken_text || (isNowLiked ? 'Liked post.' : 'Unliked post.'));

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes: res.likes_count ?? p.likes, liked: isNowLiked }
            : p
        )
      );
    } catch (err) {
      console.error('Like API error:', err);
      speechEngine.speak('Could not update like right now.');
    }
  };

  const handleFriendQuickAction = async (post: FeedPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.userId || busyFriendAuthorId === post.userId) return;

    setBusyFriendAuthorId(post.userId);
    try {
      if (post.friendStatus === 'none') {
        const res = await api.sendFriendRequest(post.userId);
        const nextStatus = res.friendship_status || 'pending_sent';
        const nextFriendshipId = res.friendship?.id || null;
        speechEngine.playCue('success');
        speechEngine.speak(res.spoken_text || `Friend request sent to ${post.authorName}.`);
        setPosts((prev) =>
          prev.map((p) =>
            p.userId === post.userId
              ? { ...p, friendStatus: nextStatus, friendshipId: nextFriendshipId }
              : p
          )
        );
      } else if (post.friendStatus === 'pending_received' && post.friendshipId) {
        const res = await api.acceptFriendRequest(post.friendshipId);
        speechEngine.playCue('success');
        speechEngine.speak(res.spoken_text || `You are now friends with ${post.authorName}.`);
        setIncomingRequestsCount((c) => Math.max(0, c - 1));
        setFriendsCount((c) => c + 1);
        setPosts((prev) =>
          prev.map((p) =>
            p.userId === post.userId ? { ...p, friendStatus: 'accepted' } : p
          )
        );
      }
    } catch (err: any) {
      speechEngine.speak(err?.message || 'Unable to update friend status.');
    } finally {
      setBusyFriendAuthorId(null);
    }
  };

  const handleCommentSubmit = async (postId: number) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text || submittingCommentId === postId) return;

    setSubmittingCommentId(postId);
    try {
      const res = await api.commentPost(postId, text);
      speechEngine.playCue('success');
      speechEngine.speak(res.spoken_text || 'Comment posted successfully.');

      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                commentsCount: res.comments_count ?? p.commentsCount + 1,
                comments: res.comment ? [...p.comments, res.comment] : p.comments,
              }
            : p
        )
      );
    } catch (err: any) {
      speechEngine.speak(err?.message || 'Failed to post comment.');
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const startVoiceComment = async (postId: number) => {
    speechEngine.stopSpeaking();
    await speechEngine.ensureMicAccess();
    speechEngine.speak('Say your comment now.', () => {
      setListeningCommentPostId(postId);
      const started = speechEngine.startListening(
        (text, isFinal) => {
          setCommentInputs((prev) => ({ ...prev, [postId]: text }));
          if (isFinal) {
            setListeningCommentPostId(null);
            speechEngine.playCue('success');
          }
        },
        () => setListeningCommentPostId(null)
      );
      if (!started) setListeningCommentPostId(null);
    });
  };

  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
      <TopNavBar
        title="Social"
        showBack={true}
        onBack={() => navigate('menu')}
        navigate={navigate}
        currentUser={currentUser}
      />

      {/* Navigation, Scope Tabs & Create Post Header */}
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
          padding: '0.85rem 1.25rem 0.5rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Community vs Friends Scope Tabs */}
          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              borderRadius: '9999px',
              backgroundColor: 'var(--card-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setScope('all')}
              style={{
                border: 'none',
                borderRadius: '9999px',
                padding: '0.4rem 0.9rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: scope === 'all' ? 'var(--wz-primary)' : 'transparent',
                color: scope === 'all' ? '#ffffff' : 'var(--ink-soft)',
              }}
            >
              Community
            </button>
            <button
              type="button"
              onClick={() => setScope('friends')}
              style={{
                border: 'none',
                borderRadius: '9999px',
                padding: '0.4rem 0.9rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: scope === 'friends' ? 'var(--wz-primary)' : 'transparent',
                color: scope === 'friends' ? '#ffffff' : 'var(--ink-soft)',
              }}
            >
              Friends Only ({friendsCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('create-post')}
            style={{
              backgroundColor: 'var(--wz-sage)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.52rem 1.05rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
            }}
          >
            <Edit3 size={15} />
            Share Moment
          </button>
        </div>

        {/* Friends, Search & Album Quick Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Tap a post to listen • Tap a name to open album
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('friends')}
              className="wezey-secondary-btn"
              style={{
                padding: '0.42rem 0.85rem',
                fontSize: '0.83rem',
                borderColor: incomingRequestsCount > 0 ? 'var(--wz-sage)' : undefined,
              }}
            >
              <Users size={15} />
              Friends
              {incomingRequestsCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#BE123C',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '0 6px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    lineHeight: '1.35',
                  }}
                >
                  {incomingRequestsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('search-posts')}
              className="wezey-secondary-btn"
              style={{ padding: '0.42rem 0.85rem', fontSize: '0.83rem' }}
            >
              <Search size={14} />
              Search
            </button>
            <button
              type="button"
              onClick={() => navigate('album')}
              className="wezey-secondary-btn"
              style={{ padding: '0.42rem 0.85rem', fontSize: '0.83rem' }}
            >
              <Images size={14} />
              My Album
            </button>
          </div>
        </div>
      </div>

      {/* Feed Scroll Container */}
      <div
        ref={feedContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '0.6rem 1.25rem 2.25rem 1.25rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {isLoading ? (
            <div className="craft-card" style={{ padding: '1.75rem', borderRadius: '1.25rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="craft-card" style={{ padding: '2rem 1.5rem', borderRadius: '1.35rem', textAlign: 'center' }}>
              <Users size={36} color="var(--wz-sage)" style={{ marginBottom: '0.6rem' }} />
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.3rem', fontWeight: 600, color: 'var(--ink)' }}>
                {scope === 'friends' ? 'No posts from friends yet' : 'No community posts yet'}
              </div>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', margin: '0.4rem 0 1.15rem' }}>
                {scope === 'friends'
                  ? 'Add people as friends or switch to Community to see everyone’s moments.'
                  : 'Be the first to share a photo moment on Wezey!'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate('friends')}
                  className="wezey-primary-btn"
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                >
                  <UserPlus size={16} /> Find Friends
                </button>
                {scope === 'friends' && (
                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className="wezey-secondary-btn"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    View Community
                  </button>
                )}
              </div>
            </div>
          ) : (
            posts.map((post, idx) => {
              const isNarrating = activePostIndex === idx;
              const isCommentsOpen = openCommentsPostId === post.id;
              const tagNames = (post.tags || []).map((t) => t.tagged_name || t.user?.name).filter(Boolean);

              return (
                <div
                  key={post.id}
                  ref={(el) => { postRefs.current[idx] = el; }}
                  onClick={() => {
                    setActivePostIndex(idx);
                    readPost(post);
                  }}
                  className="craft-card"
                  style={{
                    flexShrink: 0,
                    borderRadius: '1.35rem',
                    overflow: 'hidden',
                    border: isNarrating ? '2px solid var(--wz-sage)' : '1.5px solid var(--border)',
                  }}
                >
                  {/* Post Header */}
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.userId) navigate(`album:${post.userId}`);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: post.userId ? 'pointer' : 'default' }}
                    >
                      {post.authorAvatar ? (
                        <img
                          src={post.authorAvatar}
                          alt={post.authorName}
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: '12px',
                            objectFit: 'cover',
                            border: '1px solid var(--border)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: '12px',
                            backgroundColor: 'var(--wz-sage-bg)',
                            color: 'var(--wz-sage)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            flexShrink: 0,
                          }}
                        >
                          {post.authorInitial}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
                          {post.authorName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--ink-soft)', fontWeight: 500 }}>
                          {post.timeAgo}
                          {post.locationName ? ` • ${post.locationName}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                      {isNarrating && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '0.28rem 0.65rem',
                            backgroundColor: 'var(--wz-sage-bg)',
                            borderRadius: '999px',
                            color: 'var(--wz-sage)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          <Volume2 size={13} />
                          <span>Reading</span>
                        </div>
                      )}

                      {post.userId && post.friendStatus === 'none' && (
                        <button
                          type="button"
                          disabled={busyFriendAuthorId === post.userId}
                          onClick={(e) => handleFriendQuickAction(post, e)}
                          style={{
                            backgroundColor: 'var(--wz-sage-bg)',
                            color: 'var(--wz-sage)',
                            border: '1px solid var(--border)',
                            borderRadius: '9999px',
                            padding: '0.3rem 0.72rem',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <UserPlus size={13} /> Add Friend
                        </button>
                      )}

                      {post.friendStatus === 'pending_sent' && (
                        <span
                          style={{
                            backgroundColor: 'var(--wz-terracotta-bg)',
                            color: 'var(--wz-terracotta)',
                            borderRadius: '9999px',
                            padding: '0.28rem 0.7rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} /> Requested
                        </span>
                      )}

                      {post.userId && post.friendStatus === 'pending_received' && (
                        <button
                          type="button"
                          disabled={busyFriendAuthorId === post.userId}
                          onClick={(e) => handleFriendQuickAction(post, e)}
                          style={{
                            backgroundColor: 'var(--wz-sage)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Check size={13} /> Accept
                        </button>
                      )}

                      {post.friendStatus === 'accepted' && (
                        <span
                          style={{
                            backgroundColor: 'var(--card-muted)',
                            color: 'var(--ink-soft)',
                            borderRadius: '9999px',
                            padding: '0.26rem 0.65rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <UserCheck size={12} /> Friend
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post Photo */}
                  {post.imageUrl && (
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '16 / 10',
                        maxHeight: '360px',
                        backgroundColor: 'var(--card-muted)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={post.imageUrl}
                        alt={post.caption}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}

                  {/* Caption & Tags */}
                  <div style={{ padding: '1rem 1.25rem 0.55rem 1.25rem' }}>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Newsreader', Georgia, serif",
                        fontSize: '1.18rem',
                        fontWeight: 500,
                        color: 'var(--ink)',
                        lineHeight: 1.5,
                      }}
                    >
                      {post.caption}
                    </p>

                    {(tagNames.length > 0 || post.locationName) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.6rem' }}>
                        {tagNames.length > 0 && (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--wz-plum)',
                              backgroundColor: 'var(--wz-plum-bg)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                            }}
                          >
                            With {tagNames.join(', ')}
                          </span>
                        )}
                        {post.locationName && (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--ink-soft)',
                              backgroundColor: 'var(--card-muted)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <MapPin size={12} /> {post.locationName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Engagement Bar */}
                  <div style={{ padding: '0.55rem 1.25rem 0.95rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={(e) => handleLike(post.id, e)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        color: '#BE123C',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      <Heart size={18} fill={post.liked ? '#BE123C' : 'none'} stroke="#BE123C" />
                      <span>{post.likes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextOpen = isCommentsOpen ? null : post.id;
                        setOpenCommentsPostId(nextOpen);
                        if (nextOpen !== null) {
                          const count = post.comments.length || post.commentsCount;
                          const latest = post.comments[post.comments.length - 1];
                          const speech = latest
                            ? `${count} comment${count === 1 ? '' : 's'}. Latest from ${latest.user?.name || 'User'}: ${latest.comment_text}`
                            : 'No comments yet. Write or speak a comment below.';
                          speechEngine.speak(speech);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        color: isCommentsOpen ? 'var(--wz-primary)' : 'var(--ink-soft)',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      <MessageCircle size={18} />
                      <span>{post.commentsCount}</span>
                    </button>
                  </div>

                  {/* Interactive Comments Panel */}
                  {isCommentsOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        borderTop: '1px solid var(--border)',
                        backgroundColor: 'var(--paper)',
                        padding: '0.9rem 1.25rem 1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.7rem',
                      }}
                    >
                      {post.comments.length === 0 ? (
                        <div style={{ fontSize: '0.86rem', color: 'var(--ink-soft)' }}>
                          No comments yet. Start the conversation!
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {post.comments.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => speechEngine.speak(`${c.user?.name || 'Member'} commented: ${c.comment_text}`)}
                              style={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '0.85rem',
                                padding: '0.55rem 0.85rem',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                <strong style={{ color: 'var(--ink)' }}>{c.user?.name || 'Member'}</strong>
                                <span style={{ color: 'var(--ink-soft)' }}>{c.formatted_date || ''}</span>
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--ink)', marginTop: '2px' }}>
                                {c.comment_text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          aria-label="Write a comment"
                          value={commentInputs[post.id] || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="Write or speak a comment..."
                          style={{
                            flex: 1,
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '9999px',
                            padding: '0.5rem 0.9rem',
                            fontSize: '0.9rem',
                            color: 'var(--ink)',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => startVoiceComment(post.id)}
                          aria-label="Speak comment"
                          className="wezey-secondary-btn"
                          style={{
                            padding: '0.45rem 0.7rem',
                            borderColor: listeningCommentPostId === post.id ? '#DC2626' : undefined,
                            color: listeningCommentPostId === post.id ? '#DC2626' : undefined,
                          }}
                        >
                          <Mic size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={submittingCommentId === post.id || !(commentInputs[post.id] || '').trim()}
                          onClick={() => handleCommentSubmit(post.id)}
                          aria-label="Post comment"
                          style={{
                            backgroundColor: 'var(--wz-sage)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: '0.48rem 0.9rem',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            opacity: (commentInputs[post.id] || '').trim() ? 1 : 0.55,
                          }}
                        >
                          <Send size={14} /> Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
