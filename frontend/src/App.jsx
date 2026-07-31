import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import PqrButton from './components/PqrButton';
import Home from './pages/Home';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MisReservas from './pages/MisReservas';
import HostDashboard from './pages/HostDashboard';
import HostPropertyForm from './pages/HostPropertyForm';
import HostReservas from './pages/HostReservas';
import Perfil from './pages/Perfil';
import Verificacion from './pages/Verificacion';
import Terminos from './pages/Terminos';
import Privacidad from './pages/Privacidad';
import QuienesSomos from './pages/QuienesSomos';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/propiedad/:id" element={<PropertyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/quienes-somos" element={<QuienesSomos />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/mis-reservas" element={<ProtectedRoute><MisReservas /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/verificacion" element={<ProtectedRoute><Verificacion /></ProtectedRoute>} />
          <Route path="/host" element={<ProtectedRoute><HostDashboard /></ProtectedRoute>} />
          <Route path="/host/nueva-propiedad" element={<ProtectedRoute><HostPropertyForm /></ProtectedRoute>} />
          <Route path="/host/editar/:id" element={<ProtectedRoute><HostPropertyForm /></ProtectedRoute>} />
          <Route path="/host/reservas" element={<ProtectedRoute><HostReservas /></ProtectedRoute>} />
        </Routes>
      </main>
      <ChatWidget />
      <PqrButton />
    </div>
  );
}

export default App;
