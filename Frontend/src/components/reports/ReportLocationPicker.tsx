import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
type WebViewProps = any;
import { AppButton } from '../common/AppButton';
import { AuthenticatedHeader } from '../common/AuthenticatedHeader';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { isReportLocation, ReportLocation } from '../../types/community';

// Use the installed Expo Go-compatible WebView without bundling native code on web.
let NativeWebView: React.ComponentType<WebViewProps> | null = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch {
    NativeWebView = null;
  }
}

const scriptValue = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

function mapDocument(point: ReportLocation | null, channel: string, label: string, language: string) {
  return `<!doctype html><html lang="${language}"><head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      html,body,#map{height:100%;width:100%;margin:0;background:${colors.surfaceMuted}}
      .report-pin{background:${colors.primaryDark};border:3px solid ${colors.surface};border-radius:50%;box-sizing:border-box}
      #map:focus-visible{outline:3px solid ${colors.primaryDark};outline-offset:-3px}
    </style></head><body><div id="map" tabindex="0"></div><script>
    var channel=${scriptValue(channel)};
    function emit(type, point){
      var message=JSON.stringify({type:type,channel:channel,latitude:point&&point.lat,longitude:point&&point.lng});
      if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(message);}
      else{window.parent.postMessage(message,'*');}
    }
    function init(){try{
      var initial=${scriptValue(point)};
      // Timișoara is a viewport only. No report point exists until explicitly chosen.
      var centre=initial?[initial.latitude,initial.longitude]:[45.7537,21.2257];
      var map=L.map('map',{keyboard:true,worldCopyJump:true}).setView(centre,initial?16:14);
      map.getContainer().setAttribute('aria-label',${scriptValue(label)});
      // Use OSM's documented endpoint, normal HTTP caching and visible attribution.
      // Never rotate hosts or retry against another endpoint to evade a block.
      var tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',
        updateWhenIdle:true,updateWhenZooming:false,keepBuffer:0,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      });
      tiles.once('tileload',function(){emit('REPORT_LOCATION_READY');});
      tiles.on('tileerror',function(){emit('REPORT_LOCATION_ERROR');});
      tiles.addTo(map);
      var marker=null;
      function select(point,notify){
        point=L.latLng(point).wrap();
        if(!marker){
          marker=L.marker(point,{draggable:true,keyboard:false,icon:L.divIcon({className:'report-pin',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map);
          marker.on('dragend',function(){select(marker.getLatLng(),true);});
        }else{marker.setLatLng(point);}
        if(notify){emit('REPORT_LOCATION_PICK',point);}
      }
      if(initial){select(centre,false);}
      map.on('click',function(event){select(event.latlng,true);});
      map.getContainer().addEventListener('keydown',function(event){
        if(event.key==='Enter'||event.key===' '){event.preventDefault();select(map.getCenter(),true);}
      });
    }catch(error){emit('REPORT_LOCATION_ERROR');}}
    </script><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onload="init()" onerror="emit('REPORT_LOCATION_ERROR')"></script></body></html>`;
}

interface Props {
  value: ReportLocation | null;
  onConfirm: (point: ReportLocation) => void;
  onCancel: () => void;
}

/** Isolated message types prevent report clicks reaching the mounted FE1 map. */
export function ReportLocationPicker({ value, onConfirm, onCancel }: Props) {
  const { language, t } = useTranslation();
  const { height } = useWindowDimensions();
  const id = useId();
  const [draft, setDraft] = useState<ReportLocation | null>(value);
  const [seed, setSeed] = useState(value);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const channel = `${id}-${version}-${language}`;
  const html = useMemo(() => mapDocument(draftRef.current, channel, t.reportMapA11y, language), [seed, channel, t.reportMapA11y, language]);

  const receive = useCallback((data: unknown) => {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : null;
      if (!message || message.channel !== channel) return;
      if (message.type === 'REPORT_LOCATION_READY' || message.type === 'REPORT_LOCATION_ERROR') {
        if (timer.current) clearTimeout(timer.current);
        setStatus(message.type === 'REPORT_LOCATION_READY' ? 'ready' : 'error');
      } else if (message.type === 'REPORT_LOCATION_PICK') {
        const point = { latitude: message.latitude, longitude: message.longitude };
        if (isReportLocation(point)) setDraft(point);
      }
    } catch {
      // Ignore unrelated or malformed messages; they never become report coordinates.
    }
  }, [channel]);

  useEffect(() => {
    setStatus(Platform.OS !== 'web' && !NativeWebView ? 'error' : 'loading');
    timer.current = setTimeout(() => setStatus('error'), 20000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [html]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (event.source === iframe.current?.contentWindow) receive(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [receive]);

  const fail = () => {
    if (timer.current) clearTimeout(timer.current);
    setStatus('error');
  };

  return (
    <Modal visible onRequestClose={onCancel}>
      <View style={styles.screen}>
        <AuthenticatedHeader onBack={onCancel} />
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">{t.reportPickerTitle}</Text>
            <Text style={styles.description}>{t.reportPickerHint}</Text>
            {Platform.OS === 'web' && <Text style={styles.caption}>{t.reportPickerKeyboard}</Text>}
            {status === 'loading' && (
              <View style={styles.loading} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.description}>{t.reportMapLoading}</Text>
              </View>
            )}
            {status === 'error' && (
              <View style={styles.feedback}>
                <Text style={styles.error} accessibilityRole="alert">{t.reportMapUnavailable}</Text>
                <AppButton title={t.retry} variant="outline" onPress={() => { setSeed(draft); setVersion((current) => current + 1); }} />
              </View>
            )}
            <View style={[styles.map, { height: Math.max(180, Math.min(height * 0.48, 480)) }]}>
              {Platform.OS === 'web' ? React.createElement('iframe', {
                key: version,
                ref: iframe,
                title: t.reportMapA11y,
                srcDoc: html,
                // This app-generated document needs its real origin for tile Referer
                // identification. Never put user-authored HTML into this frame.
                sandbox: 'allow-scripts allow-same-origin allow-popups',
                referrerPolicy: 'strict-origin-when-cross-origin',
                onError: fail,
                style: { width: '100%', height: '100%', border: 'none', display: 'block' },
              }) : NativeWebView ? (
                <NativeWebView
                  key={version}
                  source={{ html }}
                  // Append our actual application identity to the genuine WebView UA;
                  // do not override it with an impersonated browser or fake Referer.
                  applicationNameForUserAgent="BeGreenReportPicker/1.0"
                  cacheEnabled
                  originWhitelist={['*']}
                  javaScriptEnabled
                  scrollEnabled={false}
                  onMessage={(event: any) => receive(event.nativeEvent.data)}
                  onError={fail}
                  onHttpError={fail}
                  onShouldStartLoadWithRequest={(request: any) => request.url === 'about:blank' || request.url.startsWith('data:text/html')}
                  style={styles.screen}
                />
              ) : null}
            </View>
            <View accessibilityLiveRegion="polite">
              <Text style={styles.description} selectable>
                {draft ? t.reportCoordsLabel(Number(draft.latitude.toFixed(6)), Number(draft.longitude.toFixed(6))) : t.reportLocationEmpty}
              </Text>
            </View>
            <AppButton title={t.reportConfirmLocation} disabled={!isReportLocation(draft) || status !== 'ready'}
              onPress={() => { if (isReportLocation(draft) && status === 'ready') onConfirm(draft); }} />
            <AppButton title={t.cancel} variant="outline" onPress={onCancel} />
          </View>
        </ScrollView>
      </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, alignItems: 'center' },
  content: { width: '100%', maxWidth: 960, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.body, color: colors.danger },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  feedback: { gap: spacing.sm },
  map: { overflow: 'hidden', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.controlBorder },
});
