import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, ExternalLink, CheckCircle2, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { UCC_CAMPUS_COORDS, getGoogleMapsUrl, getWazeUrl, normalizeString } from './MapaAlojamientos';

export default function SelectorUbicacionPropiedad({
  direccion = '',
  barrio = '',
  campus = '',
  latitud,
  longitud,
  onChangeCoordinates
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState(() => {
    if (latitud && longitud && !isNaN(parseFloat(latitud)) && !isNaN(parseFloat(longitud))) {
      return { lat: parseFloat(latitud), lng: parseFloat(longitud) };
    }
    const defaultCampus = campus && UCC_CAMPUS_COORDS[campus] ? UCC_CAMPUS_COORDS[campus] : UCC_CAMPUS_COORDS['Santa Marta'];
    return defaultCampus || { lat: 11.2263, lng: -74.1868 };
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isValidated, setIsValidated] = useState(Boolean(latitud && longitud));
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState(null);

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    const initMap = () => {
      if (!window.L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }

      const initialLat = coords.lat || 11.2263;
      const initialLng = coords.lng || -74.1868;

      const map = window.L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: false
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Marcador personalizado de alta calidad
      const customIcon = window.L.divIcon({
        className: 'custom-property-marker',
        html: `
          <div style="
            width: 38px;
            height: 38px;
            background: #0d7c3d;
            color: #ffffff;
            border: 3px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
            cursor: grab;
          ">
            <svg style="transform: rotate(45deg); width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -36]
      });

      const marker = window.L.marker([initialLat, initialLng], {
        icon: customIcon,
        draggable: true,
        autoPan: true
      }).addTo(map);

      marker.bindPopup(`
        <div style="text-align: center; padding: 4px; font-family: system-ui;">
          <strong style="color: #0d7c3d; font-size: 13px;">📍 Ubicación de tu Alojamiento</strong>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Arrastra para ajustar el punto exacto.</p>
        </div>
      `).openPopup();

      marker.on('dragend', (event) => {
        const position = event.target.getLatLng();
        const newCoords = { lat: position.lat, lng: position.lng };
        setCoords(newCoords);
        setIsValidated(true);
        if (onChangeCoordinates) {
          onChangeCoordinates(newCoords.lat, newCoords.lng);
        }
      });

      map.on('click', (event) => {
        const { lat, lng } = event.latlng;
        marker.setLatLng([lat, lng]);
        const newCoords = { lat, lng };
        setCoords(newCoords);
        setIsValidated(true);
        if (onChangeCoordinates) {
          onChangeCoordinates(lat, lng);
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    };

    if (window.L) {
      initMap();
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (isMounted) initMap();
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualizar marcador cuando cambian coordenadas
  const updateMapPosition = (newLat, newLng, zoom = 16) => {
    if (!newLat || !newLng || isNaN(newLat) || isNaN(newLng)) return;
    setCoords({ lat: newLat, lng: newLng });
    setIsValidated(true);

    if (mapInstanceRef.current && markerRef.current) {
      try {
        markerRef.current.setLatLng([newLat, newLng]);
        mapInstanceRef.current.setView([newLat, newLng], zoom);
      } catch (e) {}
    }

    if (onChangeCoordinates) {
      onChangeCoordinates(newLat, newLng);
    }
  };

  // Geocodificación inteligente (Nominatim OpenStreetMap + Campus Fallback)
  const geocodeAddress = async () => {
    if (!direccion.trim() && !campus) return;
    setIsGeocoding(true);
    setGeoMsg(null);

    const queryParts = [direccion.trim(), barrio.trim(), campus ? `Sede ${campus}` : '', 'Colombia'].filter(Boolean);
    const searchQuery = queryParts.join(', ');

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=co`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'es' }
      });
      const data = await response.json();

      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        updateMapPosition(foundLat, foundLng, 16);
        setGeoMsg({ type: 'success', text: `Ubicación encontrada: ${data[0].display_name.split(',').slice(0, 3).join(', ')}` });
      } else {
        // Fallback por campus
        if (campus && UCC_CAMPUS_COORDS[campus]) {
          const fallback = UCC_CAMPUS_COORDS[campus];
          updateMapPosition(fallback.lat, fallback.lng, 14);
          setGeoMsg({ type: 'info', text: `Centrado en Campus UCC ${campus}. Puedes arrastrar el marcador al punto exacto.` });
        } else {
          setGeoMsg({ type: 'warning', text: 'No se encontró la dirección exacta. Arrastra el marcador en el mapa para fijar la ubicación.' });
        }
      }
    } catch (err) {
      if (campus && UCC_CAMPUS_COORDS[campus]) {
        const fallback = UCC_CAMPUS_COORDS[campus];
        updateMapPosition(fallback.lat, fallback.lng, 14);
      }
      setGeoMsg({ type: 'info', text: 'Ubicación ajustada según la sede UCC seleccionada.' });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Geolocalización del navegador
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocating(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateMapPosition(lat, lng, 17);
        setLocating(false);
        setGeoMsg({ type: 'success', text: 'Ubicación GPS actual detectada con éxito.' });
      },
      (err) => {
        setLocating(false);
        setGeoMsg({ type: 'warning', text: 'No pudimos acceder a tu GPS. Por favor arrastra el marcador manualmente.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const gmapsUrl = getGoogleMapsUrl(coords.lat, coords.lng, `${direccion || ''}, ${campus || ''}`);
  const wazeUrl = getWazeUrl(coords.lat, coords.lng);

  return (
    <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-ucc-border/60 dark:border-slate-700/80 space-y-4">
      
      {/* Header del Módulo de Georreferenciación */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ucc-green/10 dark:bg-emerald-400/15 flex items-center justify-center text-ucc-green dark:text-emerald-400">
            <MapPin size={18} />
          </div>
          <div>
            <h4 className="font-heading font-black text-sm text-ucc-navy dark:text-white leading-tight">
              Georreferenciación & Validación en Mapa
            </h4>
            <p className="text-[0.72rem] text-ucc-muted dark:text-slate-400 font-semibold">
              Valida tu ubicación para que los huéspedes puedan abrirla con Google Maps y Waze.
            </p>
          </div>
        </div>

        {/* Botones de Acción Rápida */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={geocodeAddress}
            disabled={isGeocoding || (!direccion.trim() && !campus)}
            className="inline-flex items-center gap-1.5 bg-ucc-green hover:bg-ucc-green-hover text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50"
            title="Validar dirección en mapa"
          >
            {isGeocoding ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
            <span>{isGeocoding ? 'Validando...' : 'Ubicar en Mapa'}</span>
          </button>

          <button
            type="button"
            onClick={detectCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 text-ucc-navy dark:text-white border border-ucc-border/80 dark:border-slate-600 text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50"
            title="Usar mi ubicación GPS actual"
          >
            <Navigation size={13} className={locating ? 'animate-pulse text-ucc-green' : 'text-ucc-green'} />
            <span>{locating ? 'GPS...' : 'Mi GPS'}</span>
          </button>
        </div>
      </div>

      {/* Mensaje de Estado / Feedback */}
      {geoMsg && (
        <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          geoMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' :
          geoMsg.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' :
          'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        }`}>
          {geoMsg.type === 'success' ? <CheckCircle2 size={14} className="flex-shrink-0" /> : <AlertCircle size={14} className="flex-shrink-0" />}
          <span>{geoMsg.text}</span>
        </div>
      )}

      {/* Contenedor del Mapa Interactivo Leaflet */}
      <div className="relative rounded-xl overflow-hidden border border-ucc-border dark:border-slate-700 shadow-inner h-56 w-full">
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
        
        {/* Overlay informativo en la esquina inferior */}
        <div className="absolute bottom-2 left-2 z-[999] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[0.68rem] font-bold text-slate-700 dark:text-slate-300 shadow-sm pointer-events-none">
          📍 Arrastra el marcador o haz clic en el mapa para ajustar
        </div>
      </div>

      {/* Barra de Integraciones (Google Maps & Waze) y Estado Validado */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-700/80">
        
        {/* Estado de Validación */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={15} />
          <span>Ubicación Georreferenciada ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</span>
        </div>

        {/* Botones de Integración Externa */}
        <div className="flex items-center gap-2">
          {/* Botón Google Maps */}
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[0.75rem] font-bold px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200"
            title="Abrir destino en Google Maps"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>Google Maps</span>
            <ExternalLink size={11} />
          </a>

          {/* Botón Waze */}
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#33ccff] hover:bg-[#20bbf0] text-[#0b1f3a] text-[0.75rem] font-black px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200"
            title="Abrir navegación en Waze"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24l-1.04 2.45c-.15.35.12.75.5.75h9.42c5.52 0 10-4.48 10-10S17.52 2 12 2zm-3.5 11c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
            <span>Waze</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
