import { promises as dns } from "node:dns";
import net from "node:net";

/**
 * dev-task-split.md Phase 1 (#9): SSRF protection for admin-configured device
 * sync URLs (`face_machine_settings.machine_api_url`). The server fetches
 * this URL on the admin's behalf, so a malicious or compromised admin
 * session could otherwise point it at internal infrastructure (localhost,
 * the cloud metadata endpoint, a private-network service, etc.).
 *
 * Two layers:
 *  1. If FACE_MACHINE_ALLOWED_HOSTS is set (comma-separated hostnames,
 *     optionally with a leading "*." wildcard), only those hosts are
 *     permitted — a true allowlist.
 *  2. Otherwise (the default, since real gyms configure arbitrary devices we
 *     can't know in advance), every resolved IP for the hostname is checked
 *     against private/loopback/link-local/reserved ranges and rejected —
 *     this also defeats DNS-rebinding, where a public hostname's DNS record
 *     is swapped to a private IP after the allowlist check would otherwise pass.
 */

export class UnsafeUrlError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, includes the 169.254.169.254 cloud metadata endpoint
  ["172.16.0.0", 12],
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16],
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

function isPrivateIPv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" || // loopback
    normalized === "::" ||
    normalized.startsWith("fc") || // unique local fc00::/7
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") || // link-local
    normalized.startsWith("::ffff:") // IPv4-mapped — re-check the embedded v4 address
      ? isPrivateIPv4(normalized.replace("::ffff:", ""))
      : false
  );
}

function hostMatchesAllowlistEntry(hostname: string, entry: string): boolean {
  const normalizedEntry = entry.trim().toLowerCase();
  if (!normalizedEntry) return false;
  if (normalizedEntry.startsWith("*.")) {
    const suffix = normalizedEntry.slice(1); // ".example.com"
    return hostname === normalizedEntry.slice(2) || hostname.endsWith(suffix);
  }
  return hostname === normalizedEntry;
}

/**
 * Validates a device-configured URL is safe to fetch server-side. Returns the
 * parsed URL on success; throws UnsafeUrlError otherwise.
 */
export async function assertSafeDeviceUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("Invalid machine API URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeUrlError("Only http/https machine API URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new UnsafeUrlError("Loopback hosts are not allowed as a machine API URL");
  }

  const allowlist = (process.env.FACE_MACHINE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (allowlist.length > 0) {
    if (!allowlist.some((entry) => hostMatchesAllowlistEntry(hostname, entry))) {
      throw new UnsafeUrlError("This machine API host is not on the configured allowlist");
    }
    return url;
  }

  // No explicit allowlist configured: fall back to rejecting private/reserved
  // network targets, checked against every resolved address.
  if (net.isIP(hostname)) {
    const family = net.isIP(hostname);
    if ((family === 4 && isPrivateIPv4(hostname)) || (family === 6 && isPrivateIPv6(hostname))) {
      throw new UnsafeUrlError("Private network addresses are not allowed as a machine API URL");
    }
    return url;
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("Unable to resolve the machine API host");
  }
  if (!records.length) throw new UnsafeUrlError("Unable to resolve the machine API host");
  for (const record of records) {
    if (record.family === 4 && isPrivateIPv4(record.address)) {
      throw new UnsafeUrlError("Machine API host resolves to a private network address");
    }
    if (record.family === 6 && isPrivateIPv6(record.address)) {
      throw new UnsafeUrlError("Machine API host resolves to a private network address");
    }
  }

  return url;
}
