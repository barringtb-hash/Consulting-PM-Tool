/**
 * Image Analysis Panel Component
 *
 * Provides image-to-text analysis using GPT-4 Vision
 * - Analyze product images to extract attributes
 * - Generate descriptions directly from images
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { http } from '../../api/http';
import { Button, Card, Badge, Input, Modal } from '../../ui';
import {
  Image as ImageIcon,
  Wand2,
  Eye,
  Palette,
  Package,
  Tag,
  RefreshCw,
  Plus,
  X,
  Check,
} from 'lucide-react';

interface ImageAnalysis {
  productType: string;
  suggestedCategory: string;
  suggestedSubcategory?: string;
  colors: Array<{ name: string; hex?: string; dominance: string }>;
  materials: string[];
  sizeIndicators: string[];
  features: Array<{ name: string; description: string; confidence: number }>;
  qualityLevel: string;
  style: string[];
  targetAudience: string[];
  condition: string;
  detectedBrand?: string;
  visibleText: string[];
  confidence: number;
  suggestedTitle: string;
  suggestedShortDescription: string;
  suggestedBulletPoints: string[];
  suggestedKeywords: string[];
  extractedAttributes: Record<string, string>;
}

interface GeneratedDescription {
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  extractedAttributes: Record<string, string>;
}

interface ImageAnalysisPanelProps {
  marketplace: string;
  onDescriptionGenerated?: (description: GeneratedDescription) => void;
  onAttributesExtracted?: (attributes: Record<string, string>) => void;
}

export function ImageAnalysisPanel({
  marketplace,
  onDescriptionGenerated,
  onAttributesExtracted,
}: ImageAnalysisPanelProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [generatedDesc, setGeneratedDesc] =
    useState<GeneratedDescription | null>(null);
  const [tone, setTone] = useState('professional');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Analyze single image
  const analyzeImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await http.post('/api/product-descriptions/analyze-image', {
        imageUrl,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        if (data.analysis.extractedAttributes) {
          onAttributesExtracted?.(data.analysis.extractedAttributes);
        }
      }
    },
  });

  // Analyze multiple images
  const analyzeMultipleMutation = useMutation({
    mutationFn: async () => {
      const res = await http.post(
        '/api/product-descriptions/analyze-multiple-images',
        {
          imageUrls,
        },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (data.aggregatedAnalysis) {
        setAnalysis(data.aggregatedAnalysis);
        if (data.aggregatedAnalysis.extractedAttributes) {
          onAttributesExtracted?.(data.aggregatedAnalysis.extractedAttributes);
        }
      }
    },
  });

  // Generate description from image
  const generateFromImageMutation = useMutation({
    mutationFn: async () => {
      const res = await http.post(
        '/api/product-descriptions/generate-from-image',
        {
          imageUrl: imageUrls[0],
          marketplace,
          tone,
        },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.description) {
        setGeneratedDesc(data.description);
        setShowPreviewModal(true);
      }
    },
  });

  const addImageUrl = () => {
    if (newImageUrl && !imageUrls.includes(newImageUrl)) {
      setImageUrls([...imageUrls, newImageUrl]);
      setNewImageUrl('');
    }
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (imageUrls.length === 1) {
      analyzeImageMutation.mutate(imageUrls[0]);
    } else if (imageUrls.length > 1) {
      analyzeMultipleMutation.mutate();
    }
  };

  const applyGenerated = () => {
    if (generatedDesc) {
      onDescriptionGenerated?.(generatedDesc);
      setShowPreviewModal(false);
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'premium':
        return <Badge variant="success">Premium</Badge>;
      case 'standard':
        return <Badge variant="default">Standard</Badge>;
      case 'budget':
        return <Badge variant="warning">Budget</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  const isLoading =
    analyzeImageMutation.isPending ||
    analyzeMultipleMutation.isPending ||
    generateFromImageMutation.isPending;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image Analysis
          </h3>
          <div className="text-sm text-gray-500">Powered by GPT-4 Vision</div>
        </div>

        {/* Image URL Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Enter image URL (https://...)"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addImageUrl} disabled={!newImageUrl}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Preview */}
          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-24 h-24 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23eee" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23999">Error</text></svg>';
                    }}
                  />
                  <button
                    onClick={() => removeImageUrl(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={imageUrls.length === 0 || isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Analyze Image{imageUrls.length > 1 ? 's' : ''}
            </Button>
            <Button
              variant="secondary"
              onClick={() => generateFromImageMutation.mutate()}
              disabled={imageUrls.length === 0 || isLoading}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Description
            </Button>
          </div>

          {/* Tone Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Tone:</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="playful">Playful</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Analysis Results
            <span className="text-sm font-normal text-gray-500">
              ({analysis.confidence}% confidence)
            </span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Type & Category */}
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Product Type</p>
                <p className="font-medium">{analysis.productType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Suggested Category</p>
                <p className="font-medium">
                  {analysis.suggestedCategory}
                  {analysis.suggestedSubcategory &&
                    ` > ${analysis.suggestedSubcategory}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quality Level</p>
                {getQualityBadge(analysis.qualityLevel)}
              </div>
              {analysis.detectedBrand && (
                <div>
                  <p className="text-sm text-gray-500">Detected Brand</p>
                  <p className="font-medium">{analysis.detectedBrand}</p>
                </div>
              )}
            </div>

            {/* Colors */}
            <div>
              <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                <Palette className="h-4 w-4" />
                Colors
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded"
                  >
                    {color.hex && (
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: color.hex }}
                      />
                    )}
                    <span className="text-sm">{color.name}</span>
                    <span className="text-xs text-gray-400">
                      ({color.dominance})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Materials & Features */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.materials.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Materials</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.materials.map((material, index) => (
                    <Badge key={index} variant="default">
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.style.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Style</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.style.map((s, index) => (
                    <Badge key={index} variant="default">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          {analysis.features.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Key Features</p>
              <div className="space-y-2">
                {analysis.features.slice(0, 5).map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <span className="font-medium text-sm">
                        {feature.name}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {feature.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Keywords */}
          {analysis.suggestedKeywords.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Suggested Keywords
              </p>
              <div className="flex flex-wrap gap-1">
                {analysis.suggestedKeywords.map((keyword, index) => (
                  <Badge key={index} variant="success">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Title & Description */}
          {analysis.suggestedTitle && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm font-medium text-blue-800 mb-1">
                Suggested Title
              </p>
              <p className="text-sm">{analysis.suggestedTitle}</p>
              {analysis.suggestedShortDescription && (
                <>
                  <p className="text-sm font-medium text-blue-800 mt-2 mb-1">
                    Suggested Short Description
                  </p>
                  <p className="text-sm">
                    {analysis.suggestedShortDescription}
                  </p>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Generated Description Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Generated Description Preview"
      >
        {generatedDesc && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Title</p>
              <p className="mt-1">{generatedDesc.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Short Description
              </p>
              <p className="mt-1 text-sm">{generatedDesc.shortDescription}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Long Description
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {generatedDesc.longDescription}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Bullet Points</p>
              <ul className="mt-1 list-disc list-inside text-sm">
                {generatedDesc.bulletPoints.map((bp, index) => (
                  <li key={index}>{bp}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Keywords</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {generatedDesc.keywords.map((kw, index) => (
                  <Badge key={index} variant="default">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={applyGenerated}>
                <Check className="h-4 w-4 mr-2" />
                Apply to Description
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ImageAnalysisPanel;
