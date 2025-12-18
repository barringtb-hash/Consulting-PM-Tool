/**
 * SEO Analysis Panel Component
 *
 * Displays SEO score breakdown and keyword suggestions for product descriptions
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { http } from '../../api/http';
import { Button, Card, Badge } from '../../ui';
import {
  Search,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

interface SEOScore {
  overall: number;
  titleScore: number;
  descriptionScore: number;
  bulletPointsScore: number;
  keywordScore: number;
  metaTagsScore: number;
  label: string;
  suggestions: string[];
  keywordDensity: Record<string, number>;
}

interface KeywordSuggestion {
  keyword: string;
  type: string;
  relevance: number;
}

interface SEOPanelProps {
  descriptionId?: number;
  productId?: number;
  productName: string;
  category?: string;
  marketplace: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  keywords: string[];
  metaTitle?: string;
  metaDescription?: string;
  onKeywordsUpdate?: (keywords: string[]) => void;
}

export function SEOPanel({
  descriptionId,
  productId,
  productName,
  category,
  marketplace,
  title,
  shortDescription,
  longDescription,
  bulletPoints,
  keywords,
  metaTitle,
  metaDescription,
  onKeywordsUpdate,
}: SEOPanelProps) {
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
  const [keywordSuggestions, setKeywordSuggestions] = useState<
    KeywordSuggestion[]
  >([]);

  // Analyze SEO mutation
  const analyzeSecoMutation = useMutation({
    mutationFn: async () => {
      if (descriptionId) {
        const res = await http.post(
          `/api/product-descriptions/descriptions/${descriptionId}/seo-score`,
        );
        return res.json();
      } else {
        const res = await http.post('/api/product-descriptions/seo-analyze', {
          title,
          shortDescription,
          longDescription,
          bulletPoints,
          keywords,
          metaTitle,
          metaDescription,
          marketplace,
          category,
          productName,
        });
        return res.json();
      }
    },
    onSuccess: (data) => {
      setSeoScore(data);
    },
  });

  // Get keyword suggestions mutation
  const keywordsMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Product ID required for suggestions');
      const res = await http.get(
        `/api/product-descriptions/products/${productId}/keyword-suggestions?marketplace=${marketplace}&existing=${keywords.join(',')}`,
      );
      return res.json();
    },
    onSuccess: (data) => {
      setKeywordSuggestions(data.suggestions || []);
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'success' as const, label: 'Excellent' };
    if (score >= 60) return { variant: 'warning' as const, label: 'Good' };
    if (score >= 40) return { variant: 'default' as const, label: 'Average' };
    return { variant: 'danger' as const, label: 'Poor' };
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60)
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const addKeyword = (keyword: string) => {
    if (!keywords.includes(keyword)) {
      onKeywordsUpdate?.([...keywords, keyword]);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO Analysis
          </h3>
          <Button
            size="sm"
            onClick={() => analyzeSecoMutation.mutate()}
            disabled={analyzeSecoMutation.isPending}
          >
            {analyzeSecoMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Analyze SEO
          </Button>
        </div>

        {seoScore && (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Overall SEO Score</p>
                <p
                  className={`text-3xl font-bold ${getScoreColor(seoScore.overall)}`}
                >
                  {seoScore.overall}
                </p>
              </div>
              <Badge variant={getScoreBadge(seoScore.overall).variant}>
                {seoScore.label}
              </Badge>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Title', score: seoScore.titleScore },
                { label: 'Description', score: seoScore.descriptionScore },
                { label: 'Bullets', score: seoScore.bulletPointsScore },
                { label: 'Keywords', score: seoScore.keywordScore },
                { label: 'Meta Tags', score: seoScore.metaTagsScore },
              ].map((item) => (
                <div
                  key={item.label}
                  className="text-center p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center justify-center gap-1">
                    {getScoreIcon(item.score)}
                    <span
                      className={`text-lg font-semibold ${getScoreColor(item.score)}`}
                    >
                      {item.score}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {seoScore.suggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">
                  Improvement Suggestions
                </h4>
                <ul className="space-y-1">
                  {seoScore.suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Keyword Density */}
            {Object.keys(seoScore.keywordDensity).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Keyword Density</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(seoScore.keywordDensity)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([keyword, density]) => (
                      <Badge key={keyword} variant="default">
                        {keyword}: {density.toFixed(1)}%
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Keyword Suggestions */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Keyword Suggestions
          </h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => keywordsMutation.mutate()}
            disabled={keywordsMutation.isPending || !productId}
          >
            {keywordsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Get Suggestions
          </Button>
        </div>

        {/* Current Keywords */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-500 mb-2">
            Current Keywords
          </p>
          <div className="flex flex-wrap gap-2">
            {keywords.length === 0 ? (
              <p className="text-sm text-gray-400">No keywords added yet</p>
            ) : (
              keywords.map((kw, index) => (
                <Badge key={index} variant="default">
                  {kw}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Suggested Keywords */}
        {keywordSuggestions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">
              Suggested Keywords
            </p>
            <div className="flex flex-wrap gap-2">
              {keywordSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => addKeyword(suggestion.keyword)}
                  disabled={keywords.includes(suggestion.keyword)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full border transition-colors ${
                    keywords.includes(suggestion.keyword)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <span>{suggestion.keyword}</span>
                  <span className="text-xs text-gray-400">
                    ({suggestion.type})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SEOPanel;
