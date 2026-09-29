import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { useLanguage } from '../hooks/useLanguage';
import {
  MapPin,
  Layers,
  ShieldAlert,
  DollarSign,
  Compass,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Navigation,
  Globe2,
  Satellite,
  Mountain,
  Map as MapIcon,
  Filter,
  CheckCircle2,
  Activity,
  Flame,
  PieChart,
  Eye,
  Crosshair
} from 'lucide-react';
import { worksApi } from '../api/worksApi';
import { jurisdictionApi } from '../api/jurisdictionApi';
import { Loader } from '../components/common/Loader';
import { useAuth } from '../hooks/useAuth';

// High-resolution tile layers
const GIS_LAYERS = {
  satellite: {
    name: 'Satellite View',
    icon: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
    maxZoom: 19
  },
  terrain: {
    name: 'Terrain & Topo',
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

// National Geodetic State Centroids for smooth camera flight
const STATE_COORDINATES = {
  1: { name: 'Andhra Pradesh', lat: 15.9129, lng: 79.7400, zoom: 7 },
  2: { name: 'Arunachal Pradesh', lat: 28.2180, lng: 94.7278, zoom: 7 },
  3: { name: 'Assam', lat: 26.2006, lng: 92.9376, zoom: 7 },
  4: { name: 'Bihar', lat: 25.0961, lng: 85.3131, zoom: 7 },
  5: { name: 'Chhattisgarh', lat: 21.2787, lng: 81.8661, zoom: 7 },
  6: { name: 'Goa', lat: 15.2993, lng: 74.1240, zoom: 9 },
  7: { name: 'Gujarat', lat: 22.2587, lng: 71.1924, zoom: 7 },
  8: { name: 'Haryana', lat: 29.0588, lng: 76.0856, zoom: 8 },
  9: { name: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, zoom: 7 },
  10: { name: 'Jharkhand', lat: 23.6102, lng: 85.2799, zoom: 7 },
  11: { name: 'Karnataka', lat: 15.3173, lng: 75.7139, zoom: 7 },
  12: { name: 'Kerala', lat: 10.8505, lng: 76.2711, zoom: 7 },
  13: { name: 'Madhya Pradesh', lat: 22.9734, lng: 78.6569, zoom: 6 },
  14: { name: 'Maharashtra', lat: 19.7515, lng: 75.7139, zoom: 6 },
  15: { name: 'Manipur', lat: 24.6637, lng: 93.9063, zoom: 8 },
  16: { name: 'Meghalaya', lat: 25.4670, lng: 91.3662, zoom: 8 },
  17: { name: 'Mizoram', lat: 23.1645, lng: 92.9376, zoom: 8 },
  18: { name: 'Nagaland', lat: 26.1584, lng: 94.5624, zoom: 8 },
  19: { name: 'Odisha', lat: 20.9517, lng: 85.0985, zoom: 7 },
  20: { name: 'Punjab', lat: 31.1471, lng: 75.3412, zoom: 7 },
  21: { name: 'Rajasthan', lat: 27.0238, lng: 74.2179, zoom: 6 },
  22: { name: 'Sikkim', lat: 27.5330, lng: 88.5122, zoom: 9 },
  23: { name: 'Tamil Nadu', lat: 11.1271, lng: 78.6569, zoom: 7 },
  24: { name: 'Telangana', lat: 18.1124, lng: 79.0193, zoom: 7 },
  25: { name: 'Tripura', lat: 23.9408, lng: 91.9882, zoom: 8 },
  26: { name: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, zoom: 6 },
  27: { name: 'Uttarakhand', lat: 30.0668, lng: 79.0193, zoom: 7 },
  28: { name: 'West Bengal', lat: 22.9868, lng: 87.8550, zoom: 7 },
  32: { name: 'Delhi', lat: 28.7041, lng: 77.1025, zoom: 10 }
};

// Clustering Helper: Groups nearby projects in a selected district
function clusterProjects(worksList, distanceThreshold = 0.04) {
  const clusters = [];

  for (const work of worksList) {
    const lat = Number(work.latitude);
    const lng = Number(work.longitude);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

    let addedToCluster = false;
    for (const cluster of clusters) {
      const dLat = Math.abs(cluster.centerLat - lat);
      const dLng = Math.abs(cluster.centerLng - lng);
      if (dLat < distanceThreshold && dLng < distanceThreshold) {
        cluster.works.push(work);
        cluster.totalSanctioned += (work.sanctioned_amount || 0);
        cluster.totalSpent += (work.expenditure || 0);
        if (work.risk_score >= 60) cluster.anomalyCount++;
        // Recalculate center
        cluster.centerLat = (cluster.centerLat * (cluster.works.length - 1) + lat) / cluster.works.length;
        cluster.centerLng = (cluster.centerLng * (cluster.works.length - 1) + lng) / cluster.works.length;
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      clusters.push({
        centerLat: lat,
        centerLng: lng,
        works: [work],
        totalSanctioned: (work.sanctioned_amount || 0),
        totalSpent: (work.expenditure || 0),
        anomalyCount: (work.risk_score >= 60 ? 1 : 0)
      });
    }
  }

  return clusters;
}

export function NationalMap() {
  const { language } = useLanguage();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const heatLayerRef = useRef(null);

  // 3 Primary GIS Mode Sections: 'cost' | 'anomaly' | 'heatmap'
  const [gisSection, setGisSection] = useState('anomaly');
  const [activeTileLayer, setActiveTileLayer] = useState('satellite');

  const { user } = useAuth();
  const role = user?.role || 'Ministry';
  const isDistrict = role === 'District';
  const isState = role === 'State';
  const isMP = role === 'MP';

  const [statesList, setStatesList] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState(user?.state_id || 1);
  const [districtsList, setDistrictsList] = useState([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState(isDistrict ? (user?.district_id || 'All') : 'All');
  
  const [selectedHouseType, setSelectedHouseType] = useState('All');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  // Load States & Districts Hierarchy
  useEffect(() => {
    async function loadGeoHierarchy() {
      try {
        const res = await jurisdictionApi.getHierarchy();
        if (res.states && res.states.length > 0) {
          setStatesList(res.states);
        }
        if (res.districts && res.districts.length > 0) {
          setDistrictsList(res.districts);
        }

        // Lock jurisdiction according to user role
        if (isDistrict && user?.district_id) {
          setSelectedDistrictId(user.district_id);
          if (user?.state_id) setSelectedStateId(user.state_id);
        } else if (isState && user?.state_id) {
          setSelectedStateId(user.state_id);
          setSelectedDistrictId('All');
        } else if (isMP) {
          if (user?.state_id) setSelectedStateId(user.state_id);
          if (user?.district_id) setSelectedDistrictId(user.district_id);
          if (user?.house_type) setSelectedHouseType(user.house_type);
        }
      } catch (err) {
        console.warn('Failed to load geo hierarchy:', err);
      }
    }
    loadGeoHierarchy();
  }, [user?.role, user?.district_id, user?.state_id]);

  // Filter districts when state changes
  const filteredDistricts = districtsList.filter(
    (d) => selectedStateId === 'All' || d.state_id === Number(selectedStateId)
  );

  // Fetch works for selected State, District & House Type
  useEffect(() => {
    async function fetchMapWorks() {
      setLoading(true);
      try {
        const params = { limit: 250 };
        if (selectedStateId && selectedStateId !== 'All') {
          params.state_id = selectedStateId;
        }
        if (selectedDistrictId && selectedDistrictId !== 'All') {
          params.district_id = selectedDistrictId;
        }
        if (selectedHouseType && selectedHouseType !== 'All') {
          params.house_type = selectedHouseType;
        }
        if (isMP && user?.name) {
          params.mp_name = user.name;
        }
        const data = await worksApi.getWorks(params);
        setWorks(data || []);
        if (data && data.length > 0) {
          setSelectedProject(data[0]);
        }
      } catch (err) {
        console.error('Failed to load map works:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMapWorks();
  }, [selectedStateId, selectedDistrictId, selectedHouseType, isMP, user?.name]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialTarget = STATE_COORDINATES[selectedStateId] || { lat: 15.9129, lng: 79.7400, zoom: 7 };

      const map = L.map(mapContainerRef.current, {
        center: [initialTarget.lat, initialTarget.lng],
        zoom: initialTarget.zoom,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Tile Layer
      const layerCfg = GIS_LAYERS[activeTileLayer];
      const tileLayer = L.tileLayer(layerCfg.url, {
        maxZoom: layerCfg.maxZoom,
        attribution: layerCfg.attribution
      }).addTo(map);
      currentTileLayerRef.current = tileLayer;

      // Group for markers & clusters
      const markerGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markerGroup;

      const heatGroup = L.layerGroup().addTo(map);
      heatLayerRef.current = heatGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Tile Layer Switching (Satellite vs Terrain vs Roadmap)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }

    const layerCfg = GIS_LAYERS[activeTileLayer];
    const newTileLayer = L.tileLayer(layerCfg.url, {
      maxZoom: layerCfg.maxZoom,
      attribution: layerCfg.attribution
    }).addTo(mapInstanceRef.current);

    currentTileLayerRef.current = newTileLayer;
  }, [activeTileLayer]);

  // Smooth Zoom/FlyTo when State or District changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (works.length > 0) {
      // Compute bounding box of works in selected district
      const validCoords = works
        .map(w => [Number(w.latitude), Number(w.longitude)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: selectedDistrictId !== 'All' ? 12 : 8, duration: 1.2 });
        return;
      }
    }

    const target = STATE_COORDINATES[selectedStateId] || { lat: 15.9129, lng: 79.7400, zoom: 7 };
    map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.2 });
  }, [selectedStateId, selectedDistrictId, works]);

  // Render Section Layers & District Clusters on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markersLayerRef.current;
    const heatGroup = heatLayerRef.current;
    if (!map || !markerGroup || !heatGroup) return;

    markerGroup.clearLayers();
    heatGroup.clearLayers();

    if (works.length === 0) return;

    // Cluster points within the district
    const clusters = clusterProjects(works, 0.05);

    // MODE 3: HEATMAP SECTION
    if (gisSection === 'heatmap') {
      clusters.forEach((cluster) => {
        const count = cluster.works.length;
        const radius = Math.min(6000, Math.max(1200, count * 600));
        const color = cluster.anomalyCount > 0 ? '#ef4444' : '#3b82f6';

        // Outer glow circle
        L.circle([cluster.centerLat, cluster.centerLng], {
          radius: radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.28,
          weight: 1.5
        }).addTo(heatGroup);

        // Core hotspot
        L.circle([cluster.centerLat, cluster.centerLng], {
          radius: radius * 0.45,
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 0.5,
          weight: 0
        }).addTo(heatGroup);
      });
    }

    // Plot Clusters & Project Pins
    clusters.forEach((cluster) => {
      const isMulti = cluster.works.length > 1;

      // 1. If cluster has multiple works, render District Cluster Bubble
      if (isMulti) {
        let clusterBg = '#0b3b60'; // Default Blue
        let clusterBorder = '#38bdf8';
        let badgeLabel = `${cluster.works.length} Works`;

        if (gisSection === 'cost') {
          clusterBg = '#4f46e5'; // Indigo for cost
          clusterBorder = '#a5b4fc';
          badgeLabel = `₹${(cluster.totalSanctioned / 10000000).toFixed(1)} Cr`;
        } else if (gisSection === 'anomaly') {
          if (cluster.anomalyCount > 0) {
            clusterBg = '#dc2626'; // Red for anomaly
            clusterBorder = '#fca5a5';
            badgeLabel = `${cluster.anomalyCount} Flagged`;
          }
        }

        const clusterIcon = L.divIcon({
          className: 'district-cluster-bubble',
          html: `
            <div style="background: ${clusterBg}; border: 2.5px solid ${clusterBorder}; color: white; border-radius: 9999px; padding: 4px 9px; box-shadow: 0 4px 14px rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; gap: 4px; font-weight: 800; font-size: 11px; white-space: nowrap; cursor: pointer;">
              <span>${badgeLabel}</span>
              <span style="font-size: 9px; opacity: 0.85;">(${cluster.works.length})</span>
            </div>
          `,
          iconSize: [80, 28],
          iconAnchor: [40, 14]
        });

        const clusterMarker = L.marker([cluster.centerLat, cluster.centerLng], { icon: clusterIcon }).addTo(markerGroup);

        clusterMarker.on('click', () => {
          map.setView([cluster.centerLat, cluster.centerLng], map.getZoom() + 2, { animate: true });
          if (cluster.works.length > 0) {
            setSelectedProject(cluster.works[0]);
          }
        });
      }

      // 2. Individual Project Pins within cluster
      cluster.works.forEach((w) => {
        const lat = Number(w.latitude);
        const lng = Number(w.longitude);
        if (!lat || !lng) return;

        let pinColor = '#10b981'; // Green

        if (gisSection === 'cost') {
          // Color by Sanction Amount
          if (w.sanctioned_amount >= 5000000) pinColor = '#7c3aed'; // Purple (>50L)
          else if (w.sanctioned_amount >= 2000000) pinColor = '#0284c7'; // Blue (20-50L)
          else pinColor = '#059669'; // Teal (<20L)
        } else if (gisSection === 'anomaly') {
          // Color by Anomaly & Risk
          if (w.risk_score >= 65 || w.status === 'DELAYED') pinColor = '#dc2626'; // Red Critical
          else if (w.risk_score >= 40) pinColor = '#f59e0b'; // Amber Moderate
          else pinColor = '#10b981'; // Green Low
        } else {
          // Heatmap mode
          pinColor = '#f97316'; // Orange
        }

        const projectPinIcon = L.divIcon({
          className: 'project-single-pin',
          html: `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="width: 20px; height: 20px; background: ${pinColor}; border: 2px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
                <div style="width: 6px; height: 6px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
              </div>
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 26],
          popupAnchor: [0, -26]
        });

        const singleMarker = L.marker([lat, lng], { icon: projectPinIcon }).addTo(markerGroup);

        const googleMapsSearchUrl = w.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

        singleMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; min-width: 230px; padding: 2px;">
            <div style="font-weight: 800; color: #0b3b60; margin-bottom: 2px;">${w.title}</div>
            <div style="color: #64748b; font-size: 10px;">ID: #${w.id} &bull; ${w.category || 'Infrastructure'}</div>
            
            <div style="margin: 6px 0; background: #f8fafc; padding: 4px; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #059669;">Progress: ${w.physical_progress || 0}%</span>
              <span style="color: #0284c7; font-weight: bold;">₹${((w.sanctioned_amount || 0) / 100000).toFixed(1)} Lakhs</span>
            </div>

            <div style="font-size: 10px; color: ${w.risk_score >= 60 ? '#dc2626' : '#059669'}; font-weight: bold; margin-bottom: 6px;">
              ${w.risk_score >= 60 ? '⚠️ High Outlier Anomaly Flagged' : '✓ Standard Execution Range'}
            </div>

            <div style="display: flex; gap: 4px;">
              <a href="${googleMapsSearchUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #dc2626; color: white; padding: 3px 6px; border-radius: 4px; font-weight: bold; text-decoration: none; font-size: 10px;">
                Google Maps
              </a>
              <a href="/works/${encodeURIComponent(w.id)}" style="flex: 1; text-align: center; background: #0b3b60; color: white; padding: 3px 6px; border-radius: 4px; font-weight: bold; text-decoration: none; font-size: 10px;">
                Open Dossier
              </a>
            </div>
          </div>
        `);

        singleMarker.on('click', () => {
          setSelectedProject(w);
        });
      });
    });
  }, [works, gisSection]);

  // Selected project Google Maps query & embed
  const selectedGoogleQuery = selectedProject
    ? (selectedProject.canonical_search_query || selectedProject.location_address || `${selectedProject.title}, ${selectedProject.district_name || ''}, India`)
    : 'India';
  const selectedGoogleEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(selectedGoogleQuery)}&t=h&z=16&output=embed`;
  const selectedGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedGoogleQuery)}`;

  return (
    <div className="space-y-5">
      {/* Top Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="text-[#0b3b60]" size={24} />
            <h1 className="text-xl font-bold text-slate-900">
              {language === 'hi' ? 'जिला भू-स्थानिक जीआईएस विश्लेषण एवं मानचित्र' : 'District Geospatial GIS Clustering & Analysis'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? 'लागत, विसंगति, एवं घनत्व हीटमैप आधारित जिला क्लस्टरिंग और गूगल मैप साइट सत्यापन'
              : 'Multi-layer GIS Intelligence: Cost Disbursals, AI Anomalies, and Density Heatmap Clusters with Google Maps Site View'}
          </p>
        </div>

        {/* 3 Primary GIS Section Switchers (Cost / Anomaly / Heatmap) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs shadow-inner">
          <button
            onClick={() => setGisSection('cost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
              gisSection === 'cost'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-indigo-900'
            }`}
          >
            <DollarSign size={14} />
            <span>Cost Analysis</span>
          </button>

          <button
            onClick={() => setGisSection('anomaly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
              gisSection === 'anomaly'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-red-900'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Anomaly Clusters</span>
          </button>

          <button
            onClick={() => setGisSection('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
              gisSection === 'heatmap'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-amber-900'
            }`}
          >
            <Flame size={14} />
            <span>Density Heatmap</span>
          </button>
        </div>
      </div>

      {/* District & State Jurisdiction Selector Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-blue-600" />
          <span className="font-bold text-slate-800">Select Focus Jurisdiction:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isDistrict ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold">
              <MapPin size={13} className="text-emerald-600" />
              <span>Assigned District: {user?.district_name || 'District Authority'} ({user?.state_name || 'State'})</span>
            </div>
          ) : isMP ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 font-bold">
              <MapPin size={13} className="text-blue-600" />
              <span>{user?.name || "Hon'ble MP"} &bull; {user?.constituency_name || 'Constituency Scope'}</span>
            </div>
          ) : (
            <>
              {/* State Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">State:</span>
                {isState ? (
                  <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded font-bold text-purple-800">
                    {user?.state_name || 'Assigned State'}
                  </span>
                ) : (
                  <select
                    value={selectedStateId}
                    onChange={(e) => {
                      setSelectedStateId(e.target.value);
                      setSelectedDistrictId('All');
                    }}
                    className="border border-slate-300 rounded px-3 py-1.5 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    {statesList.map((s) => (
                      <option key={s.state_id} value={s.state_id}>
                        {s.state_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* District Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">District:</span>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-1.5 bg-slate-50 font-bold text-[#0b3b60] focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="All">All Districts in State ({filteredDistricts.length})</option>
                  {filteredDistricts.map((d) => (
                    <option key={d.district_id} value={d.district_id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parliamentary House Type (Lok Sabha / Rajya Sabha) */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">House:</span>
                <select
                  value={selectedHouseType}
                  onChange={(e) => setSelectedHouseType(e.target.value)}
                  className="border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="All">All Houses (LS & RS)</option>
                  <option value="Lok Sabha">Lok Sabha</option>
                  <option value="Rajya Sabha">Rajya Sabha</option>
                </select>
              </div>
            </>
          )}

          {/* Tile Layer Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            {Object.entries(GIS_LAYERS).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTileLayer(key)}
                  className={`p-1.5 rounded text-[11px] font-semibold flex items-center gap-1 ${
                    activeTileLayer === key
                      ? 'bg-[#0b3b60] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={config.name}
                >
                  <Icon size={12} />
                  <span className="hidden sm:inline">{config.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Context Info */}
        <div className="text-[11px] font-bold text-slate-600 flex items-center gap-2">
          {gisSection === 'cost' && (
            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Purple: &gt; ₹50L &bull; Blue: ₹20-50L &bull; Teal: &lt; ₹20L
            </span>
          )}
          {gisSection === 'anomaly' && (
            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
              Red: High/Critical Risk &bull; Amber: Medium &bull; Green: Low
            </span>
          )}
          {gisSection === 'heatmap' && (
            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Glowing rings indicate project concentration density
            </span>
          )}
        </div>
      </div>

      {/* Main Map View & Selected Project Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Full Leaflet GIS Map Canvas */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm relative min-h-[580px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[580px] z-0" />

          {/* Active Mode Banner Badge */}
          <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 text-xs font-bold flex items-center gap-2">
            {gisSection === 'cost' && <DollarSign size={14} className="text-indigo-400" />}
            {gisSection === 'anomaly' && <AlertTriangle size={14} className="text-red-400" />}
            {gisSection === 'heatmap' && <Flame size={14} className="text-amber-400" />}
            <span className="capitalize">{gisSection} Cluster Mode Active</span>
            <span className="text-slate-400 font-normal">({works.length} Sites Located)</span>
          </div>

          {/* Tip to click clusters */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded text-[10px]">
            * Click any bubble cluster to zoom into projects &bull; Click pin to inspect Google Map
          </div>
        </div>

        {/* Selected Project Dossier & Live Google Maps View */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          {selectedProject ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Selected District Project
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      selectedProject.risk_score >= 60
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : selectedProject.risk_score >= 35
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    Risk {selectedProject.risk_score || 0}/100
                  </span>
                </div>
                <h2 className="text-sm font-extrabold text-slate-900 mt-1 leading-snug">
                  {selectedProject.title}
                </h2>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ID: #{selectedProject.id} &bull; {selectedProject.category || 'Infrastructure'}
                </div>
              </div>

              {/* Exact Location & Coordinates Badge */}
              <div className="bg-blue-50/70 p-2.5 rounded border border-blue-200 text-[11px] space-y-0.5">
                <div className="font-bold text-blue-950 flex items-center gap-1">
                  <MapPin size={12} className="text-red-600" />
                  <span>Exact Georeferenced Coordinates:</span>
                </div>
                <div className="font-mono text-blue-900 font-semibold">
                  {selectedProject.latitude ? Number(selectedProject.latitude).toFixed(6) : 0}° N, {selectedProject.longitude ? Number(selectedProject.longitude).toFixed(6) : 0}° E
                </div>
                <div className="text-[10px] text-slate-600 truncate" title={selectedProject.location_address}>
                  {selectedProject.location_address || 'Geocoded Project Site'}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Sanctioned</span>
                  <span className="font-black text-slate-800">
                    ₹{((selectedProject.sanctioned_amount || 0) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Spent</span>
                  <span className="font-black text-blue-700">
                    ₹{((selectedProject.expenditure || 0) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Progress</span>
                  <span className="font-black text-emerald-700">
                    {selectedProject.physical_progress || 0}% Complete
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Subdivision</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {selectedProject.subdivision || 'Main'}
                  </span>
                </div>
              </div>

              {/* Embedded Google Maps Live Satellite View */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-red-600">
                    <Satellite size={13} /> Google Maps Optical Satellite View
                  </span>
                  <a
                    href={selectedGoogleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Open Full Map <ExternalLink size={10} />
                  </a>
                </div>

                <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-300 shadow-inner relative">
                  <iframe
                    title="Google Maps Site Inspection"
                    src={selectedGoogleEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={selectedGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-2xs"
                >
                  <MapPin size={13} />
                  <span>Google Maps</span>
                </a>

                <Link
                  to={`/works/${encodeURIComponent(selectedProject.id)}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0b3b60] hover:bg-[#124d7b] text-white rounded text-xs font-bold transition-colors"
                >
                  <span>Open Dossier</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Click any project pin or cluster bubble on the GIS map to inspect the site and Google Maps view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
