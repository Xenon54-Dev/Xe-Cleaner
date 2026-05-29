// Modular VPN service layer.
//
// `VpnService` is the interface every provider implements. `MockVpnService`
// drives a realistic state machine + traffic-stats engine without a real
// tunnel. To go live later, implement a `NativeVpnService` (Network Extension
// via a dev build) with the same surface and swap the `vpn` export — nothing
// in the UI needs to change.

export const VpnStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  ERROR: 'error',
};

class VpnService {
  constructor() {
    this.listeners = new Set();
    this.state = {
      status: VpnStatus.DISCONNECTED,
      server: null,
      protocol: 'wireguard',
      since: null,
      error: null,
      stats: { down: 0, up: 0, downTotal: 0, upTotal: 0 },
    };
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit() {
    const snapshot = { ...this.state, stats: { ...this.state.stats } };
    this.listeners.forEach((fn) => fn(snapshot));
  }

  _set(patch) {
    this.state = { ...this.state, ...patch };
    this._emit();
  }

  // eslint-disable-next-line no-unused-vars
  connect(server, protocol) {
    throw new Error('connect() not implemented');
  }

  disconnect() {
    throw new Error('disconnect() not implemented');
  }
}

class MockVpnService extends VpnService {
  connect(server, protocol) {
    if (this.state.status === VpnStatus.CONNECTED || this.state.status === VpnStatus.CONNECTING) return;
    clearTimeout(this._timer);
    this._set({
      status: VpnStatus.CONNECTING,
      server,
      protocol: protocol || this.state.protocol,
      error: null,
      stats: { down: 0, up: 0, downTotal: 0, upTotal: 0 },
    });
    this._timer = setTimeout(() => {
      this._set({ status: VpnStatus.CONNECTED, since: Date.now() });
      this._startStats();
    }, 1400 + Math.random() * 900);
  }

  disconnect() {
    if (this.state.status === VpnStatus.DISCONNECTED) return;
    clearTimeout(this._timer);
    this._stopStats();
    this._set({ status: VpnStatus.DISCONNECTING });
    this._timer = setTimeout(() => {
      this._set({ status: VpnStatus.DISCONNECTED, since: null });
    }, 650);
  }

  _startStats() {
    this._stopStats();
    this._statsTimer = setInterval(() => {
      const prev = this.state.stats;
      // Bytes/sec random walk that stays in a believable range.
      const down = clamp((prev.down || 1.8e6) + (Math.random() - 0.45) * 9e5, 2e5, 9e6);
      const up = clamp((prev.up || 2.2e5) + (Math.random() - 0.45) * 1.4e5, 4e4, 1.4e6);
      this._set({
        stats: { down, up, downTotal: prev.downTotal + down, upTotal: prev.upTotal + up },
      });
    }, 1000);
  }

  _stopStats() {
    if (this._statsTimer) {
      clearInterval(this._statsTimer);
      this._statsTimer = null;
    }
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export const vpn = new MockVpnService();
