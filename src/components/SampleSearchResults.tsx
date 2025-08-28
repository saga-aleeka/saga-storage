import React, { useMemo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TestTube, MapPin, Calendar as CalendarIcon, ArrowRight, AlertCircle } from 'lucide-react';
import type { PlasmaSample } from '../types/plasma';

interface SampleWithContainer extends PlasmaSample {
  containerId: string;
  containerName: string;
  containerLocation: string;
}

interface SampleSearchResultsProps {
  samples: SampleWithContainer[];
  searchQuery: string;
  onNavigateToSample: (containerId: string, sampleId: string) => void;
  onCheckoutSample?: (sampleId: string, containerId: string) => void;
}

/* -------------------- helpers -------------------- */

const parseSearchTerms = (q: string) =>
  q
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  // Compare days, not ms (avoid TZ surprises)
  const utc = (dt: Date) => Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffMs = utc(now) - utc(d);
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function highlight(text: string, terms: string[]) {
  if (!terms.length) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        className="rounded px-0.5 py-0.5 bg-yellow-100 text-yellow-900"
        aria-label="highlighted"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* -------------------- component -------------------- */

export function SampleSearchResults({ samples, searchQuery, onNavigateToSample, onCheckoutSample }: SampleSearchResultsProps) {
  const searchTerms = useMemo(() => parseSearchTerms(searchQuery), [searchQuery]);
  const isMultipleTerms = searchTerms.length > 1;

  if (samples.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground">
          <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
          {searchQuery ? (
            <>
              <h3 className="mb-2">No samples found</h3>
              <p className="text-sm">
                No samples match your search for{' '}
                {isMultipleTerms ? (
                  <>
                    <strong>{searchTerms.length} terms</strong>:{' '}
                    {searchTerms.map((term, index) => (
                      <span key={term}>
                        <strong>"{term}"</strong>
                        {index < searchTerms.length - 1 && (index === searchTerms.length - 2 ? ' or ' : ', ')}
                      </span>
                    ))}
                  </>
                ) : (
                  <strong>"{searchQuery}"</strong>
                )}
              </p>
              <p className="text-sm mt-2">
                Try searching by sample ID, container name, or location
                {isMultipleTerms && ', or separate multiple terms with commas'}
              </p>
            </>
          ) : (
            <>
              <h3 className="mb-2">Search for samples</h3>
              <p className="text-sm">Enter a sample ID, container name, or location to find samples</p>
              <p className="text-xs mt-1">Tip: Use commas to search for multiple samples at once</p>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>
          Search Results
          <span className="text-muted-foreground ml-2">
            ({samples.length} samples found{isMultipleTerms ? ` for ${searchTerms.length} search terms` : ''})
          </span>
        </h3>
        {isMultipleTerms && (
          <div className="text-sm text-muted-foreground" aria-label="active search terms">
            Searching:{' '}
            {searchTerms.map((term) => (
              <span key={term} className="bg-muted px-2 py-1 rounded mr-1">
                {term}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {samples.map((sample, index) => {
          const sinceStored = daysSince(sample.storageDate);
          const sinceAccess = daysSince(sample.lastAccessed);

          // find a matched term for the badge (if multi-term)
          const matchedTerm =
            isMultipleTerms &&
            searchTerms.find((t) => {
              const q = t.toLowerCase();
              return (
                sample.sampleId.toLowerCase().includes(q) ||
                sample.position.toLowerCase().includes(q) ||
                sample.containerName.toLowerCase().includes(q) ||
                sample.containerLocation.toLowerCase().includes(q) ||
                sample.containerId.toLowerCase().includes(q)
              );
            });

          return (
            <Card
              key={`${sample.containerId}::${sample.sampleId}::${sample.position}::${index}`}
              className="p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <TestTube className="w-5 h-5 text-blue-600" aria-hidden />
                      <div>
                        <h4 className="font-medium">
                          {highlight(sample.sampleId, searchTerms)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Position {highlight(sample.position, searchTerms)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {matchedTerm && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                          aria-label={`matched term ${matchedTerm}`}
                        >
                          Matched: "{matchedTerm}"
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Container info */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden />
                      <span className="font-medium">{highlight(sample.containerName, searchTerms)}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {highlight(sample.containerLocation, searchTerms)}
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" aria-hidden />
                      <span>
                        Stored{' '}
                        {sinceStored === 0
                          ? 'today'
                          : typeof sinceStored === 'number'
                          ? `${sinceStored} day${sinceStored === 1 ? '' : 's'} ago`
                          : '—'}
                      </span>
                      <span>({sample.storageDate})</span>
                    </div>

                    {sample.lastAccessed && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span>
                            Last accessed{' '}
                            {sinceAccess === 0
                              ? 'today'
                              : typeof sinceAccess === 'number'
                              ? `${sinceAccess} day${sinceAccess === 1 ? '' : 's'} ago`
                              : '—'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status indicators */}
                  <div className="flex items-center gap-2">
                    {typeof sinceStored === 'number' && sinceStored > 90 && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" aria-hidden />
                        Long-term storage ({sinceStored} days)
                      </Badge>
                    )}
                    {typeof sinceAccess === 'number' && sinceAccess < 7 && sample.lastAccessed && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        Recently accessed
                      </Badge>
                    )}
                    {!sample.lastAccessed && (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        Never accessed
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs text-blue-600">
                      {(sample.history?.length ?? 0)} history entries
                    </Badge>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => onNavigateToSample(sample.containerId, sample.sampleId)}
                    className="flex items-center gap-2"
                    aria-label={`View sample ${sample.sampleId}`}
                  >
                    View Sample
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </Button>
                  {onCheckoutSample && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onCheckoutSample(sample.sampleId, sample.containerId)}
                      className="flex items-center gap-2"
                      aria-label={`Checkout sample ${sample.sampleId}`}
                      disabled={sample.containerId === 'CHECKOUT'}
                    >
                      <TestTube className="w-4 h-4" />
                      {sample.containerId === 'CHECKOUT' ? 'Already Checked Out' : 'Checkout'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
