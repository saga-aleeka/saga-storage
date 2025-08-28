import React, { useMemo, useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Thermometer, ArrowLeft, Plus, Search, Filter, Settings, MoreVertical, TestTube, GraduationCap, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { PlasmaBoxDashboard } from './PlasmaBoxDashboard';
import { CreateContainerDialog } from './CreateContainerDialog';
import { EditContainerDialog } from './EditContainerDialog';
import { SampleSearchResults } from './SampleSearchResults';
import type { PlasmaSample } from '../types/plasma';
import { WorklistUpload } from './WorklistUpload';
import { WorklistResults } from './WorklistResults';
import { Header } from './Header';

export type ContainerType = '9x9-box' | '5x5-box' | '5x4-rack' | '9x9-rack';
export type SampleType = 'DP Pools' | 'cfDNA Tubes' | 'DTC Tubes' | 'MNC Tubes' | 'PA Pool Tubes' | 'Plasma Tubes' | 'BC Tubes';

export interface PlasmaContainer {
  id: string;
  name: string;
  location: string;
  occupiedSlots: number;
  totalSlots: number;
  lastUpdated: string;
  temperature: string;
  containerType: ContainerType;
  sampleType: SampleType;
  isTraining?: boolean;
  isArchived?: boolean; // New field for archival containers
}

export const getGridDimensions = (containerType: ContainerType, sampleType?: SampleType) => {
  switch (containerType) {
    case '9x9-box': 
      // DP Pools come in sets of 4 (A,B,C,D), so effective capacity is 80 instead of 81
      return { rows: 9, cols: 9, total: sampleType === 'DP Pools' ? 80 : 81 };
    case '5x5-box': return { rows: 5, cols: 5, total: 25 };
    case '5x4-rack': return { rows: 5, cols: 4, total: 20 };
    case '9x9-rack': 
      // DP Pools come in sets of 4 (A,B,C,D), so effective capacity is 80 instead of 81
      return { rows: 9, cols: 9, total: sampleType === 'DP Pools' ? 80 : 81 };
    default: return { rows: 5, cols: 5, total: 25 };
  }
};

export const getContainerTypeLabel = (containerType: ContainerType) => {
  switch (containerType) {
    case '9x9-box': return '9×9 Box';
    case '5x5-box': return '5×5 Box';
    case '5x4-rack': return '5×4 Rack';
    case '9x9-rack': return '9×9 Rack';
    default: return 'Unknown';
  }
};

export const getSampleTypeColor = (sampleType: SampleType) => {
  switch (sampleType) {
    case 'DP Pools': return 'bg-green-100 text-green-800 border-green-200';
    case 'cfDNA Tubes': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'DTC Tubes': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'MNC Tubes': return 'bg-red-100 text-red-800 border-red-200';
    case 'PA Pool Tubes': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Plasma Tubes': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'BC Tubes': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const SAMPLE_TYPES: SampleType[] = ['DP Pools', 'cfDNA Tubes', 'DTC Tubes', 'MNC Tubes', 'PA Pool Tubes', 'Plasma Tubes', 'BC Tubes'];

/** Live occupied count from localStorage; falls back to container.occupiedSlots */
const getLiveOccupied = (container: PlasmaContainer) => {
  try {
    const raw = localStorage.getItem(`samples-${container.id}`);
    if (!raw) return container.occupiedSlots;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data.length; // array format
    if (data && typeof data === 'object') return Object.keys(data).length; // admin import object map
    return container.occupiedSlots;
  } catch {
    return container.occupiedSlots;
  }
};

interface PlasmaContainerListProps {
  containers?: PlasmaContainer[];
  onContainersChange?: (containers: PlasmaContainer[]) => void;
}

export function PlasmaContainerList({ containers: propsContainers, onContainersChange: propsOnContainersChange }: PlasmaContainerListProps = {}) {
  const [localContainers, setLocalContainers] = useState<PlasmaContainer[]>([]);
  const STORAGE_KEY = 'plasma-containers';
  
  if (process.env.NODE_ENV !== 'production') {
    // Debug logging (quiet in production)
    // eslint-disable-next-line no-console
    console.log('PlasmaContainerList props:', { 
      propsContainers: propsContainers?.length, 
      propsOnContainersChange: typeof propsOnContainersChange 
    });
  }
  
  // Use props if provided, otherwise use local state
  const containers = propsContainers ?? localContainers;
  const onContainersChange = propsOnContainersChange ?? setLocalContainers;

  // Load containers from localStorage if using local state
  useEffect(() => {
    if (!propsContainers) {
      const savedContainers = localStorage.getItem(STORAGE_KEY);
      if (savedContainers) {
        try {
          const parsedContainers = JSON.parse(savedContainers);
          if (Array.isArray(parsedContainers)) {
            setLocalContainers(parsedContainers);
          }
        } catch (error) {
          console.error('Error loading containers:', error);
        }
      }
    }
  }, [propsContainers]);

  // Auto-save containers if using local state
  useEffect(() => {
    if (!propsContainers && localContainers.length >= 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localContainers));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [localContainers, propsContainers]);

  const [selectedContainer, setSelectedContainer] = useState<PlasmaContainer | null>(null);
  const [selectedSampleForView, setSelectedSampleForView] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [containerToEdit, setContainerToEdit] = useState<PlasmaContainer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sampleSearchQuery, setSampleSearchQuery] = useState('');
  const [selectedSampleType, setSelectedSampleType] = useState<SampleType | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showTrainingOnly, setShowTrainingOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'containers' | 'archive' | 'samples'>('containers');
  const [worklistSampleIds, setWorklistSampleIds] = useState<string[]>([]);
  const [worklistDuplicateIds, setWorklistDuplicateIds] = useState<string[]>([]);
  const [sampleSearchMode, setSampleSearchMode] = useState<'manual' | 'worklist'>('manual');
  const [manualSearchSampleIds, setManualSearchSampleIds] = useState<string[]>([]);

  // Separate active and archived containers
  const activeContainers = useMemo(() => containers.filter(container => !container.isArchived), [containers]);
  const archivedContainers = useMemo(() => containers.filter(container => container.isArchived), [containers]);

  // Get containers to display based on active tab
  const containersToFilter = useMemo(() => {
    return activeTab === 'archive' ? archivedContainers : activeContainers;
  }, [activeTab, activeContainers, archivedContainers]);

  // Filter and search containers
  const filteredContainers = useMemo(() => {
    return containersToFilter.filter(container => {
      const matchesSearch = searchQuery === '' || 
        container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSampleType = selectedSampleType === null || 
        container.sampleType === selectedSampleType;
      
      // Calculate effective total slots dynamically based on sample type
      const effectiveTotalSlots = getGridDimensions(container.containerType, container.sampleType).total;
      const hasAvailableSlots = !showAvailableOnly || 
        container.occupiedSlots < effectiveTotalSlots;

      const matchesTraining = !showTrainingOnly || container.isTraining === true;
      
      return matchesSearch && matchesSampleType && hasAvailableSlots && matchesTraining;
    });
  }, [containersToFilter, searchQuery, selectedSampleType, showAvailableOnly, showTrainingOnly]);

  // Load all samples from all containers (including archived for search)
  const allSamples = useMemo(() => {
    const samples: Array<{ sample: PlasmaSample; container: PlasmaContainer; isFromCheckout?: boolean }> = [];
    
    // Load samples from active and archived containers
    containers.forEach(container => {
      const storageKey = `samples-${container.id}`;
      const savedSamples = localStorage.getItem(storageKey);
      
      if (savedSamples) {
        try {
          const parsedData = JSON.parse(savedSamples);
          
          // Convert from admin import format {position: {id, timestamp}} to PlasmaSample format
          if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
            Object.entries(parsedData).forEach(([position, data]: [string, any]) => {
              const sample: PlasmaSample = {
                position,
                sampleId: (data as any).id,
                storageDate: (data as any).timestamp ? (data as any).timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
                lastAccessed: (data as any).lastAccessed,
                history: (data as any).history || [{
                  timestamp: (data as any).timestamp || new Date().toISOString(),
                  action: 'check-in',
                  notes: `Initial storage in position ${position}`
                }]
              };
              samples.push({ sample, container });
            });
          } else if (Array.isArray(parsedData)) {
            parsedData.forEach((sample: any) => {
              const sampleWithHistory = {
                ...sample,
                history: sample.history || [{
                  timestamp: sample.storageDate ? `${sample.storageDate}T00:00:00.000Z` : new Date().toISOString(),
                  action: 'check-in' as const,
                  notes: `Initial storage in position ${sample.position}`
                }]
              };
              samples.push({ sample: sampleWithHistory, container });
            });
          }
        } catch (error) {
          console.error(`Error loading samples for container ${container.id}:`, error);
        }
      }
    });
    
    // Also load checked-out samples for search (but mark them as checked out)
    try {
      const checkoutKey = 'checked-out-samples';
      const checkoutData = localStorage.getItem(checkoutKey);
      if (checkoutData) {
        const checkedOutSamples = JSON.parse(checkoutData);
        checkedOutSamples.forEach((sample: any) => {
          // Create a virtual container for checked-out samples
          const virtualContainer: PlasmaContainer = {
            id: 'CHECKOUT',
            name: 'Checked Out',
            location: `Originally from: ${sample.originalContainer?.name || 'Unknown'}`,
            containerType: '9x9-box',
            sampleType: 'DP Pools',
            temperature: 'N/A',
            occupiedSlots: 0,
            totalSlots: 0,
            lastUpdated: sample.checkoutDate || new Date().toISOString().split('T')[0],
            isArchived: false
          };
          
          samples.push({ 
            sample: {
              ...sample,
              position: 'CHECKOUT'
            }, 
            container: virtualContainer,
            isFromCheckout: true
          });
        });
      }
    } catch (error) {
      console.error('Error loading checked-out samples:', error);
    }
    
    return samples;
  }, [containers]);

  // Filter samples based on search query or worklist (pure)
  const filteredSamples = useMemo(() => {
    if (sampleSearchMode === 'worklist') {
      if (worklistSampleIds.length === 0) return [];
      return allSamples.filter(({ sample }) => 
        worklistSampleIds.includes(sample.sampleId)
      );
    } else {
      if (!sampleSearchQuery.trim()) {
        return [];
      }
      
      // Split the search query by commas and trim whitespace
      const searchTerms = sampleSearchQuery
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0);
      
      return allSamples.filter(({ sample, container }) => {
        // Check if any search term matches the sample
        return searchTerms.some(query => {
          return (
            sample.sampleId.toLowerCase().includes(query) ||
            sample.position.toLowerCase().includes(query) ||
            container.name.toLowerCase().includes(query) ||
            container.location.toLowerCase().includes(query) ||
            container.id.toLowerCase().includes(query) ||
            container.sampleType.toLowerCase().includes(query)
          );
        });
      });
    }
  }, [allSamples, sampleSearchQuery, sampleSearchMode, worklistSampleIds]);

  // Keep highlight IDs in sync (no side-effects in useMemo)
  useEffect(() => {
    if (sampleSearchMode === 'manual') {
      setManualSearchSampleIds(filteredSamples.map(({ sample }) => sample.sampleId));
    } else {
      setManualSearchSampleIds([]);
    }
  }, [sampleSearchMode, filteredSamples]);

  const getOccupancyColor = (occupied: number, total: number) => {
    const percentage = (occupied / total) * 100;
    if (percentage === 100) return 'destructive';
    if (percentage >= 80) return 'secondary';
    return 'default';
  };

  const getOccupancyStatus = (occupied: number, total: number) => {
    const percentage = (occupied / total) * 100;
    if (percentage === 100) return 'Full';
    if (percentage >= 80) return 'Nearly Full';
    if (percentage >= 50) return 'Half Full';
    return 'Available';
  };

  const handleCreateContainer = (newContainer: Omit<PlasmaContainer, 'id' | 'occupiedSlots' | 'lastUpdated'>) => {
    // Use the highest numeric suffix to avoid duplicates (e.g., PB012 -> 12)
    const maxN = containers.reduce((max, c) => {
      const n = parseInt((c.id.match(/\d+$/) || ['0'])[0], 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    const id = `PB${String(maxN + 1).padStart(3, '0')}`;

    const totalSlots = getGridDimensions(newContainer.containerType, newContainer.sampleType).total;
    const container: PlasmaContainer = {
      ...newContainer,
      id,
      occupiedSlots: 0,
      totalSlots,
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    onContainersChange([...containers, container]);
  };

  const handleContainerUpdate = (updatedContainer: PlasmaContainer) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('handleContainerUpdate called with:', updatedContainer);
      // eslint-disable-next-line no-console
      console.log('onContainersChange type:', typeof onContainersChange);
    }
    
    if (typeof onContainersChange !== 'function') {
      console.error('onContainersChange is not a function:', onContainersChange);
      return;
    }
    
    const updatedContainers = containers.map(container => 
      container.id === updatedContainer.id ? updatedContainer : container
    );
    
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('Calling onContainersChange with:', updatedContainers);
    }
    onContainersChange(updatedContainers);
  };

  const handleEditContainer = (container: PlasmaContainer) => {
    setContainerToEdit(container);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setContainerToEdit(null);
  };

  const handleNavigateToSample = (containerId: string, sampleId: string) => {
    const container = containers.find(c => c.id === containerId);
    if (container) {
      setSelectedContainer(container);
      setSelectedSampleForView(sampleId);
    }
  };

  const handleCheckoutSample = (sampleId: string, containerId: string) => {
    // Don't allow checkout from archived containers or checkout storage
    const container = containers.find(c => c.id === containerId);
    if (!container || container.isArchived || containerId === 'CHECKOUT') {
      toast.error('Cannot checkout samples from archived containers or already checked-out samples');
      return;
    }

    try {
      const storageKey = `samples-${containerId}`;
      const savedSamples = localStorage.getItem(storageKey);
      
      if (savedSamples) {
        const parsedData = JSON.parse(savedSamples);
        let updatedSamples: PlasmaSample[] = [];
        let targetSample: PlasmaSample | null = null;
        
        // Handle both array and object formats
        if (Array.isArray(parsedData)) {
          targetSample = parsedData.find((sample: PlasmaSample) => sample.sampleId === sampleId);
          updatedSamples = parsedData.filter((sample: PlasmaSample) => sample.sampleId !== sampleId);
        } else if (typeof parsedData === 'object') {
          // Convert object format to array and filter
          const allSamples = Object.entries(parsedData)
            .map(([position, data]: [string, any]) => ({
              position,
              sampleId: data.id,
              storageDate: data.timestamp ? data.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
              lastAccessed: data.lastAccessed,
              history: data.history || []
            }));
          
          targetSample = allSamples.find(s => s.sampleId === sampleId);
          updatedSamples = allSamples
            .filter(([_, data]: [string, any]) => data.id !== sampleId)
            .map(([position, data]: [string, any]) => ({
              position,
              sampleId: data.id,
              storageDate: data.timestamp ? data.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
              lastAccessed: data.lastAccessed,
              history: data.history || []
            }));
        }
        
        if (!targetSample) {
          toast.error('Sample not found in container');
          return;
        }

        // Create checkout history entry
        const checkoutHistoryEntry = {
          timestamp: new Date().toISOString(),
          action: 'check-out' as const,
          user: 'Current User',
          notes: `Sample checked out from ${container.name} position ${targetSample.position}`,
          fromPosition: targetSample.position
        };

        // Store the complete sample with checkout history
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
          const filteredCheckouts = checkouts.filter((c: any) => c.sampleId !== sampleId);
          filteredCheckouts.push(checkoutSample);
          
          localStorage.setItem(checkoutKey, JSON.stringify(filteredCheckouts));
        } catch (error) {
          console.error('Error saving checkout history:', error);
        }
        
        // Save updated samples
        localStorage.setItem(storageKey, JSON.stringify(updatedSamples));
        
        // Update container occupied count
        const updatedContainers = containers.map(c => {
          if (c.id === containerId) {
            return {
              ...c,
              occupiedSlots: updatedSamples.length,
              lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ')
            };
          }
          return c;
        });
        onContainersChange(updatedContainers);
        
        toast.success(`Sample ${sampleId} checked out successfully`);
      }
    } catch (error) {
      console.error('Error checking out sample:', error);
      toast.error('Failed to checkout sample');
    }
  };
  const clearFilters = () => {
    setSearchQuery('');
    setSampleSearchQuery('');
    setSelectedSampleType(null);
  };

  const clearContainerFilters = () => {
    setSearchQuery('');
    setSelectedSampleType(null);
    setShowAvailableOnly(false);
    setShowTrainingOnly(false);
  };

  const clearSampleFilters = () => {
    setSampleSearchQuery('');
    setWorklistSampleIds([]);
    setWorklistDuplicateIds([]);
    setManualSearchSampleIds([]);
    setSampleSearchMode('manual');
  };

  const handleWorklistSamplesExtracted = (sampleIds: string[], duplicateIds: string[] = []) => {
    setWorklistSampleIds(sampleIds);
    setWorklistDuplicateIds(duplicateIds);
    if (sampleIds.length > 0) {
      setSampleSearchMode('worklist');
      setSampleSearchQuery(''); // Clear manual search when using worklist
      setManualSearchSampleIds([]); // Clear manual search sample IDs
    } else {
      setSampleSearchMode('manual');
    }
  };

  const handleClearWorklist = () => {
    setWorklistSampleIds([]);
    setWorklistDuplicateIds([]);
    setSampleSearchMode('manual');
  };

  // Total sample count
  const totalSampleCount = allSamples.length;

  if (selectedContainer) {
    return (
      <div className="h-screen">
        <PlasmaBoxDashboard 
          container={selectedContainer} 
          onContainerUpdate={handleContainerUpdate}
          initialSelectedSample={selectedSampleForView}
          onSampleSelectionHandled={() => setSelectedSampleForView(null)}
          highlightSampleIds={sampleSearchMode === 'worklist' ? worklistSampleIds : manualSearchSampleIds}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-stone-900">
      {/* Content Area */}
      <div className="px-6 py-6">
        {/* Dialogs */}
        <CreateContainerDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateContainer={handleCreateContainer}
        />
        
        <EditContainerDialog
          open={isEditDialogOpen}
          onOpenChange={handleEditDialogClose}
          container={containerToEdit}
          onUpdateContainer={handleContainerUpdate}
          key={containerToEdit?.id} // Force re-render when container changes
        />

        {/* Main Content with Tabs */}
        {containers.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground">
              <Thermometer className="w-16 h-16 mx-auto mb-6 opacity-30" />
              <h3 className="mb-3">Welcome to Plasma Storage Management</h3>
              <p className="text-sm mb-6 max-w-md mx-auto">
                Get started by creating your first storage container. You can organize different sample types 
                including DP Pools, cfDNA Tubes, DTC Tubes, MNC Tubes, PA Pool Tubes, Plasma Tubes, and BC Tubes.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Container
              </Button>
            </div>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'containers' | 'archive' | 'samples')}>
            <TabsList className="grid w-full grid-cols-3 max-w-lg mb-6">
              <TabsTrigger value="containers" className="flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Containers ({activeContainers.length})
              </TabsTrigger>
              <TabsTrigger value="archive" className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archive ({archivedContainers.length})
              </TabsTrigger>
              <TabsTrigger value="samples" className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Samples ({totalSampleCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="containers" className="space-y-6">
              {/* Search and Filter Controls */}
              <div className="bg-white dark:bg-stone-800 rounded-lg border border-gray-200 dark:border-stone-700 p-4 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-stone-400 w-4 h-4" />
                    <Input
                      placeholder="Search active containers by ID, name, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-200 dark:border-stone-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-stone-300">Filter by sample type:</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSampleType === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSampleType(null)}
                    className="bg-gray-900 text-white hover:bg-gray-800 data-[state=active]:bg-gray-900"
                  >
                    All Types
                  </Button>
                  {SAMPLE_TYPES.map((sampleType) => {
                    const isSelected = selectedSampleType === sampleType;
                    const colorClass = getSampleTypeColor(sampleType);
                    return (
                      <Button
                        key={sampleType}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSampleType(sampleType)}
                        className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${colorClass} border-gray-200 dark:border-stone-600 dark:hover:bg-stone-700`}
                      >
                        {sampleType}
                      </Button>
                    );
                  })}
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                      className={`${showAvailableOnly ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-stone-600'}`}
                    >
                      Available Slots Only
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTrainingOnly(!showTrainingOnly)}
                      className={`${showTrainingOnly ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-stone-600'} flex items-center gap-2`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Training Only
                    </Button>
                  </div>
                  
                  {(searchQuery || selectedSampleType || showAvailableOnly || showTrainingOnly) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearContainerFilters}
                      className="text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Container Results Summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-stone-300">
                  Showing {filteredContainers.length} of {activeContainers.length} active containers
                  {searchQuery && ` matching "${searchQuery}"`}
                  {selectedSampleType && ` filtered by ${selectedSampleType}`}
                  {showAvailableOnly && ` with available slots`}
                  {showTrainingOnly && ` marked as training`}
                </p>
              </div>

              {/* Container Grid */}
              {filteredContainers.length === 0 ? (
                <div className="bg-white rounded-lg border p-12 text-center">
                  <div className="text-gray-500">
                    <Thermometer className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <h3 className="mb-2">No active containers found</h3>
                    <p className="text-sm">
                      {activeContainers.length === 0 
                        ? "No active containers available. Try creating a new container or check the Archive tab."
                        : "Try adjusting your search or filter criteria"}
                    </p>
                    <Button variant="outline" size="sm" onClick={clearContainerFilters} className="mt-4">
                      Clear Filters
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredContainers.map((container) => (
                    <ContainerCard
                      key={container.id}
                      container={container}
                      onSelect={setSelectedContainer}
                      onEdit={handleEditContainer}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="archive" className="space-y-6">
              {/* Archive Search and Filter Controls */}
              <Card className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search archived containers by ID, name, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Filter by sample type:</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedSampleType === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSampleType(null)}
                    >
                      All Types
                    </Button>
                    {SAMPLE_TYPES.map((sampleType) => (
                      <Button
                        key={sampleType}
                        variant={selectedSampleType === sampleType ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSampleType(sampleType)}
                        className={selectedSampleType === sampleType ? '' : getSampleTypeColor(sampleType)}
                      >
                        {sampleType}
                      </Button>
                    ))}
                    
                    {(searchQuery || selectedSampleType) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedSampleType(null);
                        }}
                        className="text-muted-foreground ml-4"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Archive Results Summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredContainers.length} of {archivedContainers.length} archived containers
                  {searchQuery && ` matching "${searchQuery}"`}
                  {selectedSampleType && ` filtered by ${selectedSampleType}`}
                </p>
              </div>

              {/* Archive Grid */}
              {filteredContainers.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="mb-2">No archived containers found</h3>
                    <p className="text-sm">
                      {archivedContainers.length === 0 
                        ? "No containers have been archived yet. You can archive containers by editing them in the Active tab."
                        : "Try adjusting your search or filter criteria"}
                    </p>
                    {(searchQuery || selectedSampleType) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedSampleType(null);
                        }} 
                        className="mt-4"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContainers.map((container) => (
                    <ContainerCard
                      key={container.id}
                      container={container}
                      onSelect={setSelectedContainer}
                      onEdit={handleEditContainer}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="samples" className="space-y-6">
              {/* Sample Search Mode Toggle */}
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant={sampleSearchMode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSampleSearchMode('manual');
                    setWorklistSampleIds([]);
                    setWorklistDuplicateIds([]);
                  }}
                  className="flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Manual Search
                </Button>
                <Button
                  variant={sampleSearchMode === 'worklist' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSampleSearchMode('worklist')}
                  className="flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  Worklist Search
                </Button>
              </div>

              {sampleSearchMode === 'manual' ? (
                <>
                  {/* Manual Sample Search Controls */}
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="Search samples by ID, container, position... (separate multiple with commas)"
                            value={sampleSearchQuery}
                            onChange={(e) => setSampleSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {sampleSearchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSampleSearchQuery('');
                              setManualSearchSampleIds([]);
                            }}
                            className="text-muted-foreground"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Manual Search Results */}
                  {filteredSamples.length > 0 && (
                    <SampleSearchResults
                      samples={filteredSamples.map(({ sample, container }) => ({ ...sample, containerId: container.id, containerName: container.name, containerLocation: container.location }))}
                      onNavigateToSample={handleNavigateToSample}
                      onCheckoutSample={handleCheckoutSample}
                      searchQuery={sampleSearchQuery}
                    />
                  )}

                  {sampleSearchQuery.trim() && filteredSamples.length === 0 && (
                    <Card className="p-8 text-center">
                      <div className="text-muted-foreground">
                        <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="mb-2">No samples found</h3>
                        <p className="text-sm">No samples match your search criteria: "{sampleSearchQuery}"</p>
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  {/* Worklist Upload */}
                  <WorklistUpload onSamplesExtracted={handleWorklistSamplesExtracted} />

                  {/* Worklist Results */}
                  {worklistSampleIds.length > 0 && (
                    <WorklistResults
                      sampleIds={worklistSampleIds}
                      duplicateIds={worklistDuplicateIds}
                      samples={filteredSamples.map(({ sample, container }) => ({ ...sample, containerId: container.id, containerName: container.name, containerLocation: container.location }))}
                      onNavigateToSample={handleNavigateToSample}
                      onCheckoutSample={handleCheckoutSample}
                      onClearWorklist={handleClearWorklist}
                    />
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

// Separate ContainerCard component for reusability
function ContainerCard({ 
  container, 
  onSelect, 
  onEdit 
}: { 
  container: PlasmaContainer; 
  onSelect: (container: PlasmaContainer) => void; 
  onEdit: (container: PlasmaContainer) => void;
}) {
  const effectiveTotalSlots = getGridDimensions(container.containerType, container.sampleType).total;
  const effectiveOccupied = useMemo(
    () => getLiveOccupied(container),
    [container.id, container.occupiedSlots, container.sampleType, container.containerType]
  );

  const getOccupancyColor = (occupied: number, total: number) => {
    const percentage = (occupied / total) * 100;
    if (percentage >= 100) return 'destructive';
    if (percentage >= 80) return 'secondary';
    return 'default';
  };

  const getOccupancyStatus = (occupied: number, total: number) => {
    const percentage = (occupied / total) * 100;
    if (percentage >= 100) return 'Full';
    if (percentage >= 80) return 'Nearly Full';
    if (percentage >= 50) return 'Half Full';
    return 'Available';
  };

  return (
    <Card 
      className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${
        container.isArchived
          ? 'border-archive-border bg-archive-background opacity-75'
          : container.isTraining 
          ? 'border-training-border bg-training-background' 
          : ''
      }`}
      onClick={() => onSelect(container)}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3>{container.name}</h3>
              {container.isArchived && (
                <Badge className="text-xs bg-archive text-archive-foreground">
                  <Archive className="w-3 h-3 mr-1" />
                  Archived
                </Badge>
              )}
              {container.isTraining && (
                <Badge className="text-xs bg-training text-training-foreground">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Training
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {container.location}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="text-xs">
                {container.temperature}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getContainerTypeLabel(container.containerType)}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(container);
                }}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Container
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700 dark:text-stone-300">Sample Type</span>
            <Badge 
              className={`text-xs ${getSampleTypeColor(container.sampleType)}`}
            >
              {container.sampleType}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700 dark:text-stone-300">Occupancy</span>
            <div className="flex items-center gap-2">
              <Badge variant={getOccupancyColor(effectiveOccupied, effectiveTotalSlots)}>
                {effectiveOccupied}/{effectiveTotalSlots}
              </Badge>
              <span className="text-xs text-muted-foreground dark:text-stone-400">
                {getOccupancyStatus(effectiveOccupied, effectiveTotalSlots)}
              </span>
            </div>
          </div>

          <div className="w-full bg-muted dark:bg-stone-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                container.isArchived
                  ? 'bg-archive dark:bg-stone-500'
                  : container.isTraining
                  ? 'bg-training dark:bg-orange-600'
                  : 'bg-primary dark:bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, (effectiveOccupied / effectiveTotalSlots) * 100)}%` }}
            />
          </div>

          <div className="text-xs text-muted-foreground dark:text-stone-400">
            Last updated: {container.lastUpdated}
          </div>
        </div>
      </div>
    </Card>
  );
}
