import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radius } from './theme';
import { formatBytes, formatDuration } from './media';

export default function PreviewModal({ asset, onClose, onDelete }) {
  if (!asset) return null;
  const isVideo = asset.mediaType === 'video';
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.stage}>
          {isVideo ? (
            <View style={styles.videoBox}>
              <Text style={styles.play}>▶</Text>
              <Text style={styles.vName} numberOfLines={2}>{asset.filename}</Text>
              <Text style={styles.vMeta}>
                {formatDuration(asset.duration)} · {formatBytes(asset.bytes)}
              </Text>
              <Text style={styles.note}>Open Photos to play this video.</Text>
            </View>
          ) : (
            <Image source={{ uri: asset.uri }} style={styles.image} contentFit="contain" transition={120} />
          )}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.btn, styles.close, pressed && styles.pressed]}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          {onDelete && (
            <Pressable
              onPress={() => onDelete(asset)}
              style={({ pressed }) => [styles.btn, styles.del, pressed && styles.pressed]}
            >
              <Text style={styles.delText}>Delete</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,5,12,0.94)', justifyContent: 'center' },
  stage: { flex: 1, margin: 16, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', borderRadius: radius.md },
  videoBox: { alignItems: 'center', padding: 24 },
  play: { color: colors.mint, fontSize: 64, marginBottom: 18 },
  vName: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 16, textAlign: 'center' },
  vMeta: { color: colors.dim, fontFamily: fonts.body, fontSize: 14, marginTop: 6 },
  note: { color: colors.faint, fontFamily: fonts.body, fontSize: 13, marginTop: 18 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 40 },
  btn: { flex: 1, paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center' },
  close: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  closeText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 16 },
  del: { backgroundColor: colors.danger },
  delText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 16 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
