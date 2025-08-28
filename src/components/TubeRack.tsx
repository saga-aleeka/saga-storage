import React, { useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { StorageContainer } from './StorageDashboard';

interface Sample {
  id: string;
  position: string;
  sampleId: string;
  patientId: string;
  sampleType: string;
  status: 'active' | 'processing' | 'completed' | 'expired';
  dateCollected: string;
  volume?: string;
}

const mockSamples: Sample[] = [
  { id: '1', position: 'A1', sampleId: 'S001', patientId: 'P12345', sampleType: 'Blood',  status: 'active',     dateCollected: '2025-08-14', volume: '5ml' },
  { id: '2', position: 'A2', sampleId: 'S002', patientId: 'P12346', sampleType: 'Urine',  status: 'processing', dateCollected: '2025-08-14', volume: '10ml' },
  { id: '3', position: 'A3', sampleId: 'S003', patientId: 'P12347', sampleType: 'Blood',  status: 'completed',  dateCollected: '2025-08-13', volume: '3ml' },
  { id: '4', position: 'B1', sampleId: 'S004', patientId: 'P12348', sampleType: 'Serum',  status: 'expired',    dateCollected: '2025-08-10', volume: '2ml' },
];

interface TubeRackProps {
  container: StorageContainer;
}

const ROWS = 8;
const COLS = 12;
const ROW_LABELS = Array.from({ length: ROWS }, (_, i) => String.fromCharCode(65 + i)); // A..H
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String(i + 1));

export function TubeRack({ container }: TubeRackProps) {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const getStatusColor = (status: Sample['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-200';
    }
  };

  const getStatusBadgeVariant = (
    status: Sample['status']
  ): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'active': return 'default';
      case 'processing': return 'secondary';
      case 'completed': return 'outline';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  // Build a full 8x12 rack with any known samples merged in
  const grid = useMemo(() => {
    const byPos = new Map<string, Sample>(mockSamples.map((s) => [s.position, s]));
    return ROW_LABELS.flatMap((row) =>
      COL_LABELS.map((col) => {
        const pos = `${row}${col}`;
        return { position: pos, sample: byPos.get(pos) as Sample | undefined };
      })
    );
  }, []);

  const openPosition = (position: string, sample?: Sample) => {
    setSelectedPosition(position);
    if (sample) setSelectedSample(sample);
  };

  const exportSampleCsv = (s: Sample) => {
    const headers = ['Position', 'Sample ID', 'Patient ID', 'Sample Type', 'Status', 'Date Collected', 'Volume'];
    const row = [
      s.position,
      s.sampleId,
      s.patientId,
      s.sampleType,
      s.status,
      s.dateCollected,
      s.volume ?? '',
    ];
    const csv = `${headers.join(',')}\n${row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tube-${s.sampleId}-${s.position}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick legend counts
  const counts = useMemo(() => {
    const c = { active: 0, processing: 0, completed: 0, expired: 0, empty: ROWS * COLS };
    mockSamples.forEach((s) => {
      c[s.status] += 1;
      c.empty -= 1;
    });
    return c;
  }, []);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2>Container Overview</h2>
          <div className="flex gap-2">
            <Badge variant="outline">{container.occupied}/{container.capacity} positions</Badge>
            {container.temperature && <Badge variant="outline">{container.temperature}</Badge>}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <span>Active ({counts.active})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
            <span>Processing ({counts.processing})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full" />
            <span>Completed ({counts.completed})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full" />
            <span>Expired ({counts.expired})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded-full" />
            <span>Empty ({counts.empty})</span>
          </div>
        </div>
      </Card>

      {/* Grid */}
      <Card className="p-4">
        <h3 className="mb-4">Tube Rack Grid</h3>

        <div className="flex flex-col gap-1">
          {/* Column labels */}
          <div className="flex gap-1 mb-2">
            <div className="w-8 h-8" />
            {COL_LABELS.map((c) => (
              <div key={c} className="w-8 h-8 flex items-center justify-center text-xs font-medium">
                {c}
              </div>
            ))}
          </div>

          {/* Rows */}
          {ROW_LABELS.map((row, rIdx) => (
            <div key={row} className="flex gap-1">
              {/* Row label */}
              <div className="w-8 h-8 flex items-center justify-center text-xs font-medium">{row}</div>

              {/* Wells */}
              {COL_LABELS.map((col, cIdx) => {
                const { position, sample } = grid[rIdx * COLS + cIdx];
                const isSelected = selectedPosition === position;

                return (
                  <button
                    key={position}
                    type="button"
                    onClick={() => openPosition(position, sample)}
                    aria-label={
                      sample
                        ? `Position ${position}, ${sample.status}, sample ${sample.sampleId}`
                        : `Empty position ${position}`
                    }
                    title={sample ? `${sample.sampleId} - ${sample.sampleType}` : `Empty position ${position}`}
                    className={[
                      'w-8 h-8 rounded-full border-2 transition-transform duration-150 hover:scale-110 focus:scale-110 outline-none',
                      sample ? `${getStatusColor(sample.status)} border-gray-300` : 'bg-gray-100 border-gray-300 hover:bg-gray-200',
                      isSelected ? 'ring-2 ring-primary' : '',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Sample details */}
      <Dialog open={!!selectedSample} onOpenChange={() => setSelectedSample(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sample Details{selectedSample ? ` — ${selectedSample.position}` : ''}</DialogTitle>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge variant={getStatusBadgeVariant(selectedSample.status)}>
                  {selectedSample.status.charAt(0).toUpperCase() + selectedSample.status.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Sample ID</label>
                  <p>{selectedSample.sampleId}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Patient ID</label>
                  <p>{selectedSample.patientId}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Sample Type</label>
                  <p>{selectedSample.sampleType}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Volume</label>
                  <p>{selectedSample.volume ?? '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Date Collected</label>
                  <p>{selectedSample.dateCollected}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Position</label>
                  <p>{selectedSample.position}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => console.log('Edit Sample', selectedSample.sampleId)}>
                  Edit Sample
                </Button>
                <Button variant="outline" size="sm" onClick={() => console.log('Move Sample', selectedSample.sampleId)}>
                  Move Sample
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportSampleCsv(selectedSample)}>
                  Export CSV
                </Button>
                <Button variant="destructive" size="sm" onClick={() => console.log('Remove Sample', selectedSample.sampleId)}>
                  Remove Sample
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
