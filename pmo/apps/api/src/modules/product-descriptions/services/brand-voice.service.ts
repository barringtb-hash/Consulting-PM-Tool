/**
 * Brand Voice Service
 *
 * Handles brand voice training and analysis for product descriptions.
 * Extracts voice characteristics from sample content and creates
 * structured profiles that influence AI generation.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export interface BrandVoiceProfile {
  // Core voice characteristics
  toneMarkers: string[];
  preferredPhrases: string[];
  prohibitedWords: string[];

  // Style rules
  styleRules: {
    sentenceLength: 'short' | 'medium' | 'long' | 'varied';
    usePunctuation: 'minimal' | 'standard' | 'expressive';
    useEmoji: boolean;
    formalityLevel: 'casual' | 'neutral' | 'formal' | 'professional';
    useFirstPerson: boolean;
    useSecondPerson: boolean;
    technicalLevel: 'simple' | 'moderate' | 'technical';
  };

  // Vocabulary preferences
  vocabulary: {
    powerWords: string[];
    avoidWords: string[];
    industryTerms: string[];
    callToActionStyle: string;
  };

  // Training metadata
  trainingStatus: 'untrained' | 'training' | 'trained' | 'needs_update';
  sampleCount: number;
  lastTrainedAt?: string;
  confidenceScore: number;
}

export interface TrainVoiceInput {
  sampleDescriptions: string[];
  manualGuidelines?: {
    tone?: string;
    prohibitedWords?: string[];
    preferredPhrases?: string[];
    formalityLevel?: string;
    additionalInstructions?: string;
  };
}

export interface VoiceAnalysisResult {
  profile: BrandVoiceProfile;
  analysis: {
    detectedTone: string;
    averageSentenceLength: number;
    vocabularyComplexity: number;
    commonPatterns: string[];
    suggestions: string[];
  };
}

// ============================================================================
// BRAND VOICE TRAINING
// ============================================================================

/**
 * Train brand voice from sample descriptions
 */
export async function trainBrandVoice(
  configId: number,
  input: TrainVoiceInput,
): Promise<VoiceAnalysisResult> {
  const config = await prisma.productDescriptionConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Configuration not found');
  }

  const { sampleDescriptions, manualGuidelines } = input;

  if (sampleDescriptions.length < 2) {
    throw new Error('At least 2 sample descriptions are required for training');
  }

  if (sampleDescriptions.length > 20) {
    throw new Error('Maximum 20 sample descriptions allowed');
  }

  // Analyze samples with AI if available, otherwise use rule-based analysis
  const analysis = env.openaiApiKey
    ? await analyzeWithAI(sampleDescriptions, manualGuidelines)
    : analyzeWithRules(sampleDescriptions, manualGuidelines);

  // Create the brand voice profile
  const profile: BrandVoiceProfile = {
    toneMarkers: analysis.toneMarkers,
    preferredPhrases: analysis.preferredPhrases,
    prohibitedWords: [
      ...(manualGuidelines?.prohibitedWords || []),
      ...analysis.detectedProhibitedWords,
    ],
    styleRules: analysis.styleRules,
    vocabulary: {
      powerWords: analysis.powerWords,
      avoidWords: analysis.avoidWords,
      industryTerms: analysis.industryTerms,
      callToActionStyle: analysis.callToActionStyle,
    },
    trainingStatus: 'trained',
    sampleCount: sampleDescriptions.length,
    lastTrainedAt: new Date().toISOString(),
    confidenceScore: analysis.confidenceScore,
  };

  // Save to database
  await prisma.productDescriptionConfig.update({
    where: { id: configId },
    data: {
      brandVoiceProfile: profile as object,
    },
  });

  return {
    profile,
    analysis: {
      detectedTone: analysis.detectedTone,
      averageSentenceLength: analysis.averageSentenceLength,
      vocabularyComplexity: analysis.vocabularyComplexity,
      commonPatterns: analysis.commonPatterns,
      suggestions: analysis.suggestions,
    },
  };
}

/**
 * Get brand voice profile for a config
 */
export async function getBrandVoiceProfile(
  configId: number,
): Promise<BrandVoiceProfile | null> {
  const config = await prisma.productDescriptionConfig.findUnique({
    where: { id: configId },
    select: { brandVoiceProfile: true },
  });

  if (!config?.brandVoiceProfile) {
    return null;
  }

  return config.brandVoiceProfile as unknown as BrandVoiceProfile;
}

/**
 * Update brand voice profile manually
 */
export async function updateBrandVoiceProfile(
  configId: number,
  updates: Partial<BrandVoiceProfile>,
): Promise<BrandVoiceProfile> {
  const existing = await getBrandVoiceProfile(configId);

  const profile: BrandVoiceProfile = {
    ...(existing || getDefaultProfile()),
    ...updates,
    trainingStatus: existing?.trainingStatus || 'untrained',
  };

  await prisma.productDescriptionConfig.update({
    where: { id: configId },
    data: {
      brandVoiceProfile: profile as object,
    },
  });

  return profile;
}

/**
 * Analyze sample content to extract voice score (0-100)
 */
export async function analyzeVoiceMatch(
  configId: number,
  content: string,
): Promise<{ score: number; feedback: string[] }> {
  const profile = await getBrandVoiceProfile(configId);

  if (!profile || profile.trainingStatus === 'untrained') {
    return {
      score: 100, // No profile means all content matches by default
      feedback: ['No brand voice profile configured'],
    };
  }

  const feedback: string[] = [];
  let score = 100;

  // Check prohibited words
  const prohibitedFound = profile.prohibitedWords.filter((word) =>
    content.toLowerCase().includes(word.toLowerCase()),
  );
  if (prohibitedFound.length > 0) {
    score -= prohibitedFound.length * 10;
    feedback.push(`Prohibited words found: ${prohibitedFound.join(', ')}`);
  }

  // Check preferred phrases
  const preferredUsed = profile.preferredPhrases.filter((phrase) =>
    content.toLowerCase().includes(phrase.toLowerCase()),
  );
  if (preferredUsed.length > 0) {
    score += Math.min(preferredUsed.length * 5, 15); // Bonus for using preferred phrases
  }

  // Check formality level
  const formalityScore = checkFormalityMatch(
    content,
    profile.styleRules.formalityLevel,
  );
  if (formalityScore < 0.7) {
    score -= 10;
    feedback.push(
      `Tone doesn't match expected ${profile.styleRules.formalityLevel} style`,
    );
  }

  // Check sentence length preference
  const avgSentenceLength = calculateAverageSentenceLength(content);
  const lengthMatch = checkSentenceLengthMatch(
    avgSentenceLength,
    profile.styleRules.sentenceLength,
  );
  if (!lengthMatch) {
    score -= 5;
    feedback.push(
      `Sentence length doesn't match ${profile.styleRules.sentenceLength} preference`,
    );
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    feedback,
  };
}

// ============================================================================
// AI-POWERED ANALYSIS
// ============================================================================

interface AnalysisResult {
  toneMarkers: string[];
  preferredPhrases: string[];
  detectedProhibitedWords: string[];
  styleRules: BrandVoiceProfile['styleRules'];
  powerWords: string[];
  avoidWords: string[];
  industryTerms: string[];
  callToActionStyle: string;
  detectedTone: string;
  averageSentenceLength: number;
  vocabularyComplexity: number;
  commonPatterns: string[];
  suggestions: string[];
  confidenceScore: number;
}

async function analyzeWithAI(
  samples: string[],
  manualGuidelines?: TrainVoiceInput['manualGuidelines'],
): Promise<AnalysisResult> {
  const prompt = `Analyze the following product descriptions to extract brand voice characteristics.

SAMPLE DESCRIPTIONS:
${samples.map((s, i) => `[Sample ${i + 1}]:\n${s}`).join('\n\n')}

${
  manualGuidelines
    ? `MANUAL GUIDELINES PROVIDED:
- Desired tone: ${manualGuidelines.tone || 'Not specified'}
- Prohibited words: ${manualGuidelines.prohibitedWords?.join(', ') || 'None'}
- Preferred phrases: ${manualGuidelines.preferredPhrases?.join(', ') || 'None'}
- Formality level: ${manualGuidelines.formalityLevel || 'Not specified'}
- Additional instructions: ${manualGuidelines.additionalInstructions || 'None'}`
    : ''
}

Analyze these descriptions and provide a JSON response with the following structure:
{
  "toneMarkers": ["descriptive phrases about the detected tone"],
  "preferredPhrases": ["commonly used phrases that define the brand"],
  "detectedProhibitedWords": ["words that seem inconsistent with the brand"],
  "styleRules": {
    "sentenceLength": "short|medium|long|varied",
    "usePunctuation": "minimal|standard|expressive",
    "useEmoji": true|false,
    "formalityLevel": "casual|neutral|formal|professional",
    "useFirstPerson": true|false,
    "useSecondPerson": true|false,
    "technicalLevel": "simple|moderate|technical"
  },
  "powerWords": ["impactful words frequently used"],
  "avoidWords": ["words to avoid based on patterns"],
  "industryTerms": ["industry-specific terminology used"],
  "callToActionStyle": "description of CTA approach",
  "detectedTone": "overall tone description",
  "averageSentenceLength": 15,
  "vocabularyComplexity": 0.5,
  "commonPatterns": ["structural patterns identified"],
  "suggestions": ["improvement suggestions"],
  "confidenceScore": 0.85
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert copywriting analyst specializing in brand voice extraction. Provide detailed, actionable insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('AI analysis error:', error);
  }

  // Fallback to rule-based analysis
  return analyzeWithRules(samples, manualGuidelines);
}

// ============================================================================
// RULE-BASED ANALYSIS
// ============================================================================

function analyzeWithRules(
  samples: string[],
  manualGuidelines?: TrainVoiceInput['manualGuidelines'],
): AnalysisResult {
  const combinedText = samples.join(' ');
  const sentences = combinedText
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);
  const words = combinedText.toLowerCase().split(/\s+/);

  // Calculate metrics
  const avgSentenceLength =
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) /
    sentences.length;

  // Detect formality
  const formalIndicators = [
    'furthermore',
    'therefore',
    'consequently',
    'regarding',
    'hereby',
  ];
  const casualIndicators = [
    'awesome',
    'great',
    'cool',
    'amazing',
    'love',
    "you'll",
  ];
  const formalCount = formalIndicators.filter((w) =>
    combinedText.toLowerCase().includes(w),
  ).length;
  const casualCount = casualIndicators.filter((w) =>
    combinedText.toLowerCase().includes(w),
  ).length;

  let formalityLevel: BrandVoiceProfile['styleRules']['formalityLevel'] =
    'neutral';
  if (formalCount > casualCount) formalityLevel = 'professional';
  else if (casualCount > formalCount) formalityLevel = 'casual';

  // Detect sentence length preference
  let sentenceLength: BrandVoiceProfile['styleRules']['sentenceLength'] =
    'medium';
  if (avgSentenceLength < 10) sentenceLength = 'short';
  else if (avgSentenceLength > 20) sentenceLength = 'long';

  // Extract common phrases (2-3 word combinations that appear multiple times)
  const phrases = extractCommonPhrases(samples);

  // Detect power words
  const powerWordList = [
    'premium',
    'exclusive',
    'innovative',
    'revolutionary',
    'essential',
    'luxurious',
    'exceptional',
    'superior',
    'ultimate',
    'proven',
    'guaranteed',
    'authentic',
    'handcrafted',
    'sustainable',
    'elegant',
  ];
  const powerWords = powerWordList.filter((w) =>
    combinedText.toLowerCase().includes(w),
  );

  // Check for second person usage
  const secondPersonWords = ['you', 'your', "you'll", "you're"];
  const useSecondPerson = secondPersonWords.some((w) =>
    words.includes(w.toLowerCase()),
  );

  // Check for emoji usage
  const hasEmoji =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
      combinedText,
    );

  return {
    toneMarkers: detectToneMarkers(combinedText),
    preferredPhrases:
      manualGuidelines?.preferredPhrases || phrases.slice(0, 10),
    detectedProhibitedWords: [],
    styleRules: {
      sentenceLength,
      usePunctuation: combinedText.includes('!') ? 'expressive' : 'standard',
      useEmoji: hasEmoji,
      formalityLevel:
        (manualGuidelines?.formalityLevel as BrandVoiceProfile['styleRules']['formalityLevel']) ||
        formalityLevel,
      useFirstPerson: words.includes('we') || words.includes('our'),
      useSecondPerson,
      technicalLevel: detectTechnicalLevel(combinedText),
    },
    powerWords,
    avoidWords: [],
    industryTerms: extractIndustryTerms(combinedText),
    callToActionStyle: detectCTAStyle(combinedText),
    detectedTone: manualGuidelines?.tone || detectOverallTone(combinedText),
    averageSentenceLength: Math.round(avgSentenceLength),
    vocabularyComplexity: calculateVocabularyComplexity(words),
    commonPatterns: detectPatterns(samples),
    suggestions: generateSuggestions(samples),
    confidenceScore: 0.7, // Rule-based has lower confidence
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDefaultProfile(): BrandVoiceProfile {
  return {
    toneMarkers: [],
    preferredPhrases: [],
    prohibitedWords: [],
    styleRules: {
      sentenceLength: 'medium',
      usePunctuation: 'standard',
      useEmoji: false,
      formalityLevel: 'professional',
      useFirstPerson: false,
      useSecondPerson: true,
      technicalLevel: 'moderate',
    },
    vocabulary: {
      powerWords: [],
      avoidWords: [],
      industryTerms: [],
      callToActionStyle: 'direct',
    },
    trainingStatus: 'untrained',
    sampleCount: 0,
    confidenceScore: 0,
  };
}

function extractCommonPhrases(samples: string[]): string[] {
  const phraseCount: Record<string, number> = {};

  for (const sample of samples) {
    const words = sample.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const twoWord = `${words[i]} ${words[i + 1]}`;
      phraseCount[twoWord] = (phraseCount[twoWord] || 0) + 1;

      if (i < words.length - 2) {
        const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phraseCount[threeWord] = (phraseCount[threeWord] || 0) + 1;
      }
    }
  }

  return Object.entries(phraseCount)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase)
    .slice(0, 15);
}

function detectToneMarkers(text: string): string[] {
  const markers: string[] = [];
  const lowerText = text.toLowerCase();

  if (lowerText.includes('premium') || lowerText.includes('luxury')) {
    markers.push('upscale', 'premium positioning');
  }
  if (lowerText.includes('eco') || lowerText.includes('sustainable')) {
    markers.push('eco-conscious', 'sustainability-focused');
  }
  if (lowerText.includes('innovative') || lowerText.includes('cutting-edge')) {
    markers.push('innovation-driven', 'forward-thinking');
  }
  if (lowerText.includes('handmade') || lowerText.includes('artisan')) {
    markers.push('craft-focused', 'artisanal');
  }
  if (text.includes('!')) {
    markers.push('enthusiastic');
  }

  return markers.length > 0 ? markers : ['balanced', 'informative'];
}

function detectTechnicalLevel(
  text: string,
): BrandVoiceProfile['styleRules']['technicalLevel'] {
  const technicalWords = [
    'specifications',
    'dimensions',
    'capacity',
    'voltage',
    'compatible',
    'configuration',
    'integration',
  ];
  const count = technicalWords.filter((w) =>
    text.toLowerCase().includes(w),
  ).length;

  if (count >= 3) return 'technical';
  if (count >= 1) return 'moderate';
  return 'simple';
}

function extractIndustryTerms(text: string): string[] {
  // This would be more sophisticated in production
  const terms: string[] = [];
  const lowerText = text.toLowerCase();

  // Fashion terms
  const fashionTerms = [
    'thread count',
    'organic cotton',
    'moisture-wicking',
    'breathable',
  ];
  fashionTerms.forEach((term) => {
    if (lowerText.includes(term)) terms.push(term);
  });

  // Tech terms
  const techTerms = [
    'bluetooth',
    'wireless',
    'usb-c',
    'battery life',
    'hd',
    '4k',
  ];
  techTerms.forEach((term) => {
    if (lowerText.includes(term)) terms.push(term);
  });

  return terms;
}

function detectCTAStyle(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('shop now') || lowerText.includes('buy now')) {
    return 'direct and urgent';
  }
  if (lowerText.includes('discover') || lowerText.includes('explore')) {
    return 'inviting and exploratory';
  }
  if (lowerText.includes('try') || lowerText.includes('experience')) {
    return 'experiential';
  }
  return 'subtle';
}

function detectOverallTone(text: string): string {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes('premium') ||
    lowerText.includes('luxury') ||
    lowerText.includes('exclusive')
  ) {
    return 'sophisticated and premium';
  }
  if (
    lowerText.includes('fun') ||
    lowerText.includes('exciting') ||
    text.includes('!')
  ) {
    return 'energetic and engaging';
  }
  if (
    lowerText.includes('trust') ||
    lowerText.includes('reliable') ||
    lowerText.includes('proven')
  ) {
    return 'trustworthy and authoritative';
  }
  return 'professional and informative';
}

function calculateVocabularyComplexity(words: string[]): number {
  const uniqueWords = new Set(words);
  const avgWordLength =
    words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Simple complexity score: ratio of unique words + average word length factor
  const uniqueRatio = uniqueWords.size / words.length;
  const lengthFactor = Math.min(avgWordLength / 10, 1);

  return Math.round((uniqueRatio * 0.5 + lengthFactor * 0.5) * 100) / 100;
}

function detectPatterns(samples: string[]): string[] {
  const patterns: string[] = [];

  // Check for bullet point usage
  if (samples.some((s) => s.includes('•') || s.includes('-'))) {
    patterns.push('Uses bullet points for features');
  }

  // Check for numbered lists
  if (samples.some((s) => /\d\.\s/.test(s))) {
    patterns.push('Uses numbered lists');
  }

  // Check for question-answer format
  if (samples.some((s) => s.includes('?'))) {
    patterns.push('Uses rhetorical questions');
  }

  // Check for benefit-focused starts
  const benefitStarters = ['discover', 'experience', 'enjoy', 'transform'];
  if (
    samples.some((s) =>
      benefitStarters.some((starter) => s.toLowerCase().startsWith(starter)),
    )
  ) {
    patterns.push('Leads with benefits');
  }

  return patterns;
}

function generateSuggestions(samples: string[]): string[] {
  const suggestions: string[] = [];
  const avgLength =
    samples.reduce((sum, s) => sum + s.length, 0) / samples.length;

  if (avgLength < 100) {
    suggestions.push(
      'Consider adding more detail to descriptions for better SEO',
    );
  }
  if (avgLength > 500) {
    suggestions.push(
      'Descriptions may be too long; consider creating shorter variants',
    );
  }

  const hasKeywords = samples.some(
    (s) =>
      s.toLowerCase().includes('perfect for') ||
      s.toLowerCase().includes('ideal for'),
  );
  if (!hasKeywords) {
    suggestions.push(
      'Consider adding use-case phrases like "perfect for" to improve relevance',
    );
  }

  return suggestions;
}

function checkFormalityMatch(
  text: string,
  expected: BrandVoiceProfile['styleRules']['formalityLevel'],
): number {
  const formalIndicators = [
    'furthermore',
    'therefore',
    'consequently',
    'regarding',
  ];
  const casualIndicators = ['awesome', 'great', 'cool', 'amazing'];

  const formalCount = formalIndicators.filter((w) =>
    text.toLowerCase().includes(w),
  ).length;
  const casualCount = casualIndicators.filter((w) =>
    text.toLowerCase().includes(w),
  ).length;

  const detected =
    formalCount > casualCount
      ? 'professional'
      : casualCount > formalCount
        ? 'casual'
        : 'neutral';

  if (detected === expected) return 1;
  if (
    (detected === 'neutral' &&
      (expected === 'formal' || expected === 'casual')) ||
    (expected === 'neutral' &&
      (detected === 'professional' || detected === 'casual'))
  ) {
    return 0.7;
  }
  return 0.4;
}

function calculateAverageSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  return (
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) /
    sentences.length
  );
}

function checkSentenceLengthMatch(
  avgLength: number,
  expected: BrandVoiceProfile['styleRules']['sentenceLength'],
): boolean {
  switch (expected) {
    case 'short':
      return avgLength <= 12;
    case 'medium':
      return avgLength > 10 && avgLength <= 20;
    case 'long':
      return avgLength > 18;
    case 'varied':
      return true;
    default:
      return true;
  }
}

// ============================================================================
// PROMPT BUILDER FOR GENERATION
// ============================================================================

/**
 * Build brand voice instructions for AI generation prompt
 */
export function buildBrandVoicePrompt(profile: BrandVoiceProfile): string {
  if (profile.trainingStatus === 'untrained') {
    return '';
  }

  const instructions: string[] = [];

  // Tone and style
  if (profile.toneMarkers.length > 0) {
    instructions.push(`TONE: ${profile.toneMarkers.join(', ')}`);
  }

  // Formality
  instructions.push(
    `FORMALITY: Write in a ${profile.styleRules.formalityLevel} style`,
  );

  // Technical level
  instructions.push(
    `TECHNICAL LEVEL: Use ${profile.styleRules.technicalLevel} language complexity`,
  );

  // Sentence structure
  instructions.push(
    `SENTENCE LENGTH: Keep sentences ${profile.styleRules.sentenceLength}`,
  );

  // Person usage
  if (profile.styleRules.useSecondPerson) {
    instructions.push(
      'ADDRESS: Use "you/your" to speak directly to the customer',
    );
  }
  if (profile.styleRules.useFirstPerson) {
    instructions.push('VOICE: Use "we/our" when referring to the brand');
  }

  // Punctuation
  if (profile.styleRules.usePunctuation === 'expressive') {
    instructions.push(
      'PUNCTUATION: Use exclamation points to convey enthusiasm',
    );
  } else if (profile.styleRules.usePunctuation === 'minimal') {
    instructions.push('PUNCTUATION: Keep punctuation minimal and professional');
  }

  // Preferred phrases
  if (profile.preferredPhrases.length > 0) {
    instructions.push(
      `PREFERRED PHRASES: Try to incorporate: ${profile.preferredPhrases.slice(0, 5).join(', ')}`,
    );
  }

  // Prohibited words
  if (profile.prohibitedWords.length > 0) {
    instructions.push(
      `PROHIBITED WORDS: Never use: ${profile.prohibitedWords.join(', ')}`,
    );
  }

  // Power words
  if (profile.vocabulary.powerWords.length > 0) {
    instructions.push(
      `POWER WORDS: Consider using: ${profile.vocabulary.powerWords.join(', ')}`,
    );
  }

  // CTA style
  if (profile.vocabulary.callToActionStyle) {
    instructions.push(`CTA STYLE: ${profile.vocabulary.callToActionStyle}`);
  }

  return `
BRAND VOICE GUIDELINES:
${instructions.map((i) => `- ${i}`).join('\n')}
`;
}
