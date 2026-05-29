import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from './theme';
import { SENSITIVITY, DEPTHS } from './storage';

export default function SettingsModal({ visible, settings, onChange, onClearCache, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Detection Settings</Text>

          <Text style={styles.label}>Sensitivity</Text>
          <View style={styles.segment}>
            {Object.entries(SENSITIVITY).map(([key, v]) => (
              <Pressable
                key={key}
                onPress={() => onChange({ ...settings, sensitivity: key })}
                style={[styles.segItem, settings.sensitivity === key && styles.segItemOn]}
              >
                <Text style={[styles.segText, settings.sensitivity === key && styles.segTextOn]}>{v.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>{SENSITIVITY[settings.sensitivity]?.hint}</Text>

          <Text style={[styles.label, { marginTop: 22 }]}>Scan depth</Text>
          <View style={styles.segment}>
            {DEPTHS.map((d) => (
              <Pressable
                key={d.value}
                onPress={() => onChange({ ...settings, depth: d.value })}
                style={[styles.segItem, settings.depth === d.value && styles.segItemOn]}
              >
                <Text style={[styles.segText, settings.depth === d.value && styles.segTextOn]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>{DEPTHS.find((d) => d.value === settings.depth)?.hint}</Text>

          <Pressable onPress={onClearCache} style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
            <Text style={styles.clearText}>Clear fingerprint cache</Text>
          </Pressable>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,5,12,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E1430', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: colors.cardBorder,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 18 },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 20 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.dim, letterSpacing: 0.5, marginBottom: 10 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center' },
  segItemOn: { backgroundColor: colors.mint },
  segText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.dim },
  segTextOn: { color: '#06140F' },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 8 },
  clearBtn: {
    marginTop: 28, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,92,106,0.4)',
  },
  clearText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.danger },
  doneBtn: { marginTop: 12, paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.mint },
  doneText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#06140F' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
