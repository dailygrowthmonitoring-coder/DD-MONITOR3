/**
 * Business-rule hostname validators for DD appliances.
 *
 * Dell Data Domain appliances at Zain Iraq use FQDNs of the form:
 *   <Model><SiteSuffix>.iq.zain.com
 * e.g. "DD6300BSR.iq.zain.com", "DD9800BGDB.iq.zain.com"
 *
 * These validators enforce structural constraints that go beyond what Zod
 * can express with a simple string schema.
 */

/**
 * A valid hostname is 1–253 characters, consists of labels separated by dots,
 * and each label contains only [A-Za-z0-9-] (hyphens not at start/end).
 * This matches the RFC 1123 hostname specification.
 */
const VALID_HOSTNAME_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/**
 * Returns true if the string is a syntactically valid hostname per RFC 1123.
 *
 * @param hostname - Fully-qualified or short hostname string.
 */
export function isValidHostname(hostname: string): boolean {
  if (hostname.length === 0 || hostname.length > 253) return false;
  return VALID_HOSTNAME_RE.test(hostname);
}

/** Known Data Domain model prefixes present in the Zain Iraq fleet. */
const KNOWN_DD_MODEL_PREFIXES = ['DD6300', 'DD9800', 'DD3300', 'DD6900', 'DD9300'] as const;

/**
 * Returns true if the hostname matches the DD appliance naming convention
 * used at Zain Iraq: starts with one of the known DD model prefixes (case-
 * insensitive) followed by alphanumeric site suffixes.
 *
 * This is a best-effort check — new models not in `KNOWN_DD_MODEL_PREFIXES`
 * will return false, but the ingestion pipeline only warns (does not reject)
 * on this check. Use it for advisory logging, not hard rejection.
 *
 * @param hostname - Short or FQDN hostname, e.g. "DD6300BSR.iq.zain.com".
 */
export function isKnownDdHostname(hostname: string): boolean {
  const label = hostname.split('.')[0] ?? '';
  return KNOWN_DD_MODEL_PREFIXES.some((prefix) =>
    label.toUpperCase().startsWith(prefix),
  );
}

/**
 * Extracts a short site-code from a Data Domain FQDN.
 * "DD6300BSR.iq.zain.com" → "BSR"
 * "DD9800BGDB.iq.zain.com" → "BGDB"
 *
 * Returns null if the hostname does not match any known model prefix.
 *
 * @param hostname - FQDN or short hostname of a DD appliance.
 */
export function extractDdSiteCode(hostname: string): string | null {
  const label = hostname.split('.')[0] ?? '';
  for (const prefix of KNOWN_DD_MODEL_PREFIXES) {
    if (label.toUpperCase().startsWith(prefix)) {
      return label.slice(prefix.length) || null;
    }
  }
  return null;
}
