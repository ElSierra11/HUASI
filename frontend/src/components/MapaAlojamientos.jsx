import React, { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, Compass, Home, ExternalLink, ShieldCheck, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Haversine formula to compute distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

export default function MapaAlojamientos({ propiedades = [] }) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [geoError, setGeoError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [maxDistance, setMaxDistance] = useState(50); // km
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Default fallback coords (Santa Marta / UCC Campus: 11.226, -74.186)
  const defaultCoords = { lat: 11.2263, lng: -74.1868 };

  // Detect User GPS Location
  const getUserLocation = () => {
    setLocating(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
        setLocating(false);

        // Center Leaflet map if available
        if (mapInstanceRef.current && window.L) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 13);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoError('No pudimos obtener tu ubicación actual. Usando ubicación del Campus UCC.');
        setLocating(false);
        setUserLocation(defaultCoords);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  // Initialize Leaflet Map dynamically
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Load Leaflet CSS & JS dynamically if not already loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!window.L || mapInstanceRef.current) return;

      const center = userLocation || defaultCoords;
      const map = window.L.map(mapContainerRef.current).setView([center.lat, center.lng], 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.body.appendChild(script);
    }
  }, []);

  // Update Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.Circle) {
        map.removeLayer(layer);
      }
    });

    const currentCoords = userLocation || defaultCoords;

    // User Location Marker (Pulse Blue Circle)
    if (userLocation) {
      const userIcon = window.L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #2563eb;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(37, 99, 235, 0.6);
            animation: pulse-ring 1.8s infinite;
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Tu Ubicación Actual</b><br>Geolocalización GPS activa.');
    }

    // Add Property Markers with default or mock coordinates around Santa Marta / Colombia
    propiedades.forEach((prop, idx) => {
      // Mock latitude/longitude offset for properties if not present
      const propLat = prop.latitud || (currentCoords.lat + (idx % 2 === 0 ? 0.008 : -0.006) * (idx + 1));
      const propLng = prop.longitud || (currentCoords.lng + (idx % 3 === 0 ? 0.012 : -0.01) * (idx + 1));

      const dist = calculateDistance(currentCoords.lat, currentCoords.lng, propLat, propLng);

      if (dist && parseFloat(dist) > maxDistance) return;

      const propIcon = window.L.divIcon({
        className: 'custom-prop-marker',
        html: `
          <div style="
            background: #0d7c3d;
            color: white;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 12px;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${prop.tipo === 'alojamiento_plus' ? '$' + Number(prop.precio_noche).toLocaleString() : '100 Soles'}</span>
          </div>
        `,
        iconSize: [80, 26],
        iconAnchor: [40, 13]
      });

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px;">
          <h4 style="margin: 0 0 6px 0; color: #0d7c3d; font-size: 0.95rem;">${prop.titulo}</h4>
          <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #475569;">${prop.ciudad || 'Campus UCC'} • <strong>${dist} km</strong> de ti</p>
          <a href="/propiedad/${prop.id}" style="
            display: inline-block;
            margin-top: 6px;
            background: #0d7c3d;
            color: white;
            padding: 4px 10px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.75rem;
            font-weight: bold;
          ">Ver Alojamiento →</a>
        </div>
      `;

      const marker = window.L.marker([propLat, propLng], { icon: propIcon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedProperty({ ...prop, dist, lat: propLat, lng: propLng });
      });
    });
  }, [userLocation, propiedades, maxDistance]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
      {/* Map Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Compass size={20} className="text-ucc-green" />
            <span>Mapa de Alojamientos por Cercanía</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Encuentra hospedajes solidarios cerca de tu posición actual GPS.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Geolocation Button */}
          <button
            onClick={getUserLocation}
            disabled={locating}
            style={{
              background: 'rgba(13, 124, 61, 0.1)',
              border: '1px solid rgba(13, 124, 61, 0.3)',
              color: 'var(--primary)',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              align-items: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <Navigation size={15} />
            {locating ? 'Obteniendo GPS...' : 'Centrar en mi Ubicación'}
          </button>

          {/* Distance Filter */}
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <option value={5}>Hasta 5 km</option>
            <option value={15}>Hasta 15 km</option>
            <option value={50}>Hasta 50 km</option>
            <option value={500}>Todas las distancias</option>
          </select>
        </div>
      </div>

      {geoError && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#d97706', padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem' }}>
          {geoError}
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: 380,
          borderRadius: 12,
          border: '1px solid var(--border)',
          zIndex: 1
        }}
      />

      {/* Selected Property Banner if clicked */}
      {selectedProperty && (
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--primary)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>{selectedProperty.titulo}</h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {selectedProperty.ciudad || 'Santa Marta'} • <strong>A {selectedProperty.dist} km de tu ubicación</strong>
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/propiedad/${selectedProperty.id}`)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ExternalLink size={14} /> Ver Ficha
          </button>
        </div>
      )}
    </div>
  );
}
