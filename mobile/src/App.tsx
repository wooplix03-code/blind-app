import { useState, useEffect } from 'react';
import { GlobalGestureOverlay } from './components/GlobalGestureOverlay';
import { WelcomeRegistrationScreen } from './screens/WelcomeRegistrationScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { SocialFeedScreen } from './screens/SocialFeedScreen';
import { FriendsScreen } from './screens/FriendsScreen';
import { AlbumScreen } from './screens/AlbumScreen';
import { PostSearchScreen } from './screens/PostSearchScreen';
import { CreatePostScreen } from './screens/CreatePostScreen';
import { AskQuestionsScreen } from './screens/AskQuestionsScreen';
import { VisualizationScreen } from './screens/VisualizationScreen';
import { UserProfileScreen } from './screens/UserProfileScreen';
import { speechEngine } from './services/speechEngine';
import { api } from './services/api';

export function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => api.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!(api.getToken() || api.getUser()));
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return (api.getToken() || api.getUser()) ? 'menu' : 'welcome';
  });
  const [albumUserId, setAlbumUserId] = useState<number | undefined>(undefined);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');

  // Persistent session: Verify in background without auto-logout on network/page refresh
  useEffect(() => {
    const token = api.getToken();
    const savedUser = api.getUser();

    if (token || savedUser) {
      setIsAuthenticated(true);
      if (savedUser) {
        setCurrentUser(savedUser);
      }

      // If user was on welcome screen but is already logged in, navigate directly to menu
      setCurrentPage((prev) => (prev === 'welcome' ? 'menu' : prev));

      // Quiet background refresh of profile data
      if (token) {
        api.getProfile()
          .then((res) => {
            if (res.user || res.id) {
              const userData = res.user || res;
              api.setUser(userData);
              setCurrentUser(userData);
            }
          })
          .catch((err) => {
            // Only log out if server explicitly returned 401 Unauthorized
            // On offline, network delay, or server reload, NEVER log out automatically
            if (err?.status === 401) {
              console.warn('Session expired by server (401).');
              handleLogout();
            } else {
              console.log('Background sync skipped, persistent session kept active.');
            }
          });
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentPage('welcome');
    }
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentPage('welcome');
    speechEngine.speak('You have been logged out. Welcome to Wezey.');
  };

  const navigate = (page: string) => {
    speechEngine.stopSpeaking();

    // Instagram-style strict security guard: unauthenticated users cannot access any menu or features
    if (!isAuthenticated && page !== 'welcome' && page !== 'register' && page !== 'login') {
      speechEngine.speak('Access restricted. Please register or log in first to use Wezey.');
      setCurrentPage('welcome');
      return;
    }

    if (page === 'logout') {
      handleLogout();
      return;
    }
    if (page === 'language') {
      handleLanguageToggle();
      return;
    }

    if (page === 'back') {
      handleSwipeLeft();
      return;
    }
    if (page === 'next') {
      handleSwipeRight();
      return;
    }

    // Normalize route aliases & album:<userId> deep links
    if (page.startsWith('album:')) {
      const targetId = Number(page.split(':')[1]);
      setAlbumUserId(Number.isFinite(targetId) && targetId > 0 ? targetId : undefined);
      setCurrentPage('album');
      return;
    }

    const routeMap: Record<string, string> = {
      ask: 'ask-questions',
      visual: 'visualization',
      social: 'feed',
    };
    const resolved = routeMap[page] || page;
    if (resolved === 'album') {
      setAlbumUserId(undefined);
    }
    setCurrentPage(resolved);
  };

  const handleSwipeLeft = () => {
    if (!isAuthenticated) {
      speechEngine.speak('Please register or log in first.');
      return;
    }

    // Main Menu -> Social Page. Social sub-pages -> Social Page. Primary pages -> Main Menu.
    if (currentPage === 'menu') {
      speechEngine.speak('Opening Social Page.');
      setCurrentPage('feed');
    } else if (
      currentPage === 'album' ||
      currentPage === 'friends' ||
      currentPage === 'search-posts' ||
      currentPage === 'create-post'
    ) {
      speechEngine.speak('Returning to Social Feed.');
      setCurrentPage('feed');
    } else {
      speechEngine.speak('Returning to Main Menu.');
      setCurrentPage('menu');
    }
  };

  const handleSwipeRight = () => {
    if (!isAuthenticated) {
      speechEngine.speak('Please register or log in first.');
      return;
    }

    if (currentPage === 'feed') {
      speechEngine.speak('Opening Album.');
      setCurrentPage('album');
    } else if (currentPage === 'menu') {
      speechEngine.speak('Opening Ask Questions.');
      setCurrentPage('ask-questions');
    }
  };

  const handleSwipeUp = () => {
    if (!isAuthenticated) {
      speechEngine.speak('Please register or log in first.');
      return;
    }
    speechEngine.speak('Opening Visualization Page.');
    setCurrentPage('visualization');
  };

  // Swipe Down to change language between Malay and English
  const handleLanguageToggle = () => {
    const nextLang = currentLanguage === 'en' ? 'ms' : 'en';
    setCurrentLanguage(nextLang);
    speechEngine.setLanguage(nextLang);

    if (nextLang === 'ms') {
      speechEngine.speak('Bahasa ditukar ke Bahasa Melayu.');
    } else {
      speechEngine.speak('Language changed to English.');
    }

    if (currentUser) {
      api.updateLanguage(nextLang).catch(() => {});
    }
  };

  // Device Sensor Shake Handlers
  // Shake 1 time: return to Main Menu
  const handleShakeOnce = () => {
    if (!isAuthenticated) return;
    speechEngine.speak('Returning to Main Menu.');
    setCurrentPage('menu');
  };

  // Shake 2 times: access Profile
  const handleShakeTwice = () => {
    if (!isAuthenticated) return;
    speechEngine.speak('Opening Profile.');
    setCurrentPage('profile');
  };

  return (
    <GlobalGestureOverlay
      currentPage={currentPage}
      navigate={navigate}
      isAuthenticated={isAuthenticated}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onSwipeUp={handleSwipeUp}
      onSwipeDown={handleLanguageToggle}
      onLanguageToggle={handleLanguageToggle}
      onShakeOnce={handleShakeOnce}
      onShakeTwice={handleShakeTwice}
    >
      {(!isAuthenticated || currentPage === 'welcome') && (
        <WelcomeRegistrationScreen
          navigate={navigate}
          onSuccess={(user, token) => {
            if (token) api.setToken(token);
            if (user) api.setUser(user);
            setCurrentUser(user);
            setIsAuthenticated(true);
            setCurrentPage('menu');
            speechEngine.speak(`Account verified. Welcome to Wezey, ${user?.name || ''}. Main Menu.`);
          }}
        />
      )}

      {isAuthenticated && currentPage === 'menu' && (
        <MainMenuScreen
          userName={currentUser?.name || 'User'}
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'feed' && (
        <SocialFeedScreen
          currentUser={currentUser}
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'friends' && (
        <FriendsScreen
          currentUser={currentUser}
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'album' && (
        <AlbumScreen
          currentUser={currentUser}
          viewingUserId={albumUserId}
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'search-posts' && (
        <PostSearchScreen
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'create-post' && (
        <CreatePostScreen
          currentUser={currentUser}
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'ask-questions' && (
        <AskQuestionsScreen
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'visualization' && (
        <VisualizationScreen
          navigate={navigate}
        />
      )}

      {isAuthenticated && currentPage === 'profile' && (
        <UserProfileScreen
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          navigate={navigate}
        />
      )}
    </GlobalGestureOverlay>
  );
}

export default App;
