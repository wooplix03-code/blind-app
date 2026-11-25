import React, { useEffect, useState } from 'react';
import { speechEngine } from '../services/speechEngine';
import { api } from '../services/api';
import { TopNavBar } from '../components/TopNavBar';
import { User, Users, Phone, Mail, LogOut, Globe } from 'lucide-react';

interface ProfileProps {
  navigate: (page: string) => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

export const UserProfileScreen: React.FC<ProfileProps> = ({ navigate, currentUser, setCurrentUser }) => {
  const [profileData, setProfileData] = useState<any>(currentUser || {});

  useEffect(() => {
    api.getProfile()
      .then((res) => {
        if (res.user || res.id) {
          const u = res.user || res;
          setProfileData(u);
          setCurrentUser(u);
        }
      })
      .catch((e) => console.log('Profile fetch error:', e));

    const uName = currentUser?.name || 'User';
    const text = `Profile of ${uName}. Phone number: ${currentUser?.phone_number || 'not set'}. Email: ${currentUser?.email || 'not set'}. Swipe left to return to the main menu.`;
    speechEngine.speak(text);
  }, []);

  const handleLogout = () => {
    speechEngine.playCue('success');
    speechEngine.speak('Logging out...', () => {
      navigate('logout');
    });
  };

  return (
    <div className="screen-content-responsive" style={{ backgroundColor: 'var(--paper)' }}>
      <TopNavBar
        title="My Profile"
        showBack={true}
        onBack={() => navigate('menu')}
      />

      <div style={{ flex: 1, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            padding: 4,
            border: '3px solid var(--wz-sage)',
            marginBottom: '1rem',
            overflow: 'hidden',
            backgroundColor: 'var(--card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {profileData?.profile?.avatar_url ? (
            <img
              src={profileData.profile.avatar_url}
              alt={profileData.name || 'User'}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: 'var(--wz-sage-bg)',
                color: 'var(--wz-sage)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Newsreader', Georgia, serif",
                fontSize: '2.75rem',
                fontWeight: 600,
              }}
            >
              {(profileData?.name?.trim()?.[0] || 'U').toUpperCase()}
            </div>
          )}
        </div>

        <h1
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: '1.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          {profileData?.name || 'Wezey User'}
        </h1>

        <div style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* 1. Name */}
          <div
            onClick={() => speechEngine.speak(`Full Name: ${profileData?.name || 'Not provided'}`)}
            className="wezey-card"
            style={{
              padding: '1.1rem 1.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--wz-plum-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={21} color="var(--wz-plum)" strokeWidth={2} />
            </div>
            <span style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
              {profileData?.name || 'Not provided'}
            </span>
          </div>

          {/* 2. Phone */}
          <div
            onClick={() => speechEngine.speak(`Phone Number: ${profileData?.phone_number || 'Not provided'}`)}
            className="wezey-card"
            style={{
              padding: '1.1rem 1.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--wz-sage-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={21} color="var(--wz-sage)" strokeWidth={2} />
            </div>
            <span style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
              {profileData?.phone_number || 'Not provided'}
            </span>
          </div>

          {/* 3. Email */}
          <div
            onClick={() => speechEngine.speak(`Email: ${profileData?.email || 'Not provided'}`)}
            className="wezey-card"
            style={{
              padding: '1.1rem 1.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: 'var(--wz-terracotta-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={21} color="var(--wz-terracotta)" strokeWidth={2} />
            </div>
            <span style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink)' }}>
              {profileData?.email || 'Not provided'}
            </span>
          </div>
        </div>

        {/* Friends, Language & Logout Buttons */}
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', maxWidth: '640px' }}>
          <button
            onClick={() => navigate('friends')}
            className="wezey-secondary-btn"
            style={{ width: '100%', padding: '0.95rem' }}
          >
            <Users size={18} />
            Friends &amp; Requests
          </button>

          <button
            onClick={() => navigate('language')}
            className="wezey-primary-btn"
            style={{ width: '100%', padding: '0.95rem' }}
          >
            <Globe size={18} />
            Change Voice Language
          </button>

          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'var(--card)',
              color: '#BE123C',
              border: '1.5px solid #FECDD3',
              borderRadius: '999px',
              padding: '0.95rem',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
