import { useCallback, useEffect, useState } from 'react';
import { vpn, VpnStatus } from './VpnService';

// React binding for the VPN service. Any component can call useVpn() and stay
// in sync with the shared connection state.
export function useVpn() {
  const [state, setState] = useState(() => vpn.getState());

  useEffect(() => {
    const unsubscribe = vpn.subscribe(setState);
    return unsubscribe;
  }, []);

  const connect = useCallback((server, protocol) => vpn.connect(server, protocol), []);
  const disconnect = useCallback(() => vpn.disconnect(), []);

  return { ...state, connect, disconnect, VpnStatus };
}
