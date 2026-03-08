const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "metadata.google.internal",
];

const ALLOWED_PROTOCOLS = ["http:", "https:"];

function isPrivateIp(hostname: string): boolean {
  // Block private IPv4 ranges: 10.*, 172.16-31.*, 192.168.*
  const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4) return false;
  const [, a, b] = ipv4.map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function validateExternalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error(
      `URL scheme not allowed: ${parsed.protocol}. Only http and https are permitted.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(`URL hostname not allowed: ${hostname}`);
  }

  if (isPrivateIp(hostname)) {
    throw new Error(`URL points to a private IP range: ${hostname}`);
  }
}
