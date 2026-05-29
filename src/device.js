import * as FS from 'expo-file-system/legacy';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';

// Returns { free, used, total } in bytes, or null if unavailable.
export async function getDeviceStorage() {
  try {
    if (
      typeof FS.getFreeDiskStorageAsync === 'function' &&
      typeof FS.getTotalDiskCapacityAsync === 'function'
    ) {
      const [free, total] = await Promise.all([
        FS.getFreeDiskStorageAsync(),
        FS.getTotalDiskCapacityAsync(),
      ]);
      if (free > 0 && total > 0) return { free, used: total - free, total };
    }
  } catch {
    // ignore
  }
  return null;
}

// Live battery readout, or null if unavailable.
export async function getBattery() {
  try {
    const s = await Battery.getPowerStateAsync();
    return {
      level: s.batteryLevel,
      lowPower: s.lowPowerMode,
      charging: s.batteryState === Battery.BatteryState.CHARGING || s.batteryState === Battery.BatteryState.FULL,
    };
  } catch {
    return null;
  }
}

export function getDeviceInfo() {
  try {
    return {
      model: Device.modelName || 'iPhone',
      os: `${Device.osName || 'iOS'} ${Device.osVersion || ''}`.trim(),
    };
  } catch {
    return { model: 'iPhone', os: 'iOS' };
  }
}

