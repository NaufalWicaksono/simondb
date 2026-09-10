import React, { useEffect, useRef, useState } from 'react';
import { fetchRevitMapData } from '../services/revitalisasi';
import { Maximize2, MapPin, Loader2, RefreshCw } from 'lucide-react';

const loadLeafletCDN = () => {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const existingScript = document.getElementById('leaflet-js-cdn');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'leaflet-js-cdn';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve(window.L);
      script.onerror = (err) => reject(new Error('Gagal memuat pustaka Leaflet CDN'));
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => resolve(window.L));
    }
  });
};

export default function SchoolMap({ activeFilters }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const tileLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const leafletLibRef = useRef(null);

  const [mapType, setMapType] = useState('satelit'); // 'peta' | 'satelit'
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

  useEffect(() => {
    let isMounted = true;
    loadLeafletCDN()
      .then((L) => {
        if (isMounted) {
          leafletLibRef.current = L;
          setLeafletReady(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          setError('Gagal memuat pustaka peta Leaflet');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchRevitMapData(activeFilters)
      .then((data) => {
        if (isMounted) {
          setMapData(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching map data:', err);
          setError(err.message || 'Gagal memuat data koordinat peta');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeFilters]);

  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current) return;
    const L = leafletLibRef.current || window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-2.5489, 118.0149],
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
        preferCanvas: true,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tile = L.tileLayer(SATELLITE_URL, {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }).addTo(map);

      const labels = L.tileLayer(LABELS_URL, {
        maxZoom: 19,
      }).addTo(map);

      tileLayerRef.current = tile;
      labelLayerRef.current = labels;
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Auto-invalidate map size whenever container is resized
    const container = mapContainerRef.current;
    let resizeObserver = null;
    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = leafletLibRef.current || window.L;
    if (!L) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    if (labelLayerRef.current) {
      mapInstanceRef.current.removeLayer(labelLayerRef.current);
    }

    if (mapType === 'peta') {
      tileLayerRef.current = L.tileLayer(STREET_URL, {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
      labelLayerRef.current = null;
    } else {
      tileLayerRef.current = L.tileLayer(SATELLITE_URL, {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      labelLayerRef.current = L.tileLayer(LABELS_URL, {
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }
  }, [mapType]);

  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const L = leafletLibRef.current || window.L;
    if (!L) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    if (!mapData || mapData.length === 0) return;

    const bounds = L.latLngBounds();

    mapData.forEach((item) => {
      if (item.latitude && item.longitude) {
        const lat = parseFloat(item.latitude);
        const lng = parseFloat(item.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          bounds.extend([lat, lng]);

          const is3T = item.is_3t || (item.keterangan_wilayah && item.keterangan_wilayah !== 'Reguler');
          const markerColor = is3T ? '#8b5cf6' : '#10b981';

          const circle = L.circleMarker([lat, lng], {
            radius: 6,
            fillColor: markerColor,
            color: '#ffffff',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.75,
          });

          const formattedBantuan = item.nilai_bantuan
            ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.nilai_bantuan)
            : 'Rp 0';

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; padding: 4px; max-width: 260px;">
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px; line-height: 1.3;">
                ${item.nama_sekolah || 'Fasilitas Hub Logistik'}
              </div>
              <div style="display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
                <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; background: #e0f2fe; color: #0369a1; border-radius: 4px;">
                  KODE: ${item.npsn}
                </span>
                <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; background: ${is3T ? '#f3e8ff' : '#dcfce7'}; color: ${is3T ? '#6b21a8' : '#15803d'}; border-radius: 4px;">
                  ${item.jenjang || 'Hub'} ${is3T ? '(Wilayah 3T)' : ''}
                </span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.4;">
                📍 ${item.kabupaten || ''}, ${item.provinsi || ''}
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #0f766e; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
                Alokasi Investasi: ${formattedBantuan}
              </div>
            </div>
          `;

          circle.bindPopup(popupContent);
          layerGroup.addLayer(circle);
        }
      }
    });

    if (activeFilters && (activeFilters.provinsi?.length > 0 || activeFilters.kabupaten?.length > 0 || activeFilters.npsn?.length > 0)) {
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      }
    }
  }, [mapData, activeFilters]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const resetMapView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-2.5489, 118.0149], 5);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none mb-0' : 'relative'
      }`}
    >
      {/* MAP HEADER / BAR */}
      <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <MapPin size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 tracking-tight">
              Peta Sebaran Jaringan Hub & Fasilitas Distribusi Nasional
            </h3>
            <p className="text-xs text-gray-500">
              {loading ? (
                'Memuat titik koordinat...'
              ) : (
                <>
                  <span className="font-semibold text-emerald-600">{mapData.length.toLocaleString('id-ID')}</span> Fasilitas Teridentifikasi di 38 Provinsi
                </>
              )}
            </p>
          </div>
        </div>

        {/* MAP CONTROLS & TOGGLES */}
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner border border-gray-200/60">
            <button
              onClick={() => setMapType('peta')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                mapType === 'peta'
                  ? 'bg-white text-gray-800 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Peta
            </button>
            <button
              onClick={() => setMapType('satelit')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                mapType === 'satelit'
                  ? 'bg-white text-gray-800 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Satelit
            </button>
          </div>

          <button
            onClick={resetMapView}
            title="Reset Tampilan Peta"
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* MAP CANVAS CONTAINER */}
      <div className="relative w-full" style={{ height: isFullscreen ? 'calc(100vh - 60px)' : '480px' }}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {(!leafletReady || loading) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl shadow-md border border-gray-100 text-sm font-semibold text-gray-700">
              <Loader2 size={18} className="animate-spin text-emerald-600" />
              Memuat Peta Sebaran...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10 p-4">
            <div className="bg-red-50 text-red-700 p-4 rounded-xl max-w-md text-center border border-red-100 shadow-sm">
              <p className="text-sm font-semibold mb-1">Gagal Memuat Data Peta</p>
              <p className="text-xs text-red-500">{error}</p>
            </div>
          </div>
        )}

        {leafletReady && !loading && mapData.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs flex items-center gap-3 border border-white/10 shadow-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white inline-block"></span>
              <span>Hub Reguler</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500 border border-white inline-block"></span>
              <span>Pos Perbatasan / 3T</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
