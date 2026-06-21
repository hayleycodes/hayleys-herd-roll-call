import { useRef, useState } from 'react';
import { supabase } from '../utils/supabase-client';
import { useAuth } from './hooks/useAuth';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import './App.css';
import hhLogo from './assets/hh.png';
import EmojiButton from './components/ui/EmojiButton/EmojiButton';
import PageTransition from './components/ui/PageTransition/PageTransition';
import ScrollToTop from './components/ui/ScrollToTop';
import RollcallOverlay from './components/Rollcall/RollcallOverlay';
import { FEATURE_MOOD } from './config/features';

import LoginPage from './pages/LoginPage/LoginPage';
import HomePage from './pages/HomePage/HomePage';
import PigPage from './pages/PigPage/PigPage';
import SocialOrderPage from './pages/SocialOrderPage/SocialOrderPage.tsx';
import FamilyTreePage from './pages/FamilyTreePage/FamilyTreePage.tsx';
import HealthLogPage from './pages/HealthLogPage/HealthLogPage.tsx';
import WeightsPage from './pages/WeightsPage/WeightsPage.tsx';
import TagsPage from './pages/TagsPage/TagsPage.tsx';
import MoodPage from './pages/MoodPage/MoodPage.tsx';
import Loading from './components/ui/Loading/Loading.tsx';

function App() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [isRollcallOpen, setIsRollcallOpen] = useState(false);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const sightedDuringRollcall = useRef(false);

  const handleRollcallClose = () => {
    setIsRollcallOpen(false);
    if (sightedDuringRollcall.current) {
      setHomeRefreshKey((k) => k + 1);
      sightedDuringRollcall.current = false;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <Loading />;

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="wrapper">
      <ScrollToTop />
      <header>
        <div className="headerLeft">
          <Link to="/" className="headerLink">
            <img src={hhLogo} alt="Hayley's Herd" className="headerLogo" />
          </Link>
          <nav className="headerLinks" aria-label="Primary">
            <Link to="/tree">
              <EmojiButton>🌳</EmojiButton>
            </Link>
            <Link to="/social-order">
              <EmojiButton>👑</EmojiButton>
            </Link>
            <Link to="/health-log">
              <EmojiButton>🏥</EmojiButton>
            </Link>
            <EmojiButton onClick={() => setIsRollcallOpen(true)}>
              🍎
            </EmojiButton>
            {FEATURE_MOOD && (
              <Link to="/moods">
                <EmojiButton>🧠</EmojiButton>
              </Link>
            )}
          </nav>
        </div>
        <EmojiButton onClick={handleLogout}>🪵</EmojiButton>
      </header>

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage refreshKey={homeRefreshKey} />
              </PageTransition>
            }
          />
          <Route
            path="/pigs/:id"
            element={
              <PageTransition>
                <PigPage />
              </PageTransition>
            }
          />
          <Route
            path="/tree"
            element={
              <PageTransition>
                <FamilyTreePage />
              </PageTransition>
            }
          />
          <Route
            path="/social-order"
            element={
              <PageTransition>
                <SocialOrderPage />
              </PageTransition>
            }
          />
          <Route
            path="/health-log"
            element={
              <PageTransition>
                <HealthLogPage />
              </PageTransition>
            }
          />
          <Route
            path="/weights"
            element={
              <PageTransition>
                <WeightsPage />
              </PageTransition>
            }
          />
          <Route
            path="/tags"
            element={
              <PageTransition>
                <TagsPage />
              </PageTransition>
            }
          />
          {FEATURE_MOOD && (
            <Route
              path="/moods"
              element={
                <PageTransition>
                  <MoodPage />
                </PageTransition>
              }
            />
          )}
        </Routes>
      </AnimatePresence>
      <RollcallOverlay
        isOpen={isRollcallOpen}
        onClose={handleRollcallClose}
        onSighted={() => {
          sightedDuringRollcall.current = true;
        }}
      />
    </div>
  );
}

export default App;
