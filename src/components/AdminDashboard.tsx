import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alerts';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Database,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlasmaContainer, ContainerType, SampleType } from './PlasmaContainerList';
import { getGridDimensions } from './PlasmaContainerList';

interface AdminDashboardProps {
  onExitAdmin: () => void;
  containers: PlasmaContainer[];
  onContainersChange: (containers: PlasmaContainer[]) => void;
  userId?: string;
  userName?: string;
}

interface ParsedContainerData {
  totalRows: number;
  validContainers: any[];
  invalidRows: number;
  duplicateIds: string[];
  fileName: string;
  errors: string[];
}

export function AdminDashboard({ 
  onExitAdmin, 
  containers, 
  onContainersChange,
  userId = 'admin',
  userName = 'Admin'
}: AdminDashboardProps) {
  const containerFileRef = useRef<HTMLInputElement | null>(null);
  const sampleFileRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedContainerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleContainerFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setParsedData(null);

    try {
      const fileContent = await readFileContent(file);
      const parsed = parseContainerCSV(fileContent, file.name);
      setParsedData(parsed);
      
      if (parsed.validContainers.length > 0) {
        toast.success(`Parsed ${parsed.validContainers.length} valid containers from ${file.name}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSampleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const fileContent = await readFileContent(file);
      const parsed = parseSampleCSV(fileContent, file.name);
      
      // Process sample data and update containers
      processSampleData(parsed);
      toast.success(`Processed sample data from ${file.name}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse sample file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

  const parseContainerCSV = (content: string, fileName: string): ParsedContainerData => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('File appears to be empty');

    // Detect separator
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes('\t')) separator = '\t';
    else if (firstLine.includes(';')) separator = ';';

    // Parse headers
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
    
    // Expected headers for container CSV
    const requiredHeaders = ['id', 'name', 'location', 'containerType', 'sampleType', 'temperature'];
    const missingHeaders = requiredHeaders.filter(h => 
      !headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
    );

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const validContainers: any[] = [];
    const duplicateIds: string[] = [];
    const errors: string[] = [];
    let invalidRows = 0;
    const seenIds = new Set<string>();

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = lines[i].split(separator).map(cell => cell.trim().replace(/"/g, ''));
        
        if (row.length < headers.length) {
          invalidRows++;
          continue;
        }

        const containerData: any = {};
        headers.forEach((header, index) => {
          containerData[header] = row[index] || '';
        });

        // Validate required fields
        const id = containerData.id || containerData.ID || containerData.containerId;
        const name = containerData.name || containerData.Name;
        const location = containerData.location || containerData.Location;
        const containerType = containerData.containerType || containerData.type || containerData.Type;
        const sampleType = containerData.sampleType || containerData.sampleType;
        const temperature = containerData.temperature || containerData.Temperature || '-80°C';

        // Normalize temperature format - handle various degree symbol representations
        const normalizedTemperature = temperature
          .replace(/°/g, '°')  // Replace any degree symbol variants with standard °
          .replace(/\s*degrees?\s*/gi, '°')  // Replace "degrees" or "degree" with °
          .replace(/\s*deg\s*/gi, '°')  // Replace "deg" with °
          .trim();

        if (!id || !name || !location) {
          invalidRows++;
          errors.push(`Row ${i + 1}: Missing required fields (id, name, location)`);
          continue;
        }

        // Check for duplicates
        if (seenIds.has(id)) {
          duplicateIds.push(id);
          continue;
        }
        seenIds.add(id);

        // Validate container type
        const validContainerTypes: ContainerType[] = ['9x9-box', '5x5-box', '5x4-rack', '9x9-rack'];
        const normalizedContainerType = containerType.toLowerCase().replace(/[^a-z0-9]/g, '-') as ContainerType;
        const finalContainerType = validContainerTypes.includes(normalizedContainerType) 
          ? normalizedContainerType 
          : '9x9-box';

        // Validate sample type
        const validSampleTypes: SampleType[] = ['DP Pools', 'cfDNA Tubes', 'DTC Tubes', 'MNC Tubes', 'PA Pool Tubes', 'Plasma Tubes', 'BC Tubes'];
        const finalSampleType = validSampleTypes.find(st => 
          st.toLowerCase() === sampleType.toLowerCase()
        ) || 'DP Pools';

        const dimensions = getGridDimensions(finalContainerType, finalSampleType);

        const container: PlasmaContainer = {
          id,
          name,
          location,
          containerType: finalContainerType,
          sampleType: finalSampleType,
          temperature: normalizedTemperature,
          occupiedSlots: 0,
          totalSlots: dimensions.total,
          lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
          isTraining: containerData.isTraining === 'true' || containerData.training === 'true',
          isArchived: containerData.isArchived === 'true' || containerData.archived === 'true'
        };

        validContainers.push(container);
      } catch (rowError) {
        invalidRows++;
        errors.push(`Row ${i + 1}: ${rowError instanceof Error ? rowError.message : 'Parse error'}`);
      }
    }

    return {
      totalRows: lines.length - 1,
      validContainers,
      invalidRows,
      duplicateIds,
      fileName,
      errors
    };
  };

  const parseSampleCSV = (content: string, fileName: string) => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('Sample file appears to be empty');

    // Detect separator
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes('\t')) separator = '\t';
    else if (firstLine.includes(';')) separator = ';';

    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
    
    // Process sample data (simplified for now)
    const samples: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(separator).map(cell => cell.trim().replace(/"/g, ''));
      if (row.length >= headers.length) {
        const sampleData: any = {};
        headers.forEach((header, index) => {
          sampleData[header] = row[index] || '';
        });
        samples.push(sampleData);
      }
    }

    return { samples, fileName };
  };

  const processSampleData = (parsed: { samples: any[]; fileName: string }) => {
    // Process and store sample data in localStorage for each container
    const samplesByContainer: Record<string, any[]> = {};
    
    parsed.samples.forEach(sample => {
      const containerId = sample.containerId || sample.container_id || sample.ContainerID;
      if (containerId) {
        if (!samplesByContainer[containerId]) {
          samplesByContainer[containerId] = [];
        }
        samplesByContainer[containerId].push(sample);
      }
    });

    // Update localStorage for each container
    Object.entries(samplesByContainer).forEach(([containerId, samples]) => {
      const storageKey = `samples-${containerId}`;
      localStorage.setItem(storageKey, JSON.stringify(samples));
    });

    toast.success(`Processed samples for ${Object.keys(samplesByContainer).length} containers`);
  };

  const importContainers = () => {
    if (!parsedData || parsedData.validContainers.length === 0) {
      toast.error('No valid containers to import');
      return;
    }

    // Check for existing containers with same IDs
    const existingIds = new Set(containers.map(c => c.id));
    const newContainers = parsedData.validContainers.filter(c => !existingIds.has(c.id));
    const duplicateContainers = parsedData.validContainers.filter(c => existingIds.has(c.id));

    if (duplicateContainers.length > 0) {
      const proceed = window.confirm(
        `${duplicateContainers.length} containers already exist with the same IDs. Do you want to skip them and import only the new ones?`
      );
      if (!proceed) return;
    }

    // Add new containers
    const updatedContainers = [...containers, ...newContainers];
    onContainersChange(updatedContainers);

    toast.success(`Imported ${newContainers.length} new containers`);
    if (duplicateContainers.length > 0) {
      toast.warning(`Skipped ${duplicateContainers.length} duplicate containers`);
    }

    // Clear parsed data
    setParsedData(null);
    if (containerFileRef.current) {
      containerFileRef.current.value = '';
    }
  };

  const downloadContainerTemplate = () => {
    const csvContent = `id,name,location,containerType,sampleType,temperature,isTraining,isArchived
PB001,Plasma Box Alpha,Freezer A - Rack 1,9x9-box,DP Pools,-80°C,false,false
PB002,Plasma Box Beta,Freezer A - Rack 2,5x5-box,Plasma Tubes,-80°C,false,false
PB003,Training Box,Lab Bench 1,9x9-box,DP Pools,RT,true,false`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'container_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadSampleTemplate = () => {
    const csvContent = `containerId,position,sampleId,timestamp
PB001,A1,M00H4FAD,2025-01-20T10:00:00Z
PB001,A2,M00H4FBD,2025-01-20T10:01:00Z
PB001,A3,M00H4FCD,2025-01-20T10:02:00Z`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportContainers = () => {
    const csvRows = ['id,name,location,containerType,sampleType,temperature,occupiedSlots,totalSlots,lastUpdated,isTraining,isArchived'];
    containers.forEach(container => {
      csvRows.push([
        container.id,
        `"${container.name}"`,
        `"${container.location}"`,
        container.containerType,
        container.sampleType,
        container.temperature,
        container.occupiedSlots,
        container.totalSlots,
        container.lastUpdated,
        container.isTraining || false,
        container.isArchived || false
      ].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `containers_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Container Management
          </h2>
          <p className="text-muted-foreground">
            Import, export, and manage container data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportContainers}>
            <Download className="h-4 w-4 mr-2" />
            Export All Containers
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Container Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Containers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Upload Container Data (CSV)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Import multiple containers from a CSV file with container definitions
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadContainerTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6">
            <input
              ref={containerFileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleContainerFileUpload}
              className="hidden"
              id="container-upload"
            />
            <label htmlFor="container-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-muted-foreground/20 rounded-full">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Click to upload container CSV</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV, TSV, and TXT files
                </p>
              </div>
            </label>
          </div>

          {isProcessing && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>Processing container file...</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {parsedData && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>File processed successfully!</strong>
                  <br />
                  Found {parsedData.validContainers.length} valid containers from {parsedData.fileName}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat value={parsedData.validContainers.length} label="Valid Containers" accent="text-green-600" />
                <Stat value={parsedData.totalRows} label="Total Rows" />
                <Stat value={parsedData.duplicateIds.length} label="Duplicates" accent="text-yellow-600" />
                <Stat value={parsedData.invalidRows} label="Invalid Rows" accent="text-red-600" />
              </div>

              {parsedData.errors.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Parsing Errors ({parsedData.errors.length})
                  </h4>
                  <ScrollArea className="h-24 border rounded p-2">
                    <div className="space-y-1">
                      {parsedData.errors.map((error, i) => (
                        <p key={i} className="text-xs text-red-600">{error}</p>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {parsedData.validContainers.length > 0 && (
                <div>
                  <h4 className="mb-2">Preview of Containers to Import</h4>
                  <ScrollArea className="h-48 border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Sample Type</TableHead>
                          <TableHead>Temperature</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.validContainers.slice(0, 10).map((container, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{container.id}</TableCell>
                            <TableCell>{container.name}</TableCell>
                            <TableCell>{container.location}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {container.containerType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {container.sampleType}
                              </Badge>
                            </TableCell>
                            <TableCell>{container.temperature}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {parsedData.validContainers.length > 10 && (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        ... and {parsedData.validContainers.length - 10} more containers
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={importContainers} 
                  disabled={parsedData.validContainers.length === 0}
                  className="flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Import {parsedData.validContainers.length} Containers
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setParsedData(null);
                    setError(null);
                    if (containerFileRef.current) {
                      containerFileRef.current.value = '';
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Sample Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Upload Sample Data (CSV)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Import sample positions and IDs for existing containers
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSampleTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6">
            <input
              ref={sampleFileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleSampleFileUpload}
              className="hidden"
              id="sample-upload"
            />
            <label htmlFor="sample-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-muted-foreground/20 rounded-full">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Click to upload sample CSV</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV, TSV, and TXT files
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Current Containers Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Containers ({containers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No containers in the system</p>
              <p className="text-sm mt-1">Import containers using the CSV upload above</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat 
                  value={containers.filter(c => !c.isArchived).length} 
                  label="Active Containers" 
                  accent="text-blue-600" 
                />
                <Stat 
                  value={containers.filter(c => c.isArchived).length} 
                  label="Archived" 
                  accent="text-gray-600" 
                />
                <Stat 
                  value={containers.filter(c => c.isTraining).length} 
                  label="Training" 
                  accent="text-orange-600" 
                />
                <Stat 
                  value={containers.reduce((sum, c) => sum + c.occupiedSlots, 0)} 
                  label="Total Samples" 
                  accent="text-green-600" 
                />
              </div>

              <ScrollArea className="h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Occupancy</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containers.map(container => (
                      <TableRow key={container.id}>
                        <TableCell className="font-mono text-xs">{container.id}</TableCell>
                        <TableCell>{container.name}</TableCell>
                        <TableCell>{container.location}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {container.containerType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            container.occupiedSlots === container.totalSlots ? 'destructive' :
                            container.occupiedSlots >= container.totalSlots * 0.8 ? 'secondary' : 'default'
                          } className="text-xs">
                            {container.occupiedSlots}/{container.totalSlots}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {container.isArchived && (
                              <Badge className="text-xs bg-gray-100 text-gray-800">Archived</Badge>
                            )}
                            {container.isTraining && (
                              <Badge className="text-xs bg-orange-100 text-orange-800">Training</Badge>
                            )}
                            {!container.isArchived && !container.isTraining && (
                              <Badge variant="outline" className="text-xs">Active</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ value, label, accent }: { value: number | string; label: string; accent?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-medium ${accent || ''}`}>{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}