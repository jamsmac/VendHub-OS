/**
 * Validate a URL is safe for server-side requests (prevents SSRF).
 * Blocks internal/private IPs, localhost, and metadata service endpoints.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
]);

const PRIVATE_IP_PREFIXES = [
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "0.",
  "100.64.", // Carrier-grade NAT
  "fd", // IPv6 ULA
  "fe80", // IPv6 link-local
];

export function isUrlSafeForServerRequest(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Must be http or https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block known internal hostnames
    if (BLOCKED_HOSTS.has(hostname)) {
      return false;
    }

    // Block private IP ranges
    if (PRIVATE_IP_PREFIXES.some((prefix) => hostname.startsWith(prefix))) {
      return false;
    }

    // Block .local, .internal, .corp domains
    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".lan")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
