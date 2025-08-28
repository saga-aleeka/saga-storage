import { useState, useEffect, useCallback, useRef } from 'react';

interface RealtimeSamplesProps {
  containerId: string;
  broadcastSampleUpdate?: (containerId: string, samples: SamplesState) => void;
  userId?: string;
  userName?: string;
}

/** A single sample entry (array storage shape) */
export interface SampleEntry {
  position: string;
  sampleId?: string;
  id?: string; // some imports may use `id` instead of `sampleId`
  [key: string]: any;
}

/** Map storage shape: position -> sample */
export type SamplesMap = Record<string, SampleEntry>;
/** Array storage shape */
export type SamplesArray = SampleEntry[];
/** Union of supported storage shapes */
export type SamplesState = SamplesArray | SamplesMap;

type SampleUpdateEventDetail = {
  containerId: string;
  samples: SamplesState;
};

const isArrayStore = (val: unknown): val is SamplesArray =>
  Array.isArray(val);

const isMapStore = (val: unknown): val is SamplesMap =>
  !!val && typeof val === 'object' && !Array.isArray(val);

/** Extract a sample's identifier across shapes/keys */
const getAnySampleId = (s: SampleEntry | undefined | null): string | undefined =>
  s?.sampleId ?? s?.id;

/** Coerce arbitrary parsed data into a supported SamplesState (array or map).
 *  If it's an object, assume map; if it's an array, pass through; otherwise return empty map.
 */
const coerceSamples = (data: unknown): SamplesState => {
  if (isArrayStore(data)) return data;
  if (isMapStore(data)) return data as SamplesMap;
  return {};
};

export function useRealtimeSamples({
  containerId,
  broadcastSampleUpdate,
}: RealtimeSamplesProps) {
  const [samples, setSamples] = useState<SamplesState>({});
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const samplesRef = useRef<SamplesState>({});
  const storageKey = `samples-${containerId}`;

  // Load samples from localStorage
  const loadSamples = useCallback((): SamplesState => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = coerceSamples(parsed);
        setSamples(normalized);
        samplesRef.current = normalized;
        return normalized;
      }
    } catch (error) {
      console.error('Error loading samples:', error);
    }
    // default to an object map so position lookups are O(1)
    setSamples({});
    samplesRef.current = {};
    return {};
  }, [storageKey]);

  // Save samples to localStorage and broadcast
  const saveSamples = useCallback(
    (newSamples: SamplesState, shouldBroadcast = true) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newSamples));
        setSamples(newSamples);
        samplesRef.current = newSamples;
        setLastUpdate(Date.now());

        if (shouldBroadcast && broadcastSampleUpdate) {
          broadcastSampleUpdate(containerId, newSamples);
        }
      } catch (error) {
        console.error('Error saving samples:', error);
      }
    },
    [storageKey, containerId, broadcastSampleUpdate]
  );

  // Handle external sample updates (custom event from your BroadcastChannel bridge)
  useEffect(() => {
    const handleSampleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<SampleUpdateEventDetail>).detail;
      if (!detail) return;
      const { containerId: updatedContainerId, samples: updatedSamples } = detail;
      if (updatedContainerId === containerId) {
        // Update without re-broadcasting (avoid loops)
        const normalized = coerceSamples(updatedSamples);
        setSamples(normalized);
        samplesRef.current = normalized;
        setLastUpdate(Date.now());
      }
    };

    window.addEventListener('plasma-sample-update', handleSampleUpdate as EventListener);
    return () => window.removeEventListener('plasma-sample-update', handleSampleUpdate as EventListener);
  }, [containerId]);

  // Also react to cross-tab localStorage changes (in case BroadcastChannel isn't available)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : {};
          const normalized = coerceSamples(parsed);
          setSamples(normalized);
          samplesRef.current = normalized;
          setLastUpdate(Date.now());
        } catch (err) {
          console.error('Failed to parse storage event data:', err);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  // Load on mount / containerId change
  useEffect(() => {
    loadSamples();
  }, [loadSamples]);

  // --- Mutators -------------------------------------------------------------

  // Add sample with optimistic update
  const addSample = useCallback(
    (sampleData: SampleEntry) => {
      const curr = samplesRef.current;

      let next: SamplesState;
      if (isArrayStore(curr)) {
        next = [...curr, sampleData];
      } else {
        // map store (preferred)
        next = { ...(curr as SamplesMap), [sampleData.position]: sampleData };
      }

      saveSamples(next);
      return next;
    },
    [saveSamples]
  );

  // Remove sample by sampleId (or id)
  const removeSample = useCallback(
    (sampleId: string) => {
      const curr = samplesRef.current;

      let next: SamplesState;
      if (isArrayStore(curr)) {
        next = curr.filter((s) => getAnySampleId(s) !== sampleId);
      } else {
        const map = { ...(curr as SamplesMap) };
        for (const [pos, s] of Object.entries(map)) {
          if (getAnySampleId(s) === sampleId) {
            delete map[pos];
            break;
          }
        }
        next = map;
      }

      saveSamples(next);
      return next;
    },
    [saveSamples]
  );

  // Update sample by sampleId (or id)
  const updateSample = useCallback(
    (sampleId: string, updateData: Partial<SampleEntry>) => {
      const curr = samplesRef.current;

      let next: SamplesState;
      if (isArrayStore(curr)) {
        next = curr.map((s) => (getAnySampleId(s) === sampleId ? { ...s, ...updateData } : s));
      } else {
        const map = { ...(curr as SamplesMap) };
        for (const [pos, s] of Object.entries(map)) {
          if (getAnySampleId(s) === sampleId) {
            map[pos] = { ...s, ...updateData };
            break;
          }
        }
        next = map;
      }

      saveSamples(next);
      return next;
    },
    [saveSamples]
  );

  // Upsert at a specific position (replace whatever is there)
  const upsertSampleAtPosition = useCallback(
    (position: string, sampleData: SampleEntry) => {
      const curr = samplesRef.current;

      let next: SamplesState;
      if (isArrayStore(curr)) {
        const existingIdx = curr.findIndex((s) => s.position === position);
        if (existingIdx >= 0) {
          next = curr.map((s, i) => (i === existingIdx ? { ...s, ...sampleData, position } : s));
        } else {
          next = [...curr, { ...sampleData, position }];
        }
      } else {
        const map = { ...(curr as SamplesMap) };
        map[position] = { ...sampleData, position };
        next = map;
      }

      saveSamples(next);
      return next;
    },
    [saveSamples]
  );

  // Move a sample to a new position (by sampleId/id)
  const moveSample = useCallback(
    (sampleId: string, toPosition: string) => {
      const curr = samplesRef.current;

      if (isArrayStore(curr)) {
        const idx = curr.findIndex((s) => getAnySampleId(s) === sampleId);
        if (idx < 0) return curr;
        const moved = { ...curr[idx], position: toPosition };
        const next = curr.map((s, i) => (i === idx ? moved : s));
        saveSamples(next);
        return next;
      } else {
        const map = { ...(curr as SamplesMap) };
        let foundKey: string | undefined;
        for (const [pos, s] of Object.entries(map)) {
          if (getAnySampleId(s) === sampleId) {
            foundKey = pos;
            break;
          }
        }
        if (!foundKey) return map;
        const sample = { ...map[foundKey], position: toPosition };
        delete map[foundKey];
        map[toPosition] = sample;
        saveSamples(map);
        return map;
      }
    },
    [saveSamples]
  );

  // Clear all samples
  const clearSamples = useCallback(() => {
    saveSamples(isArrayStore(samplesRef.current) ? [] : {});
  }, [saveSamples]);

  // --- Queries --------------------------------------------------------------

  // Get sample count
  const getSampleCount = useCallback(() => {
    const curr = samplesRef.current;
    if (isArrayStore(curr)) return curr.length;
    if (isMapStore(curr)) return Object.keys(curr).length;
    return 0;
  }, []);

  // Check if position is occupied
  const isPositionOccupied = useCallback((position: string) => {
    const curr = samplesRef.current;
    if (isArrayStore(curr)) return curr.some((s) => s.position === position);
    if (isMapStore(curr)) return position in (curr as SamplesMap);
    return false;
  }, []);

  // Get sample at position
  const getSampleAtPosition = useCallback((position: string) => {
    const curr = samplesRef.current;
    if (isArrayStore(curr)) return curr.find((s) => s.position === position) ?? null;
    if (isMapStore(curr)) return (curr as SamplesMap)[position] ?? null;
    return null;
  }, []);

  // Convenience: get all occupied positions (fast path for map store)
  const getOccupiedPositions = useCallback((): string[] => {
    const curr = samplesRef.current;
    if (isArrayStore(curr)) return curr.map((s) => s.position);
    if (isMapStore(curr)) return Object.keys(curr as SamplesMap);
    return [];
  }, []);

  return {
    samples,
    addSample,
    removeSample,
    updateSample,
    upsertSampleAtPosition,
    moveSample,
    clearSamples,
    getSampleCount,
    isPositionOccupied,
    getSampleAtPosition,
    getOccupiedPositions,
    lastUpdate,
    refresh: loadSamples,
  };
}
