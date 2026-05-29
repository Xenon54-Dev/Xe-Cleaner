import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, shadow } from './theme';
import { formatBytes } from './media';
import { useVpn } from './vpn/useVpn';
import { SERVERS, PROTOCOLS, serversByRegion } from './vpn/servers';
import { pingAll } from './vpn/ping';
import { tapLight, tapSuccess } from './haptics';

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

function VpnOrb({ status, onPress }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const connected = status === 'connected';
  const connecting = status === 'connecting';
  const busy = connecting || status === 'disconnecting';

  useEffect(() => {
    let loop;
    if (connecting) {
      pulse.setValue(0);
      loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
      loop.start();
    } else if (connected) {
      breathe.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
    }
    return () => loop && loop.stop();
  }, [status]);

  const pScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.66, 1.7] });
  const pOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <Pressable onPress={onPress} disabled={busy} style={styles.orbWrap} hitSlop={8}>
      {connecting && <Animated.View style={[styles.pulseRing, { transform: [{ scale: pScale }], opacity: pOpacity }]} />}
      <Animated.View style={[styles.orbShadow, connected && shadow.glow, { transform: [{ scale: connected ? breatheScale : 1 }] }]}>
        <View style={[styles.orb, connected ? styles.orbOn : connecting ? styles.orbBusy : styles.orbOff]}>
          <LinearGradient
            colors={connected ? ['rgba(103,232,195,0.28)', 'rgba(139,108,255,0.16)'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
            style={StyleSheet.absoluteFill}
          />
          {connecting ? (
            <ActivityIndicator size="large" color={colors.mint} />
          ) : (
            <Text style={[styles.orbGlyph, connected && { color: colors.mint }]}>⏻</Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function StatBlock({ label, value, accent }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, accent && { color: colors.mint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CodeBadge({ code }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{code}</Text>
    </View>
  );
}

function ServerSheet({ visible, current, pings, onSelect, onClose }) {
  if (!visible) return null;
  const groups = serversByRegion();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Select location</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {groups.map((g) => (
              <View key={g.region}>
                <Text style={styles.regionLabel}>{g.region}</Text>
                {g.servers.map((s) => {
                  const ms = pings[s.id];
                  const active = current && current.id === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => onSelect(s)}
                      style={({ pressed }) => [styles.serverRow, active && styles.serverRowActive, pressed && styles.pressed]}
                    >
                      <CodeBadge code={s.code} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serverCountry}>{s.country}</Text>
                        <Text style={styles.serverCity}>{s.city}</Text>
                      </View>
                      <PingPip ms={ms} />
                      {active && <Text style={styles.activeCheck}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PingPip({ ms }) {
  if (ms === undefined) return <ActivityIndicator size="small" color={colors.faint} />;
  if (ms === null) return <Text style={styles.pingDim}>—</Text>;
  const color = ms < 80 ? colors.mint : ms < 180 ? colors.warn : colors.danger;
  return (
    <View style={styles.pingWrap}>
      <View style={[styles.pingDot, { backgroundColor: color }]} />
      <Text style={styles.pingText}>{ms} ms</Text>
    </View>
  );
}

export default function VpnScreen() {
  const { status, server, protocol: liveProtocol, since, stats, connect, disconnect } = useVpn();
  const [selected, setSelected] = useState(SERVERS[0]);
  const [protocol, setProtocol] = useState('wireguard');
  const [pings, setPings] = useState({});
  const [sheet, setSheet] = useState(false);
  const wasConnected = useRef(false);

  useEffect(() => {
    pingAll(SERVERS, (id, ms) => setPings((p) => ({ ...p, [id]: ms })));
  }, []);

  // Success haptic on transition into connected.
  useEffect(() => {
    if (status === 'connected' && !wasConnected.current) {
      wasConnected.current = true;
      tapSuccess();
    } else if (status === 'disconnected') {
      wasConnected.current = false;
    }
  }, [status]);

  const connected = status === 'connected';
  const connecting = status === 'connecting';
  const current = connected || connecting ? server || selected : selected;
  const activeProtocol = connected || connecting ? liveProtocol : protocol;

  function onOrb() {
    tapLight();
    if (status === 'disconnected') connect(selected, protocol);
    else if (connected) disconnect();
  }

  const statusText =
    status === 'connected' ? 'Protected' : status === 'connecting' ? 'Connecting' : status === 'disconnecting' ? 'Disconnecting' : 'Not connected';
  const statusSub =
    connected || connecting
      ? `${current.city} · ${(activeProtocol || '').toUpperCase()}`
      : 'Tap the shield or Connect';

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.overline}>SECURE TUNNEL</Text>

        <View style={styles.hero}>
          <VpnOrb status={status} onPress={onOrb} />
          <Text style={[styles.statusText, connected && { color: colors.mint }]}>{statusText}</Text>
          <Text style={styles.statusSub}>{statusSub}</Text>
        </View>

        <Pressable
          onPress={onOrb}
          disabled={connecting || status === 'disconnecting'}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          {connected ? (
            <View style={[styles.actionInner, styles.actionDisconnect]}>
              <Text style={styles.actionDisconnectText}>Disconnect</Text>
            </View>
          ) : (
            <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionInner}>
              <Text style={styles.actionConnectText}>{connecting ? 'Connecting…' : 'Connect'}</Text>
            </LinearGradient>
          )}
        </Pressable>

        {connected && (
          <View style={styles.statsCard}>
            <StatBlock label="DOWNLOAD" value={`${formatBytes(stats.down)}/s`} accent />
            <View style={styles.statDivider} />
            <StatBlock label="UPLOAD" value={`${formatBytes(stats.up)}/s`} />
            <View style={styles.statDivider} />
            <StatBlock label="PING" value={pings[current.id] != null ? `${pings[current.id]} ms` : '—'} />
            <View style={styles.statDivider} />
            <StatBlock label="TIME" value={since ? fmtDuration(Date.now() - since) : '00:00'} />
          </View>
        )}

        <Text style={styles.sectionLabel}>Location</Text>
        <Pressable onPress={() => setSheet(true)} style={({ pressed }) => [styles.locationCard, pressed && styles.pressed]}>
          <CodeBadge code={current.code} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locCountry}>{current.country}</Text>
            <Text style={styles.locCity}>{current.city}</Text>
          </View>
          <PingPip ms={pings[current.id]} />
          <Text style={styles.locChevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Protocol</Text>
        <View style={styles.segment}>
          {PROTOCOLS.map((p) => {
            const on = activeProtocol === p.id;
            const locked = connected || connecting;
            return (
              <Pressable
                key={p.id}
                disabled={locked}
                onPress={() => {
                  tapLight();
                  setProtocol(p.id);
                }}
                style={[styles.seg, on && styles.segOn, locked && !on && styles.segLocked]}
              >
                <Text style={[styles.segLabel, on && styles.segLabelOn]}>{p.label}</Text>
                <Text style={[styles.segDesc, on && styles.segDescOn]}>{p.desc}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.disclaimer}>
          Live latency is measured for real. The encrypted tunnel is simulated in this build — the service layer is
          ready for a real Network Extension provider.
        </Text>
      </ScrollView>

      <ServerSheet
        visible={sheet}
        current={current}
        pings={pings}
        onSelect={(s) => {
          tapLight();
          setSelected(s);
          setSheet(false);
        }}
        onClose={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingTop: 64, paddingHorizontal: 22, paddingBottom: 130 },
  overline: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 4, color: colors.faint, textAlign: 'center' },

  hero: { alignItems: 'center', marginTop: 14, marginBottom: 22 },
  orbWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  pulseRing: { position: 'absolute', width: 168, height: 168, borderRadius: 84, borderWidth: 2, borderColor: colors.mint },
  orbShadow: { borderRadius: 84 },
  orb: {
    width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 5,
  },
  orbOff: { borderColor: 'rgba(255,255,255,0.10)' },
  orbBusy: { borderColor: 'rgba(103,232,195,0.5)' },
  orbOn: { borderColor: colors.mint },
  orbGlyph: { fontSize: 58, color: colors.faint, fontWeight: '300' },
  statusText: { fontFamily: fonts.displayX, fontSize: 26, color: colors.text },
  statusSub: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 4 },

  actionBtn: { alignSelf: 'center', marginBottom: 8 },
  actionInner: { paddingVertical: 15, paddingHorizontal: 56, borderRadius: radius.pill, alignItems: 'center' },
  actionConnectText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#06140F' },
  actionDisconnect: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,92,106,0.6)' },
  actionDisconnectText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.danger },

  statsCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg,
    paddingVertical: 16, paddingHorizontal: 8, marginTop: 18, borderWidth: 1, borderColor: colors.cardBorder, ...shadow.sm,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.display, fontSize: 14, color: colors.text },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 9, letterSpacing: 1, color: colors.faint, marginTop: 4 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.cardBorder },

  sectionLabel: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase', marginTop: 26, marginBottom: 10 },
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.cardBorder, ...shadow.sm,
  },
  locCountry: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  locCity: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 2 },
  locChevron: { fontFamily: fonts.display, fontSize: 24, color: colors.faint, marginLeft: 4 },

  badge: {
    width: 38, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.cardBorder,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text, letterSpacing: 0.5 },

  pingWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pingDot: { width: 7, height: 7, borderRadius: 7 },
  pingText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.dim },
  pingDim: { fontFamily: fonts.body, fontSize: 13, color: colors.faint },

  segment: { flexDirection: 'row', gap: 8 },
  seg: {
    flex: 1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  segOn: { borderColor: colors.mint, backgroundColor: 'rgba(103,232,195,0.10)' },
  segLocked: { opacity: 0.4 },
  segLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  segLabelOn: { color: colors.mint },
  segDesc: { fontFamily: fonts.body, fontSize: 10, color: colors.faint, marginTop: 3 },
  segDescOn: { color: 'rgba(103,232,195,0.8)' },

  disclaimer: { fontFamily: fonts.body, fontSize: 11, color: colors.faint, lineHeight: 16, marginTop: 26, textAlign: 'center' },

  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(3,5,12,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E1430', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, maxHeight: '82%', borderWidth: 1, borderColor: colors.cardBorder,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginBottom: 10 },
  regionLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.5, color: colors.faint, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  serverRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.md },
  serverRowActive: { backgroundColor: 'rgba(103,232,195,0.08)' },
  serverCountry: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  serverCity: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, marginTop: 1 },
  activeCheck: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.mint, marginLeft: 4 },
});
