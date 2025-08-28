export interface SampleHistoryEntry {
  timestamp: string;
  action: 'check-in' | 'check-out' | 'moved' | 'accessed' | 'updated';
  user?: string;
  notes?: string;
  fromPosition?: string;
  toPosition?: string;
}

export interface PlasmaSample {
  position: string;
  sampleId: string;
  storageDate: string;
  lastAccessed?: string;
  history: SampleHistoryEntry[];
}