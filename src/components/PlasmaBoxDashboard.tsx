import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Grid3X3, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Download,
  Upload,
  RefreshCw,
  MapPin,
  Clock,
  TestTube,
  AlertTriangle,
  Scan,
  Eye,
  X,
  Thermometer,
  ArrowLeft
} from 'lucide-react';
import { getGridDimensions } from './PlasmaContainerList';
import { getSampleTypeColor } from './PlasmaContainerList';
import type { PlasmaContainer } from './PlasmaContainerList';
import type { PlasmaSample } from '../types/plasma';
import { toast } from 'sonner';

interface PlasmaBoxDashboardProps {
  container: PlasmaContainer;
  onContainerUpdate?: (container: PlasmaContainer) => void;
  initialSelectedSample?: string | null;
  onSampleSelectionHandled?: () => void;
  highlightSampleIds?: string[];
}

export function PlasmaBoxDashboard({
  container,
  onContainerUpdate,
  initialSelectedSample,
  onSampleSelectionHandled,
  highlightSampleIds = []
}: PlasmaBoxDashboardProps) {
  const [samples, setSamples] = useState<PlasmaSample[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutMode, setCheckoutMode] = useState(false);

  const storageKey = `samples-${container.id}`;
  const dimensions = getGridDimensions(container.containerType, container.sampleType);

  // Load samples on mount
  useEffect(() => {
    loadSamples();
  }, [container.id]);

  // Handle initial sample selection
  useEffect(() => {
    if (initialSelectedSample && onSampleSelectionHandled) {
      const sample = samples.find(s => s.sampleId === initialSelectedSample);
      if (sample) {
        setSelectedPosition(sample.position);
      }
      onSampleSelectionHandled();
    }
  }, [initialSelectedSample, samples, onSampleSelectionHandled]);

  const loadSamples = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        
        // Handle both array format and admin import object format
        if (Array.isArray(data)) {
          setSamples(data);
        } else if (typeof data === 'object') {
          // Convert from admin import format {position: {id, timestamp}} to PlasmaSample format
          const converted: PlasmaSample[] = Object.entries(data).map(([position, sampleData]: [string, any]) => ({
            position,
            sampleId: sampleData.id,
            storageDate: sampleData.timestamp ? sampleData.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
            lastAccessed: sampleData.lastAccessed,
            history: sampleData.history || [{
              timestamp: sampleData.timestamp || new Date().toISOString(),
              action: 'check-in' as const,
              notes: `Initial storage in position ${position}`
            }]
          }));
          setSamples(converted);
          
          // Save in array format for consistency
          localStorage.setItem(storageKey, JSON.stringify(converted));
        }
      }
    } catch (error) {
      console.error('Error loading samples:', error);
    }
  };

  const saveSamples = (newSamples: PlasmaSample[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSamples));
      setSamples(newSamples);
      
      // Update container occupied slots
      if (onContainerUpdate) {
        const updatedContainer = {
          ...container,
          occupiedSlots: newSamples.length,
          lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ')
        };
        onContainerUpdate(updatedContainer);
      }
    } catch (error) {
      console.error('Error saving samples:', error);
      toast.error('Failed to save sample changes');
    }
  };

  // Generate grid positions
  const gridPositions = useMemo(() => {
    const positions: string[] = [];
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, dimensions.rows);
    
    // Fill top to bottom, left to right (A1, B1, C1... I1, A2, B2...)
    for (let col = 1; col <= dimensions.cols; col++) {
      for (let row = 0; row < dimensions.rows; row++) {
        const position = `${rows[row]}${col}`;
        positions.push(position);
      }
    }
    
    return positions;
  }, [dimensions]);

  // Get next available position for auto-selection
  const getNextAvailablePosition = () => {
    const occupiedPositions = new Set(samples.map(s => s.position));
    return gridPositions.find(pos => !occupiedPositions.has(pos) && pos !== 'I9') || null;
  };

  const getSample = (position: string) => samples.find(s => s.position === position);
  
  const isHighlighted = (sampleId: string) => highlightSampleIds.includes(sampleId);

  const selectedSample = selectedPosition ? getSample(selectedPosition) : null;

  const handleScanSubmit = () => {
    if (!scanInput.trim()) return;

    const nextPosition = getNextAvailablePosition();
    if (!nextPosition) {
      toast.error('No available positions in this container');
      return;
    }

    // Check if sample ID already exists
    const existingSample = samples.find(s => s.sampleId === scanInput.trim());
    if (existingSample) {
      toast.error(`Sample ${scanInput.trim()} already exists at position ${existingSample.position}`);
      return;
    }

    const newSample: PlasmaSample = {
      position: nextPosition,
      sampleId: scanInput.trim(),
      storageDate: new Date().toISOString().split('T')[0],
      history: [{
        timestamp: new Date().toISOString(),
        action: 'check-in',
        notes: `Scanned into position ${nextPosition}`
      }]
    };

    const updatedSamples = [...samples, newSample];
    saveSamples(updatedSamples);
    
    // Auto-select the newly added sample
    setSelectedPosition(nextPosition);
    
    // Clear input and find next position for next scan
    setScanInput('');
    
    toast.success(`Sample ${newSample.sampleId} added to position ${nextPosition}`);
  };

  const handleCheckoutSample = (sampleId?: string) => {
    const targetSample = sampleId 
      ? samples.find(s => s.sampleId === sampleId)
      : selectedSample;
      
    if (!targetSample) {
      toast.error('No sample selected for checkout');
      return;
    }

    // Create checkout history entry with full storage context
    const checkoutHistoryEntry = {
      timestamp: new Date().toISOString(),
      action: 'check-out' as const,
      user: 'Current User', // You can pass actual user from props if available
      notes: `Sample checked out from ${container.name} position ${targetSample.position}`,
      fromPosition: targetSample.position
    };

    // Store the complete sample history in a separate checkout storage
    const checkoutSample = {
      ...targetSample,
      lastAccessed: new Date().toISOString().split('T')[0],
      checkoutDate: new Date().toISOString().split('T')[0],
      originalContainer: {
        id: container.id,
        name: container.name,
        location: container.location
      },
      history: [
        ...targetSample.history,
        checkoutHistoryEntry
      ]
    };

    // Save to checkout history storage
    try {
      const checkoutKey = 'checked-out-samples';
      const existingCheckouts = localStorage.getItem(checkoutKey);
      const checkouts = existingCheckouts ? JSON.parse(existingCheckouts) : [];
      
      // Remove any existing checkout record for this sample ID
      const filteredCheckouts = checkouts.filter((c: any) => c.sampleId !== targetSample.sampleId);
      filteredCheckouts.push(checkoutSample);
      
      localStorage.setItem(checkoutKey, JSON.stringify(filteredCheckouts));
    } catch (error) {
      console.error('Error saving checkout history:', error);
    }

    // Remove from container
    const updatedSamples = samples.filter(s => s.sampleId !== targetSample.sampleId);
    saveSamples(updatedSamples);
    
    // Clear selection if this was the selected sample
    if (selectedPosition === targetSample.position) {
      setSelectedPosition(null);
    }
    
    toast.success(`Sample ${targetSample.sampleId} checked out from position ${targetSample.position}`);
  };
  const handlePositionClick = (position: string) => {
    if (checkoutMode) {
      const sample = getSample(position);
      if (sample) {
        handleCheckoutSample(sample.sampleId);
        return;
      }
    }
    setSelectedPosition(position);
  };

  const clearPosition = () => {
    if (selectedPosition && selectedSample) {
      const updatedSamples = samples.filter(s => s.position !== selectedPosition);
      saveSamples(updatedSamples);
      setSelectedPosition(null);
      toast.success(`Sample ${selectedSample.sampleId} removed from position ${selectedPosition}`);
    }
  };

  const clearBox = () => {
    if (window.confirm(`Are you sure you want to clear all samples from ${container.name}?`)) {
      saveSamples([]);
      setSelectedPosition(null);
      toast.success('All samples cleared from container');
    }
  };

  const exportSamples = () => {
    const csvRows = ['Position,Sample_ID,Storage_Date,Last_Accessed'];
    samples.forEach(sample => {
      csvRows.push([
        sample.position,
        sample.sampleId,
        sample.storageDate,
        sample.lastAccessed || ''
      ].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${container.id}_samples_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-blue-500" />
            <div>
              <h1 className="text-xl font-semibold">{container.name}</h1>
              <p className="text-sm text-muted-foreground">{container.location}</p>
            </div>
          </div>
          <Badge className={getSampleTypeColor(container.sampleType)}>
            {container.sampleType}
          </Badge>
          <Badge variant="outline">{container.temperature}</Badge>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Containers
        </Button>
      </div>

    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Mode Toggle and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={!scanMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setScanMode(false);
                setCheckoutMode(false);
              }}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Mode
            </Button>
            <Button
              variant={scanMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setScanMode(true);
                setCheckoutMode(false);
              }}
              className="flex items-center gap-2"
            >
              <Scan className="w-4 h-4" />
              Scan Mode
            </Button>
            <Button
              variant={checkoutMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCheckoutMode(true);
                setScanMode(false);
              }}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              Checkout
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {scanMode && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Scan or enter sample ID"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleScanSubmit();
                    }
                  }}
                  className="w-64"
                  autoFocus
                />
                <Button onClick={handleScanSubmit} disabled={!scanInput.trim()}>
                  Add Sample
                </Button>
              </div>
            )}
            {checkoutMode && (
              <div className="text-sm text-muted-foreground">
                Click on a sample to check it out
              </div>
            )}
            <Button variant="outline" size="sm" onClick={clearBox}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Box
            </Button>
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Box
            </Button>
          </div>
        </div>

        {/* Grid */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                {dimensions.rows}×{dimensions.cols} Storage Grid
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Selected: {selectedPosition || 'None'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <div 
                className="grid gap-1"
                style={{ 
                  gridTemplateColumns: `auto repeat(${dimensions.cols}, 1fr)`,
                  width: 'fit-content'
                }}
              >
                {/* Empty corner cell */}
                <div className="w-8 h-8"></div>
                
                {/* Column headers */}
                {Array.from({ length: dimensions.cols }, (_, i) => (
                  <div key={i} className="w-16 h-8 text-center text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    {i + 1}
                  </div>
                ))}
                
                {/* Grid rows */}
                {Array.from({ length: dimensions.rows }, (_, rowIndex) => {
                  const rowLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[rowIndex];
                  return (
                    <React.Fragment key={rowIndex}>
                      {/* Row header */}
                      <div className="w-8 h-8 text-center text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        {rowLetter}
                      </div>
                      
                      {/* Row cells */}
                      {Array.from({ length: dimensions.cols }, (_, colIndex) => {
                        const position = `${rowLetter}${colIndex + 1}`;
                        const sample = getSample(position);
                        const highlighted = sample && isHighlighted(sample.sampleId);
                        const isMarkedOut = container.sampleType === 'DP Pools' && position === 'I9';
                        
                        if (isMarkedOut) {
                          return (
                            <div
                              key={position}
                              className="w-16 h-8 bg-gray-400 border border-gray-500 flex items-center justify-center text-white text-xs cursor-not-allowed"
                            >
                              <X className="w-3 h-3" />
                            </div>
                          );
                        }
                        
                        return (
                          <button
                            key={position}
                            onClick={() => handlePositionClick(position)}
                            className={`
                              w-16 h-8 border text-xs font-medium
                              transition-all duration-150 hover:scale-105
                              ${checkoutMode && sample ? 'cursor-pointer hover:ring-2 hover:ring-red-500' : ''}
                              ${sample 
                                ? highlighted
                                  ? 'bg-yellow-200 border-yellow-400 text-yellow-900 hover:bg-yellow-300'
                                  : 'bg-blue-500 text-white hover:bg-blue-600 border-blue-600'
                                : 'bg-gray-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 border-gray-300 dark:border-slate-600'
                              }
                              ${selectedPosition === position ? 'ring-2 ring-blue-500' : ''}
                            `}
                            title={
                              checkoutMode && sample 
                                ? `Click to checkout ${sample.sampleId} from ${position}`
                                : sample 
                                ? `${sample.sampleId} (${position})` 
                                : `Empty position ${position}`
                            }
                          >
                            <div className="flex items-center justify-center h-full px-1 truncate">
                              {sample ? (
                                <div className="text-[10px] font-medium truncate w-full text-center">
                                  {sample.sampleId}
                                </div>
                              ) : (
                                <span className="text-[9px] opacity-70">{position}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l bg-white dark:bg-slate-900 p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Sample Details</h3>
            
            {selectedSample ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sample ID</label>
                  <p className="text-lg font-medium">{selectedSample.sampleId}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Position</label>
                  <p className="text-lg font-medium">{selectedSample.position}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Storage Date</label>
                  <p className="text-sm">{selectedSample.storageDate}</p>
                </div>

                {selectedSample.lastAccessed && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Accessed</label>
                    <p className="text-sm">{selectedSample.lastAccessed}</p>
                  </div>
                )}

                {/* Sample History */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Sample History ({selectedSample.history?.length || 0} entries)
                  </label>
                  <ScrollArea className="h-32 mt-2">
                    <div className="space-y-2">
                      {selectedSample.history?.map((entry, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{entry.action.replace('-', ' ')}</span>
                              <span className="text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="text-muted-foreground mt-1">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleCheckoutSample()}
                    className="w-full flex items-center gap-2"
                  >
                    <TestTube className="w-4 h-4" />
                    Checkout Sample
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={clearPosition}
                    className="w-full flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Position
                  </Button>
                </div>
              </div>
            ) : selectedPosition ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Position</label>
                  <p className="text-lg font-medium">{selectedPosition}</p>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  This position is empty. {scanMode ? 'Use the scan input above to add a sample.' : 'Switch to Scan Mode to add samples.'}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a position to view sample details</p>
                {checkoutMode && (
                  <p className="text-sm mt-2">Click on any sample to check it out</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}