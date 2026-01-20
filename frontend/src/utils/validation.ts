/**
 * Validates that a string contains actual content (not just whitespace)
 * Handles regular spaces, unicode whitespace, and zero-width characters
 */
export function hasActualContent(value: string): boolean {
  if (!value) return false;
  
  // Remove all types of whitespace and invisible characters:
  // \s - regular whitespace
  // \p{Z} - unicode space separators  
  // \p{C} - unicode control characters (includes zero-width chars)
  const cleaned = value.replace(/[\s\p{Z}\p{C}]+/gu, '');
  
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