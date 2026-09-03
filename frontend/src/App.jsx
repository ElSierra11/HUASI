import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNavBar from './components/layout/BottomNavBar';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import PqrButton from './components/PqrButton';
import PwaInstallBanner from './components/PwaInstallBanner';
import NotificationManager from './components/NotificationManager';
import Home from './pages/Home';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import OlvidoPassword from './pages/OlvidoPassword';
import RecuperarPassword from './pages/RecuperarPassword';
import MisReservas from './pages/MisReservas';
import Chat from './pages/Chat';
import HostDashboard from './pages/HostDashboard';
import HostPropertyForm from './pages/HostPropertyForm';
import HostReservas from './pages/HostReservas';
import Perfil from './pages/Perfil';
import Verificacion from './pages/Verificacion';
import Terminos from './pages/Terminos';
import Privacidad from './pages/Privacidad';
import QuienesSomos from './pages/QuienesSomos';
import useActivityTracker from './hooks/useActivityTracker';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  useActivityTracker();

  return (
    <div className="app pb-16 md:pb-0 flex flex-col min-h-screen">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <Navbar />
      <main className="main-content flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/propiedad/:id" element={<PropertyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/register" element={<Register />} />
          <Route path="/olvido-password" element={<OlvidoPassword />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />
          <Route path="/quienes-somos" element={<QuienesSomos />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/mis-reservas" element={<ProtectedRoute><MisReservas /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/verificacion" element={<ProtectedRoute><Verificacion /></ProtectedRoute>} />
          <Route path="/host" element={<ProtectedRoute><HostDashboard /></ProtectedRoute>} />
          <Route path="/host/nueva-propiedad" element={<ProtectedRoute><HostPropertyForm /></ProtectedRoute>} />
          <Route path="/host/editar/:id" element={<ProtectedRoute><HostPropertyForm /></ProtectedRoute>} />
          <Route path="/host/reservas" element={<ProtectedRoute><HostReservas /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
      <NotificationManager />
      <ChatWidget />
      <PqrButton />
      <PwaInstallBanner />
      <BottomNavBar />
    </div>
  );
}

export default App;
