// Server catalog. `host` is a real reachable HTTPS endpoint used for live
// latency measurement. Swap/extend freely — the UI groups by `region`.
export const SERVERS = [
  { id: 'us-nyc', country: 'United States', code: 'US', city: 'New York', region: 'Americas', host: 'https://www.cloudflare.com' },
  { id: 'us-sfo', country: 'United States', code: 'US', city: 'San Francisco', region: 'Americas', host: 'https://www.apple.com' },
  { id: 'ca-tor', country: 'Canada', code: 'CA', city: 'Toronto', region: 'Americas', host: 'https://www.shopify.com' },
  { id: 'br-sao', country: 'Brazil', code: 'BR', city: 'São Paulo', region: 'Americas', host: 'https://www.cloudflare.com' },
  { id: 'uk-lon', country: 'United Kingdom', code: 'GB', city: 'London', region: 'Europe', host: 'https://www.bbc.co.uk' },
  { id: 'de-fra', country: 'Germany', code: 'DE', city: 'Frankfurt', region: 'Europe', host: 'https://www.cloudflare.com' },
  { id: 'nl-ams', country: 'Netherlands', code: 'NL', city: 'Amsterdam', region: 'Europe', host: 'https://www.cloudflare.com' },
  { id: 'fr-par', country: 'France', code: 'FR', city: 'Paris', region: 'Europe', host: 'https://www.cloudflare.com' },
  { id: 'se-sto', country: 'Sweden', code: 'SE', city: 'Stockholm', region: 'Europe', host: 'https://www.spotify.com' },
  { id: 'jp-tyo', country: 'Japan', code: 'JP', city: 'Tokyo', region: 'Asia Pacific', host: 'https://www.cloudflare.com' },
  { id: 'sg-sin', country: 'Singapore', code: 'SG', city: 'Singapore', region: 'Asia Pacific', host: 'https://www.cloudflare.com' },
  { id: 'au-syd', country: 'Australia', code: 'AU', city: 'Sydney', region: 'Asia Pacific', host: 'https://www.atlassian.com' },
  { id: 'in-blr', country: 'India', code: 'IN', city: 'Bangalore', region: 'Asia Pacific', host: 'https://www.cloudflare.com' },
];

export const REGIONS = ['Americas', 'Europe', 'Asia Pacific'];

export const PROTOCOLS = [
  { id: 'wireguard', label: 'WireGuard', desc: 'Fastest · modern' },
  { id: 'ikev2', label: 'IKEv2', desc: 'Stable on mobile' },
  { id: 'openvpn', label: 'OpenVPN', desc: 'Most compatible' },
];

export function serversByRegion() {
  return REGIONS.map((region) => ({ region, servers: SERVERS.filter((s) => s.region === region) }));
}
