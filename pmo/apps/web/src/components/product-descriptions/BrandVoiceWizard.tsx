/**
 * Brand Voice Training Wizard Component
 *
 * A step-by-step wizard for training brand voice from sample descriptions
 */

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { http } from '../../api/http';
import { Button, Card, Badge, Input, Modal } from '../../ui';
import {
  Wand2,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface BrandVoiceProfile {
  toneMarkers: string[];
  preferredPhrases: string[];
  prohibitedWords: string[];
  styleRules: {
    sentenceLength: string;
    usePunctuation: string;
    useEmoji: boolean;
    formalityLevel: string;
    useFirstPerson: boolean;
    useSecondPerson: boolean;
    technicalLevel: string;
  };
  vocabulary: {
    powerWords: string[];
    avoidWords: string[];
    industryTerms: string[];
    callToActionStyle: string;
  };
}

interface BrandVoiceWizardProps {
  configId: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (profile: BrandVoiceProfile) => void;
}

type WizardStep = 'samples' | 'guidelines' | 'review' | 'complete';

export function BrandVoiceWizard({
  configId,
  isOpen,
  onClose,
  onComplete,
}: BrandVoiceWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('samples');
  const [sampleDescriptions, setSampleDescriptions] = useState<string[]>([
    '',
    '',
  ]);
  const [newSample, setNewSample] = useState('');
  const [guidelines, setGuidelines] = useState({
    tone: '',
    prohibitedWords: [] as string[],
    preferredPhrases: [] as string[],
    formalityLevel: 'neutral' as
      | 'casual'
      | 'neutral'
      | 'formal'
      | 'professional',
    additionalInstructions: '',
  });
  const [newProhibited, setNewProhibited] = useState('');
  const [newPreferred, setNewPreferred] = useState('');
  const [trainedProfile, setTrainedProfile] =
    useState<BrandVoiceProfile | null>(null);

  // Fetch existing profile (for potential pre-population)
  const { data: _existingProfile } = useQuery({
    queryKey: ['brand-voice', configId],
    queryFn: async () => {
      const res = await http.get(
        `/api/product-descriptions/${configId}/brand-voice`,
      );
      return res.json() as Promise<{ profile: BrandVoiceProfile | null }>;
    },
    enabled: !!configId && isOpen,
  });

  // Train brand voice mutation
  const trainMutation = useMutation({
    mutationFn: async () => {
      const validSamples = sampleDescriptions.filter(
        (s) => s.trim().length >= 10,
      );
      const res = await http.post(
        `/api/product-descriptions/${configId}/brand-voice/train`,
        {
          sampleDescriptions: validSamples,
          manualGuidelines: {
            tone: guidelines.tone || undefined,
            prohibitedWords:
              guidelines.prohibitedWords.length > 0
                ? guidelines.prohibitedWords
                : undefined,
            preferredPhrases:
              guidelines.preferredPhrases.length > 0
                ? guidelines.preferredPhrases
                : undefined,
            formalityLevel: guidelines.formalityLevel,
            additionalInstructions:
              guidelines.additionalInstructions || undefined,
          },
        },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.profile) {
        setTrainedProfile(data.profile);
        setCurrentStep('complete');
        onComplete?.(data.profile);
      }
    },
  });

  const addSample = () => {
    if (newSample.trim().length >= 10) {
      setSampleDescriptions([...sampleDescriptions, newSample.trim()]);
      setNewSample('');
    }
  };

  const removeSample = (index: number) => {
    setSampleDescriptions(sampleDescriptions.filter((_, i) => i !== index));
  };

  const updateSample = (index: number, value: string) => {
    const updated = [...sampleDescriptions];
    updated[index] = value;
    setSampleDescriptions(updated);
  };

  const addProhibitedWord = () => {
    if (newProhibited && !guidelines.prohibitedWords.includes(newProhibited)) {
      setGuidelines({
        ...guidelines,
        prohibitedWords: [...guidelines.prohibitedWords, newProhibited],
      });
      setNewProhibited('');
    }
  };

  const addPreferredPhrase = () => {
    if (newPreferred && !guidelines.preferredPhrases.includes(newPreferred)) {
      setGuidelines({
        ...guidelines,
        preferredPhrases: [...guidelines.preferredPhrases, newPreferred],
      });
      setNewPreferred('');
    }
  };

  const canProceed = () => {
    if (currentStep === 'samples') {
      const validSamples = sampleDescriptions.filter(
        (s) => s.trim().length >= 10,
      );
      return validSamples.length >= 2;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'samples') setCurrentStep('guidelines');
    else if (currentStep === 'guidelines') setCurrentStep('review');
    else if (currentStep === 'review') trainMutation.mutate();
  };

  const handleBack = () => {
    if (currentStep === 'guidelines') setCurrentStep('samples');
    else if (currentStep === 'review') setCurrentStep('guidelines');
  };

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'samples', label: 'Sample Descriptions' },
    { key: 'guidelines', label: 'Brand Guidelines' },
    { key: 'review', label: 'Review & Train' },
    { key: 'complete', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Brand Voice Training Wizard"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-sm hidden sm:block ${
                    index === currentStepIndex ? 'font-medium' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 'samples' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Add Sample Descriptions
              </h4>
              <p className="text-sm text-blue-600 mt-1">
                Paste 2-20 sample product descriptions that represent your brand
                voice. The AI will analyze these to learn your writing style.
              </p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sampleDescriptions.map((sample, index) => (
                <div key={index} className="relative">
                  <textarea
                    value={sample}
                    onChange={(e) => updateSample(index, e.target.value)}
                    placeholder={`Sample description ${index + 1} (min 10 characters)`}
                    className="w-full p-3 border rounded-lg text-sm min-h-[80px]"
                  />
                  {sampleDescriptions.length > 2 && (
                    <button
                      onClick={() => removeSample(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {sample.trim().length > 0 && sample.trim().length < 10 && (
                    <p className="text-xs text-red-500 mt-1">
                      Needs at least 10 characters
                    </p>
                  )}
                </div>
              ))}
            </div>

            {sampleDescriptions.length < 20 && (
              <div className="flex gap-2">
                <Input
                  value={newSample}
                  onChange={(e) => setNewSample(e.target.value)}
                  placeholder="Add another sample description..."
                  className="flex-1"
                />
                <Button
                  onClick={addSample}
                  disabled={newSample.trim().length < 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="text-sm text-gray-500">
              {sampleDescriptions.filter((s) => s.trim().length >= 10).length}{' '}
              of {sampleDescriptions.length} samples are valid (need at least 2)
            </p>
          </div>
        )}

        {currentStep === 'guidelines' && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Define Brand Guidelines
              </h4>
              <p className="text-sm text-purple-600 mt-1">
                Optional: Add specific guidelines to fine-tune the brand voice.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tone Description
              </label>
              <Input
                value={guidelines.tone}
                onChange={(e) =>
                  setGuidelines({ ...guidelines, tone: e.target.value })
                }
                placeholder="e.g., Friendly and approachable, yet professional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Formality Level
              </label>
              <select
                value={guidelines.formalityLevel}
                onChange={(e) =>
                  setGuidelines({
                    ...guidelines,
                    formalityLevel: e.target
                      .value as typeof guidelines.formalityLevel,
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="casual">Casual</option>
                <option value="neutral">Neutral</option>
                <option value="formal">Formal</option>
                <option value="professional">Professional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Prohibited Words
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newProhibited}
                  onChange={(e) => setNewProhibited(e.target.value)}
                  placeholder="Word to avoid..."
                  onKeyDown={(e) => e.key === 'Enter' && addProhibitedWord()}
                />
                <Button onClick={addProhibitedWord} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {guidelines.prohibitedWords.map((word, index) => (
                  <Badge key={index} variant="danger">
                    {word}
                    <button
                      onClick={() =>
                        setGuidelines({
                          ...guidelines,
                          prohibitedWords: guidelines.prohibitedWords.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                      className="ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Preferred Phrases
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newPreferred}
                  onChange={(e) => setNewPreferred(e.target.value)}
                  placeholder="Phrase to include..."
                  onKeyDown={(e) => e.key === 'Enter' && addPreferredPhrase()}
                />
                <Button onClick={addPreferredPhrase} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {guidelines.preferredPhrases.map((phrase, index) => (
                  <Badge key={index} variant="success">
                    {phrase}
                    <button
                      onClick={() =>
                        setGuidelines({
                          ...guidelines,
                          preferredPhrases: guidelines.preferredPhrases.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                      className="ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Additional Instructions
              </label>
              <textarea
                value={guidelines.additionalInstructions}
                onChange={(e) =>
                  setGuidelines({
                    ...guidelines,
                    additionalInstructions: e.target.value,
                  })
                }
                placeholder="Any other guidelines for the AI..."
                className="w-full p-3 border rounded-lg text-sm min-h-[80px]"
              />
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Ready to Train
              </h4>
              <p className="text-sm text-green-600 mt-1">
                Review your inputs and click Train to generate your brand voice
                profile.
              </p>
            </div>

            <Card className="p-4">
              <h5 className="font-medium mb-2">Sample Descriptions</h5>
              <p className="text-sm text-gray-500">
                {sampleDescriptions.filter((s) => s.trim().length >= 10).length}{' '}
                samples provided
              </p>
            </Card>

            <Card className="p-4">
              <h5 className="font-medium mb-2">Guidelines</h5>
              <div className="text-sm space-y-1">
                {guidelines.tone && (
                  <p>
                    <span className="text-gray-500">Tone:</span>{' '}
                    {guidelines.tone}
                  </p>
                )}
                <p>
                  <span className="text-gray-500">Formality:</span>{' '}
                  {guidelines.formalityLevel}
                </p>
                {guidelines.prohibitedWords.length > 0 && (
                  <p>
                    <span className="text-gray-500">Prohibited words:</span>{' '}
                    {guidelines.prohibitedWords.length}
                  </p>
                )}
                {guidelines.preferredPhrases.length > 0 && (
                  <p>
                    <span className="text-gray-500">Preferred phrases:</span>{' '}
                    {guidelines.preferredPhrases.length}
                  </p>
                )}
              </div>
            </Card>

            {trainMutation.isError && (
              <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Training failed. Please try again.
                </span>
              </div>
            )}
          </div>
        )}

        {currentStep === 'complete' && trainedProfile && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium text-green-800">
                Brand Voice Profile Created!
              </h4>
              <p className="text-sm text-green-600 mt-1">
                Your brand voice has been analyzed and saved.
              </p>
            </div>

            <Card className="p-4">
              <h5 className="font-medium mb-3">Detected Style</h5>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Formality:</span>
                  <br />
                  <Badge variant="default">
                    {trainedProfile.styleRules.formalityLevel}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Technical Level:</span>
                  <br />
                  <Badge variant="default">
                    {trainedProfile.styleRules.technicalLevel}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Sentence Length:</span>
                  <br />
                  <Badge variant="default">
                    {trainedProfile.styleRules.sentenceLength}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Punctuation:</span>
                  <br />
                  <Badge variant="default">
                    {trainedProfile.styleRules.usePunctuation}
                  </Badge>
                </div>
              </div>
            </Card>

            {trainedProfile.toneMarkers.length > 0 && (
              <Card className="p-4">
                <h5 className="font-medium mb-2">Detected Tone Markers</h5>
                <div className="flex flex-wrap gap-1">
                  {trainedProfile.toneMarkers.map((marker, index) => (
                    <Badge key={index} variant="default">
                      {marker}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="secondary"
            onClick={currentStep === 'samples' ? onClose : handleBack}
            disabled={trainMutation.isPending}
          >
            {currentStep === 'samples' ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </Button>

          {currentStep === 'complete' ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || trainMutation.isPending}
            >
              {trainMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : currentStep === 'review' ? (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Train Brand Voice
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default BrandVoiceWizard;
