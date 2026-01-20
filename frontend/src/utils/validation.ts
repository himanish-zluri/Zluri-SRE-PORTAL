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
 * Normalizes whitespace in a string by:
 * 1. Trimming leading/trailing whitespace (including unicode)
 * 2. Collapsing multiple consecutive spaces into single spaces
 */
export function normalizeWhitespace(value: string): string {
  if (!value) return '';
  
  return value
    // Trim all types of whitespace including unicode
    .replace(/^[\s\p{Z}]+|[\s\p{Z}]+$/gu, '')
    // Collapse multiple consecutive whitespace into single spaces
    .replace(/[\s\p{Z}]+/gu, ' ');
}