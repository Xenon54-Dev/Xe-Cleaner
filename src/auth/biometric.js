import * as LocalAuthentication from 'expo-local-authentication';

// Probe the device once. Returns { available, label } — `label` is the
// user-facing name ("Face ID", "Touch ID", or "Biometrics").
export async function getBiometricInfo() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    let label = 'Biometrics';
    if (hasHardware) {
      const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) label = 'Face ID';
      else if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) label = 'Touch ID';
    }
    return { available: hasHardware && isEnrolled, hasHardware, isEnrolled, label };
  } catch {
    return { available: false, hasHardware: false, isEnrolled: false, label: 'Biometrics' };
  }
}

// Prompt the system biometric. Resolves to `true` on success.
export async function authenticateWithBiometric(label = 'Biometrics') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in to Xe Cleaner with ${label}`,
      cancelLabel: 'Cancel',
      // Biometric ONLY — don't fall back to the iPhone passcode. If Face ID
      // doesn't pass, the user taps the app's own "Use password instead".
      disableDeviceFallback: true,
    });
    return Boolean(result.success);
  } catch {
    return false;
  }
}
