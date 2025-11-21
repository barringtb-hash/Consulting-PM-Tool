import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

/**
 * Accessibility testing helper using axe-core
 *
 * This helper runs accessibility scans on pages and reports violations.
 * It follows WCAG 2.1 Level AA standards by default.
 */

export interface AccessibilityScanOptions {
  /**
   * Exclude specific rules from the scan
   * Example: ['color-contrast'] to skip color contrast checks
   */
  excludeRules?: string[];

  /**
   * Only run specific rules
   * Example: ['label', 'button-name'] to only check labels and buttons
   */
  includeRules?: string[];

  /**
   * Exclude specific selectors from the scan
   * Example: ['#third-party-widget'] to exclude external widgets
   */
  excludeSelectors?: string[];

  /**
   * Fail the test on these violation levels
   * Default: ['critical', 'serious']
   */
  failOn?: ('critical' | 'serious' | 'moderate' | 'minor')[];
}

export interface ViolationSummary {
  total: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    help: string;
    helpUrl: string;
    nodes: number;
  }>;
}

/**
 * Run accessibility scan on the current page
 *
 * @param page - Playwright page object
 * @param options - Scan configuration options
 * @returns Summary of violations found
 */
export async function runAccessibilityScan(
  page: Page,
  options: AccessibilityScanOptions = {},
): Promise<ViolationSummary> {
  const {
    excludeRules = [],
    includeRules = [],
    excludeSelectors = [],
    failOn = ['critical', 'serious'],
  } = options;

  // Build the axe scan
  let axeBuilder = new AxeBuilder({ page });

  // Apply rule filters
  if (excludeRules.length > 0) {
    axeBuilder = axeBuilder.disableRules(excludeRules);
  }

  if (includeRules.length > 0) {
    axeBuilder = axeBuilder.withRules(includeRules);
  }

  // Apply selector exclusions
  if (excludeSelectors.length > 0) {
    excludeSelectors.forEach((selector) => {
      axeBuilder = axeBuilder.exclude(selector);
    });
  }

  // Run the scan
  const results = await axeBuilder.analyze();

  // Categorize violations by impact
  const summary: ViolationSummary = {
    total: results.violations.length,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    violations: [],
  };

  for (const violation of results.violations) {
    const impact = violation.impact || 'minor';

    // Count by impact level
    if (impact === 'critical') summary.critical++;
    else if (impact === 'serious') summary.serious++;
    else if (impact === 'moderate') summary.moderate++;
    else if (impact === 'minor') summary.minor++;

    // Add to violations list
    summary.violations.push({
      id: violation.id,
      impact: impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length,
    });
  }

  // Log summary for visibility
  if (summary.total > 0) {
    console.log('\n🔍 Accessibility Scan Results:');
    console.log(`   Total violations: ${summary.total}`);
    console.log(`   Critical: ${summary.critical}`);
    console.log(`   Serious: ${summary.serious}`);
    console.log(`   Moderate: ${summary.moderate}`);
    console.log(`   Minor: ${summary.minor}\n`);

    // Log each violation
    summary.violations.forEach((v, idx) => {
      console.log(`   ${idx + 1}. [${v.impact.toUpperCase()}] ${v.id}`);
      console.log(`      ${v.help}`);
      console.log(`      Affected elements: ${v.nodes}`);
      console.log(`      More info: ${v.helpUrl}\n`);
    });
  }

  // Fail the test if critical/serious violations exist (based on failOn config)
  const shouldFail = failOn.some((level) => {
    if (level === 'critical') return summary.critical > 0;
    if (level === 'serious') return summary.serious > 0;
    if (level === 'moderate') return summary.moderate > 0;
    if (level === 'minor') return summary.minor > 0;
    return false;
  });

  if (shouldFail) {
    const failLevels = failOn.join(', ');
    expect(
      summary.total,
      `Found accessibility violations (fail on: ${failLevels})`,
    ).toBe(0);
  }

  return summary;
}

/**
 * Convenience function to scan a page after navigation
 *
 * @param page - Playwright page object
 * @param url - URL to navigate to before scanning
 * @param options - Scan configuration options
 */
export async function scanPage(
  page: Page,
  url: string,
  options: AccessibilityScanOptions = {},
): Promise<ViolationSummary> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return runAccessibilityScan(page, options);
}

/**
 * Scan for common accessibility issues
 * This is a focused scan that checks the most important accessibility criteria
 *
 * @param page - Playwright page object
 */
export async function scanCommonIssues(page: Page): Promise<ViolationSummary> {
  return runAccessibilityScan(page, {
    includeRules: [
      'label',              // Form labels
      'button-name',        // Button accessible names
      'link-name',          // Link accessible names
      'image-alt',          // Image alt text
      'aria-required-attr', // Required ARIA attributes
      'aria-valid-attr',    // Valid ARIA attributes
      'color-contrast',     // Color contrast
      'heading-order',      // Heading hierarchy
      'html-has-lang',      // HTML lang attribute
      'landmark-one-main',  // Single main landmark
    ],
  });
}
