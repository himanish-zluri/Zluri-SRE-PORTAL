/**
 * Validates that a string contains actual content (not just whitespace)
 * Handles both regular spaces and unicode whitespace characters
 */
export function hasActualContent(value: string): boolean {
  if (!value) return false;
  
  // Remove all types of whitespace including unicode spaces
  // \s matches regular whitespace, \p{Z} matches unicode space separators
  const cleaned = value.replace(/[\s\p{Z}]+/gu, '');
  
  return cleaned.length > 0;
}

/**
 * Preserves the string exactly as-is (no normalization)
 * Only used to maintain consistent API, but doesn't modify the input
 */
export function normalizeWhitespace(value: string): string {
  // Return the value exactly as-is to preserve user formatting
  return value;
}