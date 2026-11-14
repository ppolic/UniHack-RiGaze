import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import {
  GeoPoint,
  StationLocation,
  ParkingDetail,
  CityLandmarkPoi,
  RouteOptionDto,
} from '../../types/route';

interface WebLeafletMapProps {
  origin?: GeoPoint | null;
  destination?: GeoPoint | null;
  originName?: string;
  destinationName?: string;
  userLocation?: GeoPoint | null;
  isNavigating?: boolean;
  stations: StationLocation[];
  parkings: ParkingDetail[];
  landmarks: CityLandmarkPoi[];
  selectedOption?: RouteOptionDto | null;
  selectedPoiKey?: string | null;
  selectedParkingPolygon?: GeoPoint[] | null;
  isDarkMap: boolean;
  focusTarget?: { lat: number; lng: number; zoom?: number; nonce: number } | null;
  getModeStrokeColor: (mode: string) => string;
  getModeStrokeWidth: (mode: string) => number;
  getStationEmoji: (type: StationLocation['type']) => string;
  onMapClick: (pt: GeoPoint) => void;
  onDragOrigin: (pt: GeoPoint) => void;
  onDragDestination: (pt: GeoPoint) => void;
  onSelectStation: (station: StationLocation) => void;
  onSelectParking: (parking: ParkingDetail) => void;
  onSelectLandmark: (landmark: CityLandmarkPoi) => void;
}

/**
 * Real interactive Leaflet + OpenStreetMap view for Web (`Platform.OS === 'web'`).
 * Uses Aubergine-tinted CartoDB DarkMatter for Dark Mode and standard OSM/Voyager for Light Mode.
 */
export const WebLeafletMap: React.FC<WebLeafletMapProps> = ({
  origin,
  destination,
  originName = 'Polazište',
  destinationName = 'Odredište',
  userLocation,
  isNavigating = false,
  stations,
  parkings,
  landmarks,
  selectedOption,
  selectedPoiKey,
  selectedParkingPolygon,
  isDarkMap,
  focusTarget,
  getModeStrokeColor,
  getModeStrokeWidth,
  getStationEmoji,
  onMapClick,
  onDragOrigin,
  onDragDestination,
  onSelectStation,
  onSelectParking,
  onSelectLandmark,
}) => {
  const iframeRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Build self-contained Leaflet HTML once (updates flow via postMessage)
  const leafletHtml = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${colors.mapDarkLand};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .aubergine-tiles {
      filter: hue-rotate(212deg) saturate(1.45) brightness(0.95) contrast(1.06);
    }
    .ab-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -85%);
      pointer-events: auto;
    }
    .ab-circle {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      color: ${colors.textInverse};
      font-weight: 800;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid ${colors.surface};
      box-shadow: 0 3px 8px ${colors.overlay};
    }
    .ab-label {
      margin-top: 2px;
      background: ${colors.mapLabelBackground};
      color: ${colors.textInverse};
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 2px 5px ${colors.overlay};
    }
    .poi-dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid ${colors.surface};
      color: ${colors.textInverse};
      font-size: 12px;
      font-weight: 800;
      box-shadow: 0 2px 6px ${colors.overlay};
      cursor: pointer;
    }
    .poi-selected {
      transform: scale(1.25);
      border-color: ${colors.accent};
      border-width: 2.5px;
    }
    .transfer-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${colors.surface};
      border: 3px solid ${colors.primary};
      box-shadow: 0 2px 4px ${colors.overlay};
    }
    .gps-user-dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${colors.mapRouteTransit};
      border: 3.5px solid ${colors.surface};
      box-shadow: 0 0 0 6px ${colors.primary}55, 0 2px 8px ${colors.overlay};
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([45.7537, 21.2257], 14);

    var lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });
    var darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      className: 'aubergine-tiles'
    });

    var currentTileLayer = darkTiles.addTo(map);
    var currentIsDark = true;

    var routeLayer = L.layerGroup().addTo(map);
    var poiLayer = L.layerGroup().addTo(map);
    var abLayer = L.layerGroup().addTo(map);
    var lastFitSignature = '';

    map.on('click', function(e) {
      window.parent.postMessage(JSON.stringify({
        type: 'MAP_CLICK',
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6))
      }), '*');
    });

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, function(m) {
        return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m];
      });
    }

    function syncState(payload) {
      // 1. Toggle Dark (Aubergine) vs Light (Standard) tiles
      if (payload.isDarkMap !== currentIsDark) {
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        currentTileLayer = payload.isDarkMap ? darkTiles : lightTiles;
        currentTileLayer.addTo(map);
        currentIsDark = payload.isDarkMap;
      }

      // 2. Render Route Segments + Parking Polygon
      routeLayer.clearLayers();
      var boundsPoints = [];

      if (Array.isArray(payload.selectedParkingPolygon) && payload.selectedParkingPolygon.length >= 3) {
        var polyCoords = payload.selectedParkingPolygon.map(function(p) { return [p.lat, p.lng]; });
        L.polyline(polyCoords, { color: '${colors.accent}', weight: 4 }).addTo(routeLayer);
      }

      if (Array.isArray(payload.segments)) {
        payload.segments.forEach(function(seg) {
          if (!Array.isArray(seg.geometry) || seg.geometry.length < 2) return;
          var latlngs = seg.geometry.map(function(p) {
            boundsPoints.push([p.lat, p.lng]);
            return [p.lat, p.lng];
          });
          // Dark depth halo
          L.polyline(latlngs, {
            color: '${colors.mapRouteDarkHalo}',
            weight: seg.strokeWidth + 6,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(routeLayer);
          // White halo for non-walk modes
          if (!seg.isWalk) {
            L.polyline(latlngs, {
              color: '${colors.mapRouteOutline}',
              weight: seg.strokeWidth + 2.5,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(routeLayer);
          }
          // Inner vivid color
          L.polyline(latlngs, {
            color: seg.strokeColor,
            weight: seg.strokeWidth,
            dashArray: seg.isWalk ? '8, 8' : null,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(routeLayer);
        });

        // Transfer junction dots
        for (var i = 0; i < payload.segments.length - 1; i++) {
          var g = payload.segments[i].geometry;
          var nextSeg = payload.segments[i + 1];
          if (g && g.length > 0 && nextSeg) {
            var jPt = g[g.length - 1];
            var jIcon = L.divIcon({
              className: '',
              html: '<div class="transfer-dot" style="border-color:' + nextSeg.strokeColor + '"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            });
            L.marker([jPt.lat, jPt.lng], { icon: jIcon, interactive: false }).addTo(routeLayer);
          }
        }
      }

      // 3. Render Origin A (fixed to user location) & Destination B Markers + Live GPS User Marker
      abLayer.clearLayers();
      var canDragPins = !payload.isNavigating;
      if (payload.origin) {
        boundsPoints.push([payload.origin.lat, payload.origin.lng]);
        var iconA = L.divIcon({
          className: '',
          html: '<div class="ab-pin"><div class="ab-circle" style="background:${colors.primary}">A</div><div class="ab-label">' + escapeHtml(payload.originName) + '</div></div>',
          iconSize: [0, 0]
        });
        L.marker([payload.origin.lat, payload.origin.lng], { icon: iconA, draggable: false }).addTo(abLayer);
      }

      if (payload.destination) {
        boundsPoints.push([payload.destination.lat, payload.destination.lng]);
        var iconB = L.divIcon({
          className: '',
          html: '<div class="ab-pin"><div class="ab-circle" style="background:${colors.danger}">B</div><div class="ab-label">' + escapeHtml(payload.destinationName) + '</div></div>',
          iconSize: [0, 0]
        });
        var markerB = L.marker([payload.destination.lat, payload.destination.lng], { icon: iconB, draggable: canDragPins }).addTo(abLayer);
        markerB.on('dragend', function(ev) {
          var p = ev.target.getLatLng();
          window.parent.postMessage(JSON.stringify({
            type: 'DRAG_DEST',
            lat: Number(p.lat.toFixed(6)),
            lng: Number(p.lng.toFixed(6))
          }), '*');
        });
      }

      if (payload.userLocation) {
        var gpsIcon = L.divIcon({
          className: '',
          html: '<div class="gps-user-dot"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        L.marker([payload.userLocation.lat, payload.userLocation.lng], {
          icon: gpsIcon,
          interactive: false,
          zIndexOffset: 1000
        }).addTo(abLayer);
      }

      // 4. Render Filtered POIs
      poiLayer.clearLayers();
      (payload.stations || []).forEach(function(st) {
        var bg = st.isBike ? '${colors.modes.bicycle}' : '${colors.secondary}';
        var selClass = payload.selectedPoiKey === 'station:' + st.id ? ' poi-selected' : '';
        var icon = L.divIcon({
          className: '',
          html: '<div class="poi-dot' + selClass + '" style="background:' + bg + '">' + st.emoji + '</div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        var m = L.marker([st.lat, st.lng], { icon: icon }).addTo(poiLayer);
        m.on('click', function(ev) {
          L.DomEvent.stopPropagation(ev);
          window.parent.postMessage(JSON.stringify({ type: 'SELECT_POI', kind: 'station', id: st.id }), '*');
        });
      });

      (payload.parkings || []).forEach(function(prk) {
        var selClass = payload.selectedPoiKey === 'parking:' + prk.id ? ' poi-selected' : '';
        var icon = L.divIcon({
          className: '',
          html: '<div class="poi-dot' + selClass + '" style="background:${colors.modes.carWithParking}">P</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        var m = L.marker([prk.lat, prk.lng], { icon: icon }).addTo(poiLayer);
        m.on('click', function(ev) {
          L.DomEvent.stopPropagation(ev);
          window.parent.postMessage(JSON.stringify({ type: 'SELECT_POI', kind: 'parking', id: prk.id }), '*');
        });
      });

      (payload.landmarks || []).forEach(function(lm) {
        var selClass = payload.selectedPoiKey === 'landmark:' + lm.id ? ' poi-selected' : '';
        var icon = L.divIcon({
          className: '',
          html: '<div class="poi-dot' + selClass + '" style="background:${colors.primary}">🏛️</div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        var m = L.marker([lm.lat, lm.lng], { icon: icon }).addTo(poiLayer);
        m.on('click', function(ev) {
          L.DomEvent.stopPropagation(ev);
          window.parent.postMessage(JSON.stringify({ type: 'SELECT_POI', kind: 'landmark', id: lm.id }), '*');
        });
      });

      // 5. Follow user during navigation or fit bounds when endpoints/route change
      if (!payload.destination) {
        lastFitSignature = '';
      }
      if (payload.isNavigating && payload.userLocation) {
        map.panTo([payload.userLocation.lat, payload.userLocation.lng], { animate: true });
      } else if (payload.fitSignature && payload.fitSignature !== lastFitSignature && boundsPoints.length >= 2) {
        lastFitSignature = payload.fitSignature;
        map.fitBounds(boundsPoints, { padding: [95, 50], maxZoom: 16 });
      }
    }

    window.addEventListener('message', function(event) {
      try {
        var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'SYNC_STATE') {
          syncState(msg.payload);
        } else if (msg.type === 'FOCUS_REGION') {
          map.setView([msg.lat, msg.lng], msg.zoom || 14, { animate: true });
        }
      } catch (e) {}
    });

    window.parent.postMessage(JSON.stringify({ type: 'MAP_READY' }), '*');
  </script>
</body>
</html>`,
    []
  );

  // Listen for events coming from the Leaflet iframe
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!msg || !msg.type) return;

        if (msg.type === 'MAP_READY') {
          setMapReady(true);
        } else if (msg.type === 'MAP_CLICK') {
          onMapClick({ lat: msg.lat, lng: msg.lng });
        } else if (msg.type === 'DRAG_ORIGIN') {
          onDragOrigin({ lat: msg.lat, lng: msg.lng });
        } else if (msg.type === 'DRAG_DEST') {
          onDragDestination({ lat: msg.lat, lng: msg.lng });
        } else if (msg.type === 'SELECT_POI') {
          if (msg.kind === 'station') {
            const found = stations.find((s) => String(s.id) === String(msg.id));
            if (found) onSelectStation(found);
          } else if (msg.kind === 'parking') {
            const found = parkings.find((p) => String(p.id) === String(msg.id));
            if (found) onSelectParking(found);
          } else if (msg.kind === 'landmark') {
            const found = landmarks.find((l) => String(l.id) === String(msg.id));
            if (found) onSelectLandmark(found);
          }
        }
      } catch {
        // Ignore unrelated window messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    stations,
    parkings,
    landmarks,
    onMapClick,
    onDragOrigin,
    onDragDestination,
    onSelectStation,
    onSelectParking,
    onSelectLandmark,
  ]);

  // Push latest React state into Leaflet whenever mapReady or state changes
  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;

    const fitSignature = `${origin?.lat},${origin?.lng}-${destination?.lat},${destination?.lng}-${selectedOption?.id || ''}`;

    const serializedPayload = {
      isDarkMap,
      origin,
      originName,
      destination,
      destinationName,
      userLocation,
      isNavigating,
      selectedPoiKey,
      selectedParkingPolygon,
      fitSignature,
      stations: stations.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        isBike: s.type === 'bike_station' || s.type === 'scooter_station',
        emoji: getStationEmoji(s.type),
      })),
      parkings: parkings.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
      })),
      landmarks: landmarks.map((l) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
      })),
      segments: (selectedOption?.segments || []).map((seg) => ({
        isWalk: seg.mode === 'Walk',
        strokeColor: getModeStrokeColor(seg.mode),
        strokeWidth: getModeStrokeWidth(seg.mode),
        geometry: seg.geometry || [],
      })),
    };

    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ type: 'SYNC_STATE', payload: serializedPayload }),
      '*'
    );
  }, [
    mapReady,
    isDarkMap,
    origin,
    originName,
    destination,
    destinationName,
    stations,
    parkings,
    landmarks,
    selectedOption,
    selectedPoiKey,
    selectedParkingPolygon,
    userLocation,
    isNavigating,
  ]);

  // Center / pan Leaflet map on explicit button clicks
  useEffect(() => {
    if (!mapReady || !focusTarget || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        type: 'FOCUS_REGION',
        lat: focusTarget.lat,
        lng: focusTarget.lng,
        zoom: focusTarget.zoom || 14,
      }),
      '*'
    );
  }, [mapReady, focusTarget]);

  return (
    <View style={styles.container}>
      {React.createElement('iframe', {
        ref: iframeRef,
        title: 'BeGreen Timișoara Map',
        srcDoc: leafletHtml,
        onLoad: () => setMapReady(true),
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        },
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.mapDarkLand,
  },
});
