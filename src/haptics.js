import * as Haptics from 'expo-haptics';

export function tapSelect() {
  try {
    Haptics.selectionAsync();
  } catch {}
}

export function tapLight() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function tapSuccess() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

export function tapWarning() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}
