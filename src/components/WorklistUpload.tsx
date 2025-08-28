import React, { useState, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alerts';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';

interface WorklistUploadProps {
  onSamplesExtracted: (sampleIds: string[], duplicateIds?: string[]) => void;
  className?: string;
}

interface ParsedWorklistData {
  totalRows: number;
  sampleIds: string[];
  duplicateIds: string[];
  invalidRows: number;
  skippedSeeForm: number;
  fileName: string;
}

export function WorklistUpload({ onSamplesExtracted, className }: WorklistUploadProps) {
  const [parsedData, setParsedData] = useState<ParsedWorklistData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setParsedData(null);

    try {
      const fileContent = await readFileContent(file);
      const parsed = parseWorklistFile(fileContent, file.name);
      setParsedData(parsed);
      onSamplesExtracted(parsed.sampleIds, parsed.duplicateIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
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

  // Splits a single line safely for CSV with quotes; falls back for TSV/semicolon.
  const splitRow = (line: string, sep: string): string[] => {
    if (sep === ',') {
      // Split on commas not inside quotes
      const parts: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          // Toggle on quote, but handle escaped ""
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          parts.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      parts.push(cur);
      return parts.map((s) => s.trim().replace(/^"|"$/g, ''));
    }
    // TSV or others
    return line.split(sep).map((s) => s.trim().replace(/^"|"$/g, ''));
  };

  const parseWorklistFile = (raw: string, fileName: string): ParsedWorklistData => {
    // Normalize BOM + newlines
    const content = raw.replace(/^\uFEFF/, '').replace(/\r\n|\r|\n/g, '\n');

    const rawLines = content.split('\n').map((l) => l.trim());
    const lines = rawLines.filter((l) => l.length > 0);
    if (lines.length === 0) throw new Error('File appears to be empty');

    // Detect separator
    const firstLine = lines[0];
    let sep: string = ',';
    if (firstLine.includes('\t')) sep = '\t';
    else if (firstLine.includes(';')) sep = ';';

    // Headers
    const headers = splitRow(firstLine, sep).map((h) => h.replace(/"/g, ''));

    // Candidate column names for sample id
    const candidates = [
      'Sample_SampleID',
      'SampleID',
      'Sample ID',
      'Sample_ID',
      'sampleid',
      'sample_id',
      'ID',
      'Sample',
      'Barcode',
      'sample_barcode',
      'Sample_Barcode',
    ];

    let sampleIdx = -1;
    for (const c of candidates) {
      const idx = headers.findIndex(
        (h) => h.toLowerCase() === c.toLowerCase() || h.toLowerCase().includes(c.toLowerCase())
      );
      if (idx !== -1) {
        sampleIdx = idx;
        break;
      }
    }
    if (sampleIdx === -1) sampleIdx = 0; // Fallback to first column

    const all: string[] = [];
    const dupCounts = new Map<string, number>();
    let invalidRows = 0;
    let skippedSeeForm = 0;

    // Rows
    for (let i = 1; i < lines.length; i++) {
      const row = splitRow(lines[i], sep);
      if (row.length <= sampleIdx) {
        invalidRows++;
        continue;
      }
      let id = (row[sampleIdx] || '').trim().replace(/^"|"$/g, '');
      if (!id) {
        invalidRows++;
        continue;
      }

      // Skip "See Form" style rows
      if (id.toLowerCase().includes('see form')) {
        skippedSeeForm++;
        continue;
      }

      all.push(id);
      dupCounts.set(id, (dupCounts.get(id) || 0) + 1);
    }

    const unique = Array.from(new Set(all));
    const duplicateIds = Array.from(dupCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id);

    if (unique.length === 0) throw new Error('No valid sample IDs found in the file');

    return {
      totalRows: Math.max(lines.length - 1, 0),
      sampleIds: unique,
      duplicateIds,
      invalidRows,
      skippedSeeForm,
      fileName,
    };
  };

  const handleClearWorklist = () => {
    setParsedData(null);
    setError(null);
    onSamplesExtracted([], []);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csvContent = `Sample_SampleID,Sample_Type,Source_Plate,Source_Well,Destination_Plate,Destination_Well,Volume
M00H4FAD,Plasma,MagPlate,A1,M00H4FAFP,A1,
M00H4FBD,Plasma,MagPlate,A2,M00H4FAFP,A2,
M00H4FCD,Plasma,MagPlate,A3,M00H4FAFP,A3,`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worklist_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className={`p-6 ${className || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Worklist
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a CSV or TSV file containing sample IDs to search multiple samples at once
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        </div>

        {!parsedData && (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="worklist-upload"
            />
            <label htmlFor="worklist-upload" className="cursor-pointer flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 border-2 border-dashed border-muted-foreground/20 rounded-full">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Click to upload worklist file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CSV, TSV, and TXT files</p>
              </div>
            </label>
          </div>
        )}

        {isProcessing && (
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>Processing worklist file...</AlertDescription>
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
                <strong>Worklist processed successfully!</strong>
                <br />
                Found {parsedData.sampleIds.length} unique sample IDs from {parsedData.fileName}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat value={parsedData.sampleIds.length} label="Unique Samples" accent="text-green-600" />
              <Stat value={parsedData.totalRows} label="Total Rows" />
              <Stat value={parsedData.duplicateIds.length} label="Multi-Use" accent="text-blue-600" />
              <Stat value={parsedData.invalidRows} label="Invalid Rows" accent="text-red-600" />
              <Stat value={parsedData.skippedSeeForm} label={`Skipped "See Form"`} />
            </div>

            {parsedData.duplicateIds.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  Samples with Multiple Entries ({parsedData.duplicateIds.length})
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  These samples appear multiple times in the worklist (e.g., used in multiple steps)
                </p>
                <ScrollArea className="h-20 border rounded p-2">
                  <div className="flex flex-wrap gap-1">
                    {parsedData.duplicateIds.map((id, i) => (
                      <Badge key={`${id}-${i}`} variant="secondary" className="text-xs">
                        {id}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div>
              <h4 className="mb-2">Sample IDs to Search ({parsedData.sampleIds.length})</h4>
              <ScrollArea className="h-32 border rounded p-2">
                <div className="flex flex-wrap gap-1">
                  {parsedData.sampleIds.map((id, i) => (
                    <Badge key={`${id}-${i}`} variant="secondary" className="text-xs">
                      {id}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearWorklist} className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Clear Worklist
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload New File
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
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
