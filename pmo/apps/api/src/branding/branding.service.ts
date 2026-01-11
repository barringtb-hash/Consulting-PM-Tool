/**
 * Branding Service
 *
 * Handles white-label branding configuration including:
 * - Logo management
 * - Color schemes
 * - Typography
 * - Custom CSS
 * - Email templates
 */

import { prisma } from '../prisma/client';
import type { TenantBrandingInput } from '../tenant/tenant.types';

/**
 * Default branding values
 */
export const DEFAULT_BRANDING = {
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#10B981',
  fontFamily: 'Inter',
  logoUrl: null,
  logoLightUrl: null,
  faviconUrl: null,
  customCss: null,
  emailLogoUrl: null,
  emailFooterText: null,
};

// ============================================================================
// BRANDING CRUD
// ============================================================================

/**
 * Get branding for a tenant.
 */
export async function getTenantBranding(tenantId: string) {
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId },
  });

  if (!branding) {
    return {
      tenantId,
      ...DEFAULT_BRANDING,
    };
  }

  return branding;
}

/**
 * Update tenant branding.
 */
export async function updateTenantBranding(
  tenantId: string,
  input: TenantBrandingInput,
) {
  // Validate color formats
  if (input.primaryColor && !isValidHexColor(input.primaryColor)) {
    throw new Error(
      'Invalid primary color format. Use hex format (e.g., #3B82F6)',
    );
  }
  if (input.secondaryColor && !isValidHexColor(input.secondaryColor)) {
    throw new Error('Invalid secondary color format. Use hex format');
  }
  if (input.accentColor && !isValidHexColor(input.accentColor)) {
    throw new Error('Invalid accent color format. Use hex format');
  }

  // Validate font family if provided
  if (input.fontFamily && !isValidFontFamily(input.fontFamily)) {
    throw new Error(
      'Invalid font family. Use a web-safe font or Google Font name',
    );
  }

  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      ...input,
    },
    update: input,
  });
}

/**
 * Reset branding to defaults.
 */
export async function resetBrandingToDefaults(tenantId: string) {
  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      ...DEFAULT_BRANDING,
    },
    update: DEFAULT_BRANDING,
  });
}

// ============================================================================
// LOGO MANAGEMENT
// ============================================================================

/**
 * Update logo URL.
 */
export async function updateLogo(
  tenantId: string,
  logoType: 'primary' | 'light' | 'favicon' | 'email',
  url: string | null,
) {
  const fieldMap = {
    primary: 'logoUrl',
    light: 'logoLightUrl',
    favicon: 'faviconUrl',
    email: 'emailLogoUrl',
  };

  const field = fieldMap[logoType];

  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      [field]: url,
    },
    update: {
      [field]: url,
    },
  });
}

/**
 * Get logo URLs for a tenant.
 */
export async function getLogos(tenantId: string) {
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId },
    select: {
      logoUrl: true,
      logoLightUrl: true,
      faviconUrl: true,
      emailLogoUrl: true,
    },
  });

  return (
    branding || {
      logoUrl: null,
      logoLightUrl: null,
      faviconUrl: null,
      emailLogoUrl: null,
    }
  );
}

// ============================================================================
// COLOR SCHEME
// ============================================================================

/**
 * Get color scheme for a tenant.
 */
export async function getColorScheme(tenantId: string) {
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId },
    select: {
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });

  return (
    branding || {
      primaryColor: DEFAULT_BRANDING.primaryColor,
      secondaryColor: DEFAULT_BRANDING.secondaryColor,
      accentColor: DEFAULT_BRANDING.accentColor,
    }
  );
}

/**
 * Update color scheme.
 */
export async function updateColorScheme(
  tenantId: string,
  colors: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  },
) {
  // Validate all colors
  for (const [key, value] of Object.entries(colors)) {
    if (value && !isValidHexColor(value)) {
      throw new Error(`Invalid ${key} format. Use hex format (e.g., #3B82F6)`);
    }
  }

  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      ...colors,
    },
    update: colors,
  });
}

/**
 * Generate CSS variables from branding.
 */
export function generateCssVariables(branding: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}): string {
  // Generate color variations
  const primary = branding.primaryColor;
  const secondary = branding.secondaryColor;
  const accent = branding.accentColor;

  return `
:root {
  --color-primary: ${primary};
  --color-primary-light: ${lightenColor(primary, 20)};
  --color-primary-dark: ${darkenColor(primary, 20)};
  --color-secondary: ${secondary};
  --color-secondary-light: ${lightenColor(secondary, 20)};
  --color-secondary-dark: ${darkenColor(secondary, 20)};
  --color-accent: ${accent};
  --color-accent-light: ${lightenColor(accent, 20)};
  --color-accent-dark: ${darkenColor(accent, 20)};
  --font-family: '${branding.fontFamily}', system-ui, sans-serif;
}
  `.trim();
}

// ============================================================================
// CUSTOM CSS
// ============================================================================

/**
 * Get custom CSS for a tenant.
 */
export async function getCustomCss(tenantId: string): Promise<string | null> {
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId },
    select: { customCss: true },
  });

  return branding?.customCss || null;
}

/**
 * Update custom CSS.
 */
export async function updateCustomCss(tenantId: string, css: string | null) {
  // Basic CSS validation - check for obvious issues
  if (css && css.includes('<script')) {
    throw new Error('Script tags are not allowed in custom CSS');
  }

  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      customCss: css,
    },
    update: {
      customCss: css,
    },
  });
}

// ============================================================================
// EMAIL BRANDING
// ============================================================================

/**
 * Get email branding settings.
 */
export async function getEmailBranding(tenantId: string) {
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId },
    select: {
      emailLogoUrl: true,
      emailFooterText: true,
      primaryColor: true,
    },
  });

  return (
    branding || {
      emailLogoUrl: null,
      emailFooterText: null,
      primaryColor: DEFAULT_BRANDING.primaryColor,
    }
  );
}

/**
 * Update email branding settings.
 */
export async function updateEmailBranding(
  tenantId: string,
  settings: {
    emailLogoUrl?: string | null;
    emailFooterText?: string | null;
  },
) {
  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      ...settings,
    },
    update: settings,
  });
}

// ============================================================================
// BRANDING PREVIEW
// ============================================================================

/**
 * Generate a branding preview with merged settings.
 */
export async function generateBrandingPreview(
  tenantId: string,
  previewChanges: Partial<TenantBrandingInput>,
) {
  const currentBranding = await getTenantBranding(tenantId);

  const mergedBranding = {
    ...currentBranding,
    ...previewChanges,
  };

  return {
    branding: mergedBranding,
    cssVariables: generateCssVariables({
      primaryColor:
        mergedBranding.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor:
        mergedBranding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      accentColor: mergedBranding.accentColor || DEFAULT_BRANDING.accentColor,
      fontFamily: mergedBranding.fontFamily || DEFAULT_BRANDING.fontFamily,
    }),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate hex color format.
 */
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate font family name.
 */
function isValidFontFamily(fontFamily: string): boolean {
  // Allow common web-safe fonts and Google Fonts naming convention
  return /^[a-zA-Z\s-]+$/.test(fontFamily);
}

/**
 * Lighten a hex color.
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);

  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);

  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Darken a hex color.
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);

  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);

  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}
