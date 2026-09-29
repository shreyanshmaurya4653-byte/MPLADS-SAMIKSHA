import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Compass,
  Layers,
  ExternalLink,
  Navigation,
  Globe2,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  Mountain,
  Map as MapIcon,
  Satellite,
  Crosshair,
  SlidersHorizontal
} from 'lucide-react';
import { worksApi } from '../../api/worksApi';

// High-resolution tile providers for GIS surveyor mode
const TILE_LAYERS = {
  satellite: {
    name: 'Satellite View',
    icon: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
    maxZoom: 19
  },
  terrain: {
    name: 'Terrain & Contours',
    icon: Mountain,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
  },
  roadmap: {
    name: 'Roads & Streets',
    icon: MapIcon,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

// Custom SVG pulsing marker icon for GIS surveyor mode
function createCustomPin(isCalibrated = false) {
  const pinColor = isCalibrated ? '#10b981' : '#dc2626';
  const pulseColor = isCalibrated ? 'rgba(16, 185, 129, 0.4)' : 'rgba(220, 38, 38, 0.4)';

  return L.divIcon({
    className: 'custom-geo-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${pulseColor}; animation: pulse 1.8s infinite;"></div>
        <div style="position: relative; width: 28px; height: 28px; background: ${pinColor}; border: 2.5px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <div style="width: 10px; height: 10px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

export function ProjectGeoMap({ work, geoLocation, onLocationUpdated }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Map Engine: 'google' (Official Google Map) or 'surveyor' (Interactive Leaflet with GPS Calibrator)
  const [mapEngine, setMapEngine] = useState('google');
  
  // Google Map type: 'h' (Hybrid satellite + labels), 'p' (Terrain), 'm' (Roadmap)
  const [googleMapType, setGoogleMapType] = useState('h');
  const [googleZoom, setGoogleZoom] = useState(17);

  // Surveyor mode layer: 'satellite', 'terrain', 'roadmap'
  const [surveyorLayer, setSurveyorLayer] = useState('satellite');
  const [isCalibrating, setIsCalibrating] = useState(false);

  const [currentCoords, setCurrentCoords] = useState({
    lat: geoLocation?.latitude || 25.3176,
    lng: geoLocation?.longitude || 82.9739
  });
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync coords if geoLocation updates from parent
  useEffect(() => {
    if (geoLocation?.latitude && geoLocation?.longitude) {
      setCurrentCoords({
        lat: Number(geoLocation.latitude),
        lng: Number(geoLocation.longitude)
      });
    }
  }, [geoLocation]);

  // Initialize Leaflet Map only when surveyor mode is active
  useEffect(() => {
    if (mapEngine !== 'surveyor') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = currentCoords.lat;
      const initialLng = currentCoords.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Set initial tile layer
      const layerConfig = TILE_LAYERS[surveyorLayer];
      const tileLayer = L.tileLayer(layerConfig.url, {
        maxZoom: layerConfig.maxZoom,
        attribution: layerConfig.attribution
      }).addTo(map);
      currentTileLayerRef.current = tileLayer;

      // Add Geofence verification boundary circle
      const geofenceCircle = L.circle([initialLat, initialLng], {
        radius: geoLocation?.geofence_radius || 150,
        color: '#3b82f6',
        fillColor: '#60a5fa',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 6'
      }).addTo(map);
      circleRef.current = geofenceCircle;

      // Add Project Marker
      const pinIcon = createCustomPin(geoLocation?.is_calibrated || geoLocation?.location_status === 'OFFICER_CALIBRATED');
      const marker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: false
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 11px; padding: 2px;">
          <div style="font-weight: 800; color: #0b3b60; margin-bottom: 2px;">${work?.title || 'MPLADS Project Work'}</div>
          <div style="color: #64748b; font-size: 10px;">ID: #${work?.id} &bull; ${work?.category || 'Infrastructure'}</div>
          <div style="margin-top: 4px; display: flex; gap: 8px;">
            <span style="font-weight: bold; color: #059669;">Progress: ${work?.physical_progress || 0}%</span>
            <span style="color: #0284c7;">Sanctioned: ₹${((work?.sanctioned_amount || 0) / 100000).toFixed(1)}L</span>
          </div>
        </div>
      `);

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapEngine]);

  // Handle Surveyor Layer Switching
  useEffect(() => {
    if (mapEngine !== 'surveyor' || !mapInstanceRef.current) return;

    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }

    const layerConfig = TILE_LAYERS[surveyorLayer];
    const newTileLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
      attribution: layerConfig.attribution
    }).addTo(mapInstanceRef.current);

    currentTileLayerRef.current = newTileLayer;
  }, [surveyorLayer, mapEngine]);

  // Handle Calibration Mode Toggle in Surveyor
  useEffect(() => {
    if (mapEngine !== 'surveyor') return;

    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker) return;

    if (isCalibrating) {
      marker.dragging?.enable();

      const onDragEnd = (e) => {
        const { lat, lng } = e.target.getLatLng();
        setCurrentCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
        circle?.setLatLng([lat, lng]);
      };

      const onMapClick = (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle?.setLatLng([lat, lng]);
        setCurrentCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
      };

      marker.on('dragend', onDragEnd);
      map.on('click', onMapClick);

      return () => {
        marker.off('dragend', onDragEnd);
        map.off('click', onMapClick);
      };
    } else {
      marker.dragging?.disable();
    }
  }, [isCalibrating, mapEngine]);

  // Save calibrated location back to backend
  const handleSaveLocation = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await worksApi.updateWorkLocation(work.id, {
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        location_address: geoLocation?.location_address,
        officer_remarks: officerRemarks
      });

      setSaveSuccess(true);
      setIsCalibrating(false);

      if (markerRef.current) {
        markerRef.current.setIcon(createCustomPin(true));
      }

      if (onLocationUpdated) {
        onLocationUpdated(updated);
      }

      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      alert(`Failed to save calibrated location: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Exact location query prioritization (uses real village/district name or calibrated coordinates)
  const exactQuery = isCalibrating || geoLocation?.is_calibrated || geoLocation?.location_status === 'OFFICER_CALIBRATED'
    ? `${currentCoords.lat},${currentCoords.lng}`
    : (geoLocation?.canonical_search_query || geoLocation?.location_address || `${currentCoords.lat},${currentCoords.lng}`);

  // Google Maps Direct URLs
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exactQuery)}`;
  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(exactQuery)}`;
  const googleEarthUrl = `https://earth.google.com/web/search/${encodeURIComponent(exactQuery)}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentCoords.lat},${currentCoords.lng}`;

  // Embedded Google Map Iframe Source URL with official Google Maps pins, satellite & terrain
  const googleEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(exactQuery)}&t=${googleMapType}&z=${googleZoom}&ie=UTF8&iwloc=&output=embed`;

  const statusPill = geoLocation?.location_status === 'OFFICER_CALIBRATED'
    ? { text: 'Officer Field Calibrated', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    : (geoLocation?.confidence_score >= 95
      ? { text: 'Google Maps & ISRO Validated', bg: 'bg-blue-100 text-blue-800 border-blue-300' }
      : { text: 'Geocoded Projected Pin', bg: 'bg-amber-100 text-amber-800 border-amber-300' });

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
      isFullScreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative w-full'
    }`}>
      {/* Top Header Bar */}
      <div className="bg-[#0b3b60] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-red-600 text-white rounded-md shadow-sm">
            <MapPin size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
                Google Maps Project Site View
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusPill.bg}`}>
                {statusPill.text}
              </span>
            </div>
            <p className="text-[10px] text-slate-200 mt-0.5 truncate max-w-md">
              {geoLocation?.location_address || `${work?.title}, ${work?.subdivision || ''}`}
            </p>
          </div>
        </div>

        {/* Engine Switcher (Google Maps vs Surveyor) & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Engine Selector */}
          <div className="bg-[#07263f] p-0.5 rounded-lg border border-[#124d7b] flex items-center text-xs">
            <button
              onClick={() => {
                setMapEngine('google');
                setIsCalibrating(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                mapEngine === 'google'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MapPin size={12} className={mapEngine === 'google' ? 'text-red-700' : 'text-amber-400'} />
              <span>Google Maps</span>
            </button>
            <button
              onClick={() => setMapEngine('surveyor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                mapEngine === 'surveyor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Crosshair size={12} />
              <span>Surveyor & Calibrate</span>
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 bg-[#124d7b] text-white rounded hover:bg-[#185e94]"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Sub-bar: Layer Controls & Action Links */}
      <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Layer Selector based on Active Engine */}
        {mapEngine === 'google' ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Layers size={13} className="text-blue-600" />
              Google Map Layer:
            </span>
            <button
              onClick={() => setGoogleMapType('h')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all flex items-center gap-1 ${
                googleMapType === 'h'
                  ? 'bg-[#0b3b60] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Satellite size={12} />
              Satellite (Hybrid)
            </button>
            <button
              onClick={() => setGoogleMapType('p')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all flex items-center gap-1 ${
                googleMapType === 'p'
                  ? 'bg-[#0b3b60] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Mountain size={12} />
              Terrain & Contours
            </button>
            <button
              onClick={() => setGoogleMapType('m')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all flex items-center gap-1 ${
                googleMapType === 'm'
                  ? 'bg-[#0b3b60] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <MapIcon size={12} />
              Roadmap / Streets
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Layers size={13} className="text-blue-600" />
              GIS Surveyor Layer:
            </span>
            {Object.entries(TILE_LAYERS).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSurveyorLayer(key)}
                  className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all flex items-center gap-1 ${
                    surveyorLayer === key
                      ? 'bg-[#0b3b60] text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  <Icon size={12} />
                  {config.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Right: Direct Google Maps Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <a
            href={googleMapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition-colors shadow-2xs text-[11px]"
            title="Open project site in full Google Maps app or website"
          >
            <MapPin size={12} />
            <span>Open in Google Maps</span>
            <ExternalLink size={10} />
          </a>

          <a
            href={googleDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-white text-slate-700 border border-slate-300 rounded font-semibold hover:bg-slate-50 transition-colors text-[11px]"
            title="Get turn-by-turn driving directions to project site"
          >
            <Navigation size={12} className="text-emerald-600" />
            <span>Directions</span>
          </a>

          <a
            href={googleEarthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-white text-slate-700 border border-slate-300 rounded font-semibold hover:bg-slate-50 transition-colors text-[11px]"
            title="Explore project terrain in Google Earth 3D"
          >
            <Globe2 size={12} className="text-blue-600" />
            <span>Earth 3D</span>
          </a>

          <a
            href={streetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-white text-slate-700 border border-slate-300 rounded font-semibold hover:bg-slate-50 transition-colors text-[11px]"
            title="Inspect ground panorama in Street View"
          >
            <Eye size={12} className="text-purple-600" />
            <span>Street View</span>
          </a>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full h-[450px] sm:h-[500px] bg-slate-900">
        {mapEngine === 'google' ? (
          /* Official Google Maps Interactive Embedded View */
          <div className="w-full h-full relative">
            <iframe
              title="Google Map Project Site"
              src={googleEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />

            {/* Quick Re-calibrate Trigger for Officers */}
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => {
                  setMapEngine('surveyor');
                  setIsCalibrating(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-lg border border-amber-600 transition-transform hover:scale-105"
              >
                <Crosshair size={13} />
                <span>Calibrate / Reposition GPS Pin</span>
              </button>
            </div>
          </div>
        ) : (
          /* Interactive Surveyor & Calibrator Canvas (Leaflet with Draggable Marker) */
          <div className="w-full h-full relative">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Calibration Controls */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              {!isCalibrating ? (
                <button
                  onClick={() => setIsCalibrating(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-lg border border-amber-600"
                >
                  <MapPin size={13} />
                  <span>Start Pin Drag / Calibration</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg shadow-xl border border-slate-300">
                  <span className="text-[10px] text-red-600 font-bold px-2 animate-pulse">
                    Drag pin or click map to reposition
                  </span>
                  <button
                    onClick={() => setIsCalibrating(false)}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Coordinates HUD at bottom-left */}
        <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-[11px] space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400">
              {currentCoords.lat.toFixed(6)}° N, {currentCoords.lng.toFixed(6)}° E
            </span>
            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
              WGS-84 Datum
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-300">
            <span>Elevation: ~{geoLocation?.elevation || 85}m MSL</span>
            <span>&bull;</span>
            <span>Geofence: 150m Perimeter</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Terrain: {geoLocation?.terrain || 'Gangetic Alluvial Lowland'}
          </div>
        </div>
      </div>

      {/* Officer Location Calibration Save Tray (Visible when in calibration mode) */}
      {isCalibrating && (
        <div className="bg-amber-50 p-4 border-t border-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex-1 w-full space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-700" />
              Administrative Location Recalibration
            </div>
            <p className="text-[11px] text-amber-800">
              Drag the red marker or click directly on the satellite/terrain image to set the precise project coordinates.
            </p>
            <input
              type="text"
              placeholder="Enter field calibration remarks (e.g. Verified by Junior Engineer on-site)..."
              value={officerRemarks}
              onChange={(e) => setOfficerRemarks(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-amber-300 rounded mt-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveLocation}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving to Ledger...' : 'Save Updated Coordinates'}
            </button>
          </div>
        </div>
      )}

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="bg-emerald-50 px-4 py-2.5 border-t border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Coordinates successfully updated in database and recorded in the immutable audit ledger!
          </div>
        </div>
      )}
    </div>
  );
}
