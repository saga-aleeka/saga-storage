import React, { useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { StorageContainer } from './StorageDashboard';

type ItemStatus = 'stored' | 'expired' | 'quarantine' | 'empty';
type Priority = 'high' | 'medium' | 'low';

interface StoredItem {
  position: string;
  sampleId?: string;
  patientId?: string;
  sampleType?: string;
  storageDate?: string; // YYYY-MM-DD
  expiryDate?: string;  // YYYY-MM-DD
  status: ItemStatus;
  priority?: Priority;
}

const mockStoredItems: StoredItem[] = [
  { position: 'A1', sampleId: 'DNA001', patientId: 'P12345', sampleType: 'DNA Extract', storageDate: '2025-08-10', expiryDate: '2026-08-10', status: 'stored', priority: 'high' },
  { position: 'A2', sampleId: 'RNA002', patientId: 'P12346', sampleType: 'RNA Extract', storageDate: '2025-08-12', expiryDate: '2025-12-12', status: 'stored', priority: 'medium' },
  { position: 'A3', sampleId: 'PRT003', patientId: 'P12347', sampleType: 'Protein', storageDate: '2025-07-15', expiryDate: '2025-07-30', status: 'expired', priority: 'low' },
  { position: 'B1', sampleId: 'QUA004', patientId: 'P12348', sampleType: 'Serum', storageDate: '2025-08-13', expiryDate: '2026-02-13', status: 'quarantine', priority: 'high' },
];

interface StorageBoxProps {
  container: StorageContainer;
}

const ROWS = 9;
const COLS = 9;
const ROW_LABELS = Array.from({ length: ROWS }, (_, i) => String.fromCharCode(65 + i)); // A..I
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String(i + 1));

function getItemColor(item: StoredItem) {
  switch (item.status) {
    case 'stored':
      if (item.priority === 'high') return 'bg-blue-600';
      if (item.priority === 'medium') return 'bg-blue-400';
      return 'bg-blue-300';
    case 'expired':
      return 'bg-red-500';
    case 'quarantine':
      return 'bg-yellow-500';
    case 'empty':
    default:
      return 'bg-gray-100';
  }
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  // Compare dates by day (avoid timezone ms drift)
  const toUTC = (dt: Date) => Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffMs = toUTC(d) - toUTC(now);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(expiryDate?: string): boolean {
  const days = daysUntil(expiryDate);
  return typeof days === 'number' && days <= 30 && days > 0;
}

export function StorageBox({ container }: StorageBoxProps) {
  const [selectedItem, setSelectedItem] = useState<StoredItem | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  // Build a full 9×9 grid merged with any provided items
  const items = useMemo(() => {
    const byPos = new Map<string, StoredItem>(mockStoredItems.map((i) => [i.position, i]));
    const grid: StoredItem[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pos = `${String.fromCharCode(65 + r)}${c + 1}`;
        grid.push(byPos.get(pos) ?? { position: pos, status: 'empty' });
      }
    }
    return grid;
  }, []);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2>Storage Box Overview</h2>
          <div className="flex gap-2">
            <Badge variant="outline">
              {container.occupied}/{container.capacity} positions
            </Badge>
            <Badge variant="outline">{container.temperature}</Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded" />
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 rounded" />
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-300 rounded" />
            <span>Low Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded" />
            <span>Quarantine</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span>Expired</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
            <span>Empty</span>
          </div>
        </div>
      </Card>

      {/* Grid */}
      <Card className="p-4">
        <h3 className="mb-4">9×9 Storage Grid</h3>

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
          {ROW_LABELS.map((rowLabel, rIdx) => (
            <div key={rowLabel} className="flex gap-1">
              {/* Row label */}
              <div className="w-8 h-8 flex items-center justify-center text-xs font-medium">{rowLabel}</div>

              {/* Cells */}
              {COL_LABELS.map((cLabel, cIdx) => {
                const position = `${rowLabel}${cLabel}`;
                const item = items[rIdx * COLS + cIdx];
                const expSoon = isExpiringSoon(item.expiryDate);

                return (
                  <button
                    key={position}
                    type="button"
                    aria-label={
                      item.sampleId
                        ? `${position} ${item.status}${item.priority ? `, ${item.priority} priority` : ''}, sample ${item.sampleId}`
                        : `Empty position ${position}`
                    }
                    title={item.sampleId ? `${item.sampleId} — ${item.sampleType ?? 'Sample'}` : `Empty position ${position}`}
                    className={[
                      'w-8 h-8 rounded border-2 transition-transform duration-150 hover:scale-110 focus:scale-110 outline-none relative',
                      getItemColor(item),
                      selectedPosition === position ? 'ring-2 ring-primary' : '',
                      expSoon ? 'border-orange-400' : 'border-gray-300',
                    ].join(' ')}
                    onClick={() => {
                      setSelectedPosition(position);
                      setSelectedItem(item);
                    }}
                  >
                    {expSoon && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full text-[10px] leading-3 text-white flex items-center justify-center">
                        !
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Details dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Storage Position — {selectedItem?.position}</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <div className="flex gap-2">
                  <Badge
                    variant={
                      selectedItem.status === 'expired'
                        ? 'destructive'
                        : selectedItem.status === 'quarantine'
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                  </Badge>
                  {selectedItem.priority && (
                    <Badge variant="outline">
                      {selectedItem.priority.charAt(0).toUpperCase() + selectedItem.priority.slice(1)} Priority
                    </Badge>
                  )}
                </div>
              </div>

              {selectedItem.status !== 'empty' && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedItem.sampleId && (
                    <div>
                      <label className="text-sm text-muted-foreground">Sample ID</label>
                      <p>{selectedItem.sampleId}</p>
                    </div>
                  )}
                  {selectedItem.patientId && (
                    <div>
                      <label className="text-sm text-muted-foreground">Patient ID</label>
                      <p>{selectedItem.patientId}</p>
                    </div>
                  )}
                  {selectedItem.sampleType && (
                    <div>
                      <label className="text-sm text-muted-foreground">Sample Type</label>
                      <p>{selectedItem.sampleType}</p>
                    </div>
                  )}
                  {selectedItem.storageDate && (
                    <div>
                      <label className="text-sm text-muted-foreground">Storage Date</label>
                      <p>{selectedItem.storageDate}</p>
                    </div>
                  )}
                  {selectedItem.expiryDate && (
                    <div>
                      <label className="text-sm text-muted-foreground">Expiry Date</label>
                      <div className="flex items-center gap-2">
                        <p>{selectedItem.expiryDate}</p>
                        {isExpiringSoon(selectedItem.expiryDate) && (
                          <Badge variant="secondary" className="text-xs">
                            Expires Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => console.log('Edit Sample', selectedItem.position)}>
                  Edit Sample
                </Button>
                <Button variant="outline" size="sm" onClick={() => console.log('Move Sample', selectedItem.position)}>
                  Move Sample
                </Button>
                {selectedItem.status !== 'empty' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => console.log('Remove Sample', selectedItem.position)}
                  >
                    Remove Sample
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
