/**
 * Content Linting Service
 *
 * Scans marketing content for risky phrases and patterns that could be
 * misleading, overly promotional, or unethical.
 */

export interface ContentLintWarning {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  match: string;
  position?: number;
}

export interface ContentLintResult {
  isValid: boolean;
  warnings: ContentLintWarning[];
  errors: ContentLintWarning[];
  score: number; // 0-100, higher is better
}

/**
 * Risky phrases that should never appear in marketing content
 */
const RISKY_PHRASES = {
  guarantees: [
    /\bguaranteed?\b/i,
    /\b100%\s+(success|effective|certain|sure)/i,
    /\babsolutely\s+(guaranteed|certain|sure)/i,
    /\bno\s+risk\b/i,
    /\brisk-free\b/i,
    /\bcannot\s+fail\b/i,
    /\bwill\s+definitely\b/i,
    /\bcertain\s+to\s+succeed\b/i,
  ],
  exaggeration: [
    /\bthe\s+best\b/i,
    /\bworld-?class\b/i,
    /\bunprecedented\b/i,
    /\bgroundbreaking\b/i,
    /\bworld['']?s\s+first\b/i,
    /\bultimate\s+solution\b/i,
    /\bmiracle\s+cure\b/i,
  ],
  misleading: [
    /\binstant\s+(results|success)\b/i,
    /\bovernight\s+(success|results)\b/i,
    /\bwithout\s+any\s+effort\b/i,
    /\bno\s+work\s+required\b/i,
    /\bautomagically\b/i,
  ],
  pressure: [
    /\bact\s+now\b/i,
    /\blimited\s+time\s+only\b/i,
    /\bdon['']?t\s+miss\s+out\b/i,
    /\bonce\s+in\s+a\s+lifetime\b/i,
    /\bthis\s+offer\s+expires\b/i,
  ],
};

/**
 * Suspicious patterns that may indicate invented data
 */
const SUSPICIOUS_PATTERNS = {
  specificMetrics: [
    /\d+(\.\d+)?%\s+(increase|decrease|improvement|growth|reduction)/i,
    /\b(increased|decreased|improved|grew|reduced)\s+by\s+\d+(\.\d+)?%/i,
    /\$\d+[,\d]*\s+(saved|revenue|profit|ROI)/i,
  ],
  absoluteNumbers: [/\b100%\b/i, /\b0%\s+(failure|error)/i],
};

/**
 * Words to avoid in professional content
 */
const UNPROFESSIONAL_WORDS = [
  /\bamazing\b/i,
  /\bawesome\b/i,
  /\bincredible\b/i,
  /\bmind-blowing\b/i,
  /\binsane\b/i,
  /\bcrazy\sgood\b/i,
];

/**
 * Lint marketing content for quality and safety issues
 */
export function lintMarketingContent(content: {
  title?: string;
  body: string;
  summary?: string;
}): ContentLintResult {
  const warnings: ContentLintWarning[] = [];
  const errors: ContentLintWarning[] = [];

  const fullText = [content.title, content.body, content.summary]
    .filter(Boolean)
    .join('\n');

  // Check for risky guarantee phrases
  for (const pattern of RISKY_PHRASES.guarantees) {
    const match = fullText.match(pattern);
    if (match) {
      errors.push({
        type: 'error',
        category: 'Guarantees',
        message:
          'Content contains guarantee language that could be misleading or unethical',
        match: match[0],
        position: match.index,
      });
    }
  }

  // Check for exaggeration
  for (const pattern of RISKY_PHRASES.exaggeration) {
    const match = fullText.match(pattern);
    if (match) {
      warnings.push({
        type: 'warning',
        category: 'Exaggeration',
        message: 'Content contains potentially exaggerated claims',
        match: match[0],
        position: match.index,
      });
    }
  }

  // Check for misleading phrases
  for (const pattern of RISKY_PHRASES.misleading) {
    const match = fullText.match(pattern);
    if (match) {
      errors.push({
        type: 'error',
        category: 'Misleading',
        message: 'Content contains misleading language',
        match: match[0],
        position: match.index,
      });
    }
  }

  // Check for pressure tactics
  for (const pattern of RISKY_PHRASES.pressure) {
    const match = fullText.match(pattern);
    if (match) {
      warnings.push({
        type: 'warning',
        category: 'Pressure Tactics',
        message: 'Content uses pressure or urgency tactics',
        match: match[0],
        position: match.index,
      });
    }
  }

  // Check for specific metrics (might be fabricated)
  for (const pattern of SUSPICIOUS_PATTERNS.specificMetrics) {
    const match = fullText.match(pattern);
    if (match) {
      // Check if it's in brackets (placeholder) - that's OK
      const isPlaceholder = /\[.*\]/.test(match[0]);
      if (!isPlaceholder) {
        warnings.push({
          type: 'warning',
          category: 'Specific Metrics',
          message:
            'Content contains specific metrics - verify these are accurate and not fabricated',
          match: match[0],
          position: match.index,
        });
      }
    }
  }

  // Check for absolute numbers
  for (const pattern of SUSPICIOUS_PATTERNS.absoluteNumbers) {
    const match = fullText.match(pattern);
    if (match) {
      warnings.push({
        type: 'warning',
        category: 'Absolute Claims',
        message:
          'Content contains absolute percentage claims - verify accuracy',
        match: match[0],
        position: match.index,
      });
    }
  }

  // Check for unprofessional language (info level)
  for (const pattern of UNPROFESSIONAL_WORDS) {
    const match = fullText.match(pattern);
    if (match) {
      warnings.push({
        type: 'info',
        category: 'Tone',
        message: 'Consider using more professional language',
        match: match[0],
        position: match.index,
      });
    }
  }

  // Calculate score based on findings
  const errorPenalty = errors.length * 20;
  const warningPenalty = warnings.filter((w) => w.type === 'warning').length * 5;
  const score = Math.max(0, 100 - errorPenalty - warningPenalty);

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    score,
  };
}

/**
 * Get a summary of lint results
 */
export function getLintSummary(result: ContentLintResult): string {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return '✓ Content passes all quality checks';
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(
      `${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`,
    );
  }

  if (result.warnings.length > 0) {
    parts.push(
      `${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`,
    );
  }

  return `⚠ ${parts.join(', ')} found - Score: ${result.score}/100`;
}
