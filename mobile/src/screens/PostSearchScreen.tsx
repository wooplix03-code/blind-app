import React, { useState, useEffect } from 'react';
import { speechEngine } from '../services/speechEngine';
import { api } from '../services/api';

interface SearchProps {
  navigate: (page: string) => void;
}

export const PostSearchScreen: React.FC<SearchProps> = ({ navigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [status, setStatus] = useState('Hold anywhere and ask, or type below');

  useEffect(() => {
    speechEngine.speak('Which post do you want to search for? You can search by post number, author name, date, or caption words.');
  }, []);

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery || query;
    if (!q) return;

    setStatus(`Searching for "${q}"...`);
    try {
      const res = await api.searchPosts(q);
      setResults(res.results || []);
      speechEngine.playCue('success');
      speechEngine.speak(res.spoken_text);
    } catch (e) {
      console.error(e);
      speechEngine.speak('No matching posts found. Swipe left to return to the album.');
    }
  };

  return (
    <div
      className="screen-content-responsive"
      style={{
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--card)',
          borderBottom: '1.5px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.4rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            Post Search
          </h2>
          <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
            Swipe Left to return to Album
          </span>
        </div>

        <button
          onClick={() => { speechEngine.speak('Returning to Album.'); navigate('album'); }}
          className="wz-gesture-pill"
        >
          ← Album
        </button>
      </div>

      <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. post number 33, sunny beach, John"
            className="wz-input"
            style={{ flex: 1 }}
          />
          <button
            onClick={() => handleSearch(query)}
            style={{
              backgroundColor: '#16324F',
              border: 'none',
              borderRadius: '0.9rem',
              padding: '0.75rem 1.25rem',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            Search
          </button>
        </div>

        {/* Quick Voice Search Shortcuts */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setQuery('post number 33'); handleSearch('post number 33'); }}
            className="wz-gesture-pill"
          >
            "Post number 33"
          </button>
          <button
            onClick={() => { setQuery('beach'); handleSearch('beach'); }}
            className="wz-gesture-pill"
          >
            "Beach"
          </button>
          <button
            onClick={() => { setQuery('Central Park'); handleSearch('Central Park'); }}
            className="wz-gesture-pill"
          >
            "Central Park"
          </button>
        </div>

        <div style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>{status}</div>
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {results.map((p) => (
          <div
            key={p.id}
            onClick={() => speechEngine.speak(`${p.user?.name}'s post number ${p.post_number} found. Caption: ${p.caption}`)}
            className="craft-card"
            style={{
              flexShrink: 0,
              borderRadius: '1rem',
              padding: '1rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            {p.media_url && (
              <img
                src={p.media_url}
                alt={p.caption}
                style={{ width: 64, height: 64, borderRadius: '0.75rem', objectFit: 'cover' }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--wz-sage)' }}>#{p.post_number} • {p.user?.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{p.location_name}</span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500, color: 'var(--ink)' }}>{p.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
