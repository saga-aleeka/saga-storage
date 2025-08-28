import React, { useMemo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alerts';
import {
  TestTube,
  MapPin,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
} from 'lucide-react';
import type { PlasmaSample } from '../types/plasma';

type SampleWithContainer = PlasmaSample & {
  containerId: string;
  containerName: string;
  containerLocation: string;
};

interface WorklistResultsProps {
  sampleIds: string[];
  samples: SampleWithContainer[];
  duplicateIds?: string[];
  onNavigateToSample: (containerId: string, sampleId: string) => void;
  onClearWorklist: () => void;
  onCheckoutSample?: (sampleId: string, containerId: string) => void;
}

interface WorklistAnalysis {
  found: SampleWithContainer[];
  missing: string[];
  foundByContainer: Record<string, SampleWithContainer[]>;
  totalValidSearched: number;
}

export function WorklistResults({
  sampleIds,
  samples,
  duplicateIds = [],
  onNavigateToSample,
  onClearWorklist,
  onCheckoutSample,
}: WorklistResultsProps) {
  const analysis = useMemo<WorklistAnalysis>(() => {
    // Filter out "See Form" from inputs and results
    const validSearchedIds = (sampleIds || []).filter(
      (id) => id && !id.toLowerCase().includes('see form')
    );

    const found = (samples || []).filter(
      (s) => s.sampleId && validSearchedIds.includes(s.sampleId) && !s.sampleId.toLowerCase().includes('see form')
    );

    const foundIds = new Set(found.map((s) => s.sampleId));
    const missing = validSearchedIds.filter((id) => !foundIds.has(id));

    const foundByContainer: Record<string, SampleWithContainer[]> = {};
    for (const s of found) {
      if (!foundByContainer[s.containerId]) foundByContainer[s.containerId] = [];
      foundByContainer[s.containerId].push(s);
    }

    return {
      found,
      missing,
      foundByContainer,
      totalValidSearched: validSearchedIds.length,
    };
  }, [sampleIds, samples]);

  const exportResults = () => {
    const csvRows: string[] = [];
    csvRows.push(['Sample_ID', 'Container_ID', 'Container_Name', 'Position'].join(','));

    // Found
    analysis.found.forEach((s) => {
      csvRows.push([s.sampleId, s.containerId, s.containerName, s.position].join(','));
    });

    // Missing
    analysis.missing.forEach((id) => {
      csvRows.push([id, 'NOT_FOUND', '', ''].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worklist_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!sampleIds || sampleIds.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <TestTube className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-medium">{analysis.totalValidSearched}</p>
              <p className="text-sm text-muted-foreground">Total Searched</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-medium text-green-600">{analysis.found.length}</p>
              <p className="text-sm text-muted-foreground">Found</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-medium text-red-600">{analysis.missing.length}</p>
              <p className="text-sm text-muted-foreground">Missing</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Alert */}
      <Alert className={analysis.missing.length === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
        {analysis.missing.length === 0 ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        )}
        <AlertDescription className={analysis.missing.length === 0 ? 'text-green-800' : 'text-orange-800'}>
          {analysis.missing.length === 0 ? (
            <>
              <strong>All samples found!</strong>
              {duplicateIds.length > 0 && <> ({duplicateIds.length} duplicates in worklist)</>}
            </>
          ) : (
            <>
              <strong>{analysis.missing.length} samples not found</strong>. They may be checked out, in different containers, or have different IDs.
              {duplicateIds.length > 0 && <> ({duplicateIds.length} duplicates in worklist)</>}
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onCheckoutSample && analysis.found.length > 0 && (
          <Button 
            onClick={() => {
              if (window.confirm(`Checkout all ${analysis.found.length} found samples?`)) {
                analysis.found.forEach(sample => {
                  onCheckoutSample(sample.sampleId, sample.containerId);
                });
              }
            }}
            variant="secondary" 
            size="sm" 
            className="flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            Checkout All Found
          </Button>
        )}
        <Button onClick={exportResults} variant="outline" size="sm" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Results
        </Button>
        <Button onClick={onClearWorklist} variant="outline" size="sm" className="flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          Clear Worklist
        </Button>
      </div>

      {/* Containers to Pull */}
      {Object.keys(analysis.foundByContainer).length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4">Containers to Pull</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(analysis.foundByContainer).map(([containerId, items]) => {
              const { containerName } = items[0];
              return (
                <div key={containerId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{containerName}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {containerId}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {items.length}
                  </Badge>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Pull these {Object.keys(analysis.foundByContainer).length} containers from storage to access your samples.
          </div>
        </Card>
      )}

      {/* Found by Container */}
      {Object.keys(analysis.foundByContainer).length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4">Found Samples by Container</h3>
          <div className="space-y-4">
            {Object.entries(analysis.foundByContainer).map(([containerId, items]) => {
              const { containerName, containerLocation } = items[0];
              return (
                <div key={containerId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{containerName}</span>
                        <Badge variant="outline" className="text-xs">
                          {containerId}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="secondary">{items.length} samples</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3">
                    {containerLocation}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((s, idx) => {
                      const daysSinceStorage =
                        Math.floor((Date.now() - new Date(s.storageDate).getTime()) / (1000 * 60 * 60 * 24)) || 0;

                      return (
                        <div key={`${s.sampleId}-${idx}`} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div className="flex items-center gap-2">
                            <TestTube className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="font-medium text-sm">{s.sampleId}</p>
                              <p className="text-xs text-muted-foreground">
                                Position {s.position} • {daysSinceStorage}d ago
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onNavigateToSample(s.containerId, s.sampleId)}
                            className="h-6 w-6 p-0"
                            aria-label={`View sample ${s.sampleId}`}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                          {onCheckoutSample && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onCheckoutSample(s.sampleId, s.containerId)}
                              className="h-6 w-6 p-0 text-blue-600"
                              aria-label={`Checkout sample ${s.sampleId}`}
                            >
                              <TestTube className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Missing Samples */}
      {analysis.missing.length > 0 && (
        <Card className="p-6">
          <h3 className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-red-600" />
            Missing Samples ({analysis.missing.length})
          </h3>
          <ScrollArea className="h-32">
            <div className="flex flex-wrap gap-2">
              {analysis.missing.map((id, idx) => (
                <Badge key={`${id}-${idx}`} variant="destructive" className="text-xs">
                  {id}
                </Badge>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>These samples were not found in any container. They may be:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Currently checked out of storage</li>
              <li>Stored in containers not in the system</li>
              <li>Labeled with different sample IDs</li>
              <li>Not yet processed or stored</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
