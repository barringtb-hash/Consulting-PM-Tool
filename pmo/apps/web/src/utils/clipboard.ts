/**
 * Clipboard utility with Safari and older browser fallback support.
 *
 * Safari and some other browsers have strict clipboard permissions that
 * require clipboard writes to happen during the immediate user gesture.
 * When there's an async operation (like an API call) between the user
 * click and the clipboard write, the gesture "expires" and the modern
 * Clipboard API fails with a NotAllowedError.
 *
 * This utility tries the modern Clipboard API first, then falls back to
 * the older document.execCommand('copy') approach which has more lenient
 * timing requirements.
 */

/**
 * Copy text to clipboard with automatic fallback for browsers with
 * strict clipboard permissions (Safari) or older browsers.
 *
 * @param text - The text to copy to the clipboard
 * @returns Promise resolving to true if copy succeeded, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // SSR guard
  if (typeof document === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback method (Safari permission error, etc.)
    }
  }

  // Fallback: Use execCommand with a temporary textarea
  // This works in Safari and older browsers where Clipboard API fails
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Position off-screen to avoid visual flash
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', ''); // Prevent mobile keyboard popup

    document.body.appendChild(textarea);

    // Ensure document has focus before selecting (helps with Safari iOS)
    if (document.body.focus) {
      document.body.focus();
    }

    textarea.focus();
    textarea.select();

    // For iOS Safari, we need to set selection range
    textarea.setSelectionRange(0, textarea.value.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
