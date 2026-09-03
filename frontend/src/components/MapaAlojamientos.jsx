import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Compass, MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Haversine formula to compute distance in km
export function calculateDistance(lat1, lon1, lat2, lon2) {
  try {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const nLat1 = parseFloat(lat1);
    const nLon1 = parseFloat(lon1);
    const nLat2 = parseFloat(lat2);
    const nLon2 = parseFloat(lon2);
    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

    const R = 6371; // Earth radius in km
    const dLat = (nLat2 - nLat1) * Math.PI / 180;
    const dLon = (nLon2 - nLon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(nLat1 * Math.PI / 180) * Math.cos(nLat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  } catch (e) {
    return null;
  }
}

// Coordenadas reales de sedes UCC en Colombia
export const UCC_CAMPUS_COORDS = {
  'Santa Marta': { lat: 11.2263, lng: -74.1868 },
  'Montería': { lat: 8.7570, lng: -75.8814 },
  'Medellín': { lat: 6.2442, lng: -75.5812 },
  'Bogotá': { lat: 4.6280, lng: -74.0650 },
  'Bucaramanga': { lat: 7.1193, lng: -73.1227 },
  'Pasto': { lat: 1.2136, lng: -77.2811 },
  'Popayán': { lat: 2.4419, lng: -76.6063 },
  'Ibagué': { lat: 4.4389, lng: -75.2322 },
  'Villavicencio': { lat: 4.1420, lng: -73.6266 },
  'Neiva': { lat: 2.9273, lng: -75.2819 },
  'Cúcuta': { lat: 7.8939, lng: -72.5078 },
  'Espinal': { lat: 4.1492, lng: -74.8841 },
  'Apartadó': { lat: 7.8836, lng: -76.6253 },
  'Cartago': { lat: 4.7464, lng: -75.9117 },
  'Quibdó': { lat: 5.6947, lng: -76.6611 },
  'Arauca': { lat: 7.0847, lng: -70.7591 }
};

export function normalizeString(str = '') {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getPropertyCoordinates(prop, idx = 0) {
  try {
    if (prop && prop.latitud && prop.longitud) {
      const lat = parseFloat(prop.latitud);
      const lng = parseFloat(prop.longitud);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    const campusTarget = normalizeString(prop?.campus_cercano);
    const ciudadTarget = normalizeString(prop?.ciudad);

    // 1. Coincidencia por campus_cercano
    if (campusTarget) {
      for (const [key, coords] of Object.entries(UCC_CAMPUS_COORDS)) {
        const keyNorm = normalizeString(key);
        if (campusTarget.includes(keyNorm) || keyNorm.includes(campusTarget)) {
          const seed = Number(prop?.id) || idx || 1;
          const latOffset = ((seed * 17) % 50 - 25) * 0.0003;
          const lngOffset = ((seed * 31) % 50 - 25) * 0.0003;
          return { lat: coords.lat + latOffset, lng: coords.lng + lngOffset };
        }
      }
    }

    // 2. Coincidencia por ciudad
    if (ciudadTarget) {
      for (const [key, coords] of Object.entries(UCC_CAMPUS_COORDS)) {
        const keyNorm = normalizeString(key);
        if (ciudadTarget.includes(keyNorm) || keyNorm.includes(ciudadTarget)) {
          const seed = Number(prop?.id) || idx || 1;
          const latOffset = ((seed * 17) % 50 - 25) * 0.0003;
          const lngOffset = ((seed * 31) % 50 - 25) * 0.0003;
          return { lat: coords.lat + latOffset, lng: coords.lng + lngOffset };
        }
      }
    }
  } catch (e) {
    console.warn('Error resolviendo coordenadas:', e);
  }

  const baseCoords = UCC_CAMPUS_COORDS['Santa Marta'];
  const seed = Number(prop?.id) || idx || 1;
  return {
    lat: baseCoords.lat + (((seed * 17) % 50 - 25) * 0.0003),
    lng: baseCoords.lng + (((seed * 31) % 50 - 25) * 0.0003)
  };
}

// Generadores de URLs para Waze y Google Maps
export function getGoogleMapsUrl(lat, lng, destinationName = '') {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${destinationName ? `&destination_place_id=&travelmode=driving` : ''}`;
  }
  if (destinationName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationName)}`;
  }
  return 'https://maps.google.com';
}

export function getWazeUrl(lat, lng) {
  if (lat && lng) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  return 'https://waze.com';
}

export default function MapaAlojamientos({ propiedades = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const navigate = useNavigate();
  
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [geoError, setGeoError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [maxDistance, setMaxDistance] = useState(99999); // km
  const [selectedProperty, setSelectedProperty] = useState(null);

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
        try {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setUserLocation(coords);
          setLocating(false);

          if (mapInstanceRef.current && window.L && !isNaN(coords.lat) && !isNaN(coords.lng)) {
            mapInstanceRef.current.setView([coords.lat, coords.lng], 13);
          }
        } catch (e) {
          setLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoError('No pudimos obtener tu ubicación GPS actual. Mostrando ubicaciones en mapa.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    getUserLocation();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (e) {}
      }
    };
  }, []);

  // Safe Render Markers
  const renderMarkers = () => {
    try {
      const map = mapInstanceRef.current;
      if (!map || !window.L) return;

      // Clear existing markers safely
      map.eachLayer((layer) => {
        try {
          if (layer instanceof window.L.Marker || layer instanceof window.L.Circle) {
            map.removeLayer(layer);
          }
        } catch (e) {}
      });

      // User Location Marker
      if (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
        try {
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
              "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup('<b>Tu Ubicación Actual</b><br>Geolocalización GPS activa.');
        } catch (e) {}
      }

      const bounds = window.L.latLngBounds();

      if (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
        bounds.extend([userLocation.lat, userLocation.lng]);
      }

      const safeProps = Array.isArray(propiedades) ? propiedades : [];

      safeProps.forEach((prop, idx) => {
        try {
          const coords = getPropertyCoordinates(prop, idx);
          if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) return;

          const dist = (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng))
            ? calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
            : null;

          if (dist && maxDistance < 9999 && parseFloat(dist) > maxDistance) return;

          bounds.extend([coords.lat, coords.lng]);

          const gmapsUrl = getGoogleMapsUrl(coords.lat, coords.lng, `${prop.direccion || ''}, ${prop.ciudad || ''}`);
          const wazeUrl = getWazeUrl(coords.lat, coords.lng);

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
                <span>${prop.titulo ? (prop.titulo.length > 16 ? prop.titulo.substring(0, 16) + '...' : prop.titulo) : 'Alojamiento UCC'}</span>
              </div>
            `,
            iconSize: [110, 26],
            iconAnchor: [55, 13]
          });

          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px; min-width: 210px; max-width: 240px;">
              <h4 style="margin: 0 0 4px 0; color: #0d7c3d; font-size: 0.92rem; font-weight: 800; line-height: 1.25;">
                ${prop.titulo || 'Hospedaje UCC'}
              </h4>
              <p style="margin: 0 0 8px 0; font-size: 0.76rem; color: #475569; line-height: 1.35;">
                📍 ${prop.barrio ? `${prop.barrio}, ` : ''}${prop.ciudad || prop.campus_cercano || 'Campus UCC'}
                ${dist ? `<br><strong style="color:#0d7c3d;">📏 A ${dist} km de tu ubicación</strong>` : ''}
              </p>

              <div style="font-size: 0.72rem; font-weight: 800; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                Cómo llegar:
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" style="
                  background: #1a73e8;
                  color: #ffffff;
                  padding: 6px 8px;
                  border-radius: 6px;
                  text-decoration: none;
                  font-size: 0.72rem;
                  font-weight: 700;
                  text-align: center;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                  box-shadow: 0 2px 4px rgba(26,115,232,0.25);
                ">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  Google Maps
                </a>
                <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" style="
                  background: #33ccff;
                  color: #0b1f3a;
                  padding: 6px 8px;
                  border-radius: 6px;
                  text-decoration: none;
                  font-size: 0.72rem;
                  font-weight: 800;
                  text-align: center;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                  box-shadow: 0 2px 4px rgba(51,204,255,0.3);
                ">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24l-1.04 2.45c-.15.35.12.75.5.75h9.42c5.52 0 10-4.48 10-10S17.52 2 12 2zm-3.5 11c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                  Waze
                </a>
              </div>

              <a href="/propiedad/${prop.id}" style="
                display: block;
                background: #0d7c3d;
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                text-decoration: none;
                font-size: 0.76rem;
                font-weight: bold;
                text-align: center;
                box-shadow: 0 2px 4px rgba(13,124,61,0.25);
              ">Ver Alojamiento →</a>
            </div>
          `;

          const marker = window.L.marker([coords.lat, coords.lng], { icon: propIcon })
            .addTo(map)
            .bindPopup(popupContent);

          marker.on('click', () => {
            setSelectedProperty({ ...prop, dist, lat: coords.lat, lng: coords.lng });
          });
        } catch (e) {
          console.warn('Error añadiendo marcador de propiedad:', e);
        }
      });

      if (bounds.isValid() && safeProps.length > 0) {
        try {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error en renderMarkers:', err);
    }
  };

  // Initialize Leaflet Map dynamically
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const loadLeafletAndInit = () => {
      if (mapInstanceRef.current) return;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const initMap = () => {
        if (!window.L || mapInstanceRef.current || !mapContainerRef.current) return;
        if (mapContainerRef.current._leaflet_id) return;

        try {
          const center = userLocation || defaultCoords;
          const map = window.L.map(mapContainerRef.current).setView([center.lat, center.lng], 12);

          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          mapInstanceRef.current = map;
          renderMarkers();
        } catch (e) {
          console.error('Error inicializando mapa:', e);
        }
      };

      if (window.L) {
        initMap();
      } else {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        document.body.appendChild(script);
      }
    };

    loadLeafletAndInit();
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderMarkers();
    }
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
            Encuentra hospedajes solidarios cerca de tu ubicación con rutas en Google Maps y Waze.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Geolocation Button */}
          <button
            type="button"
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
              alignItems: 'center',
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
            <option value={10}>Hasta 10 km</option>
            <option value={25}>Hasta 25 km</option>
            <option value={50}>Hasta 50 km</option>
            <option value={100}>Hasta 100 km</option>
            <option value={99999}>Todos los alojamientos en Colombia</option>
          </select>
        </div>
      </div>

      {geoError && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#d97706', padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem' }}>
          {geoError}
        </div>
      )}

      {/* Map Display Container */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '420px', 
          borderRadius: 12, 
          overflow: 'hidden', 
          border: '1px solid var(--border)',
          zIndex: 1
        }} 
      />

      {/* Selected Property Quick Navigation Card */}
      {selectedProperty && (
        <div style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(13, 124, 61, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <MapPin size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>
                {selectedProperty.titulo || 'Alojamiento UCC'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {selectedProperty.barrio ? `${selectedProperty.barrio}, ` : ''}{selectedProperty.ciudad || selectedProperty.campus_cercano || 'Campus UCC'}
                {selectedProperty.dist ? ` • ${selectedProperty.dist} km de distancia` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={getGoogleMapsUrl(selectedProperty.lat, selectedProperty.lng, `${selectedProperty.direccion || ''}, ${selectedProperty.ciudad || ''}`)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(26,115,232,0.2)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              Google Maps
            </a>

            <a
              href={getWazeUrl(selectedProperty.lat, selectedProperty.lng)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#33ccff',
                color: '#0b1f3a',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(51,204,255,0.25)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24l-1.04 2.45c-.15.35.12.75.5.75h9.42c5.52 0 10-4.48 10-10S17.52 2 12 2zm-3.5 11c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
              Waze
            </a>

            <button
              type="button"
              onClick={() => navigate(`/propiedad/${selectedProperty.id}`)}
              style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Ver Detalle <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
