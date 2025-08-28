// Types + simple grid helper the AdminDashboard expects.

export type ContainerType = '9x9-box' | '5x5-box' | '5x4-rack' | '9x9-rack';

export type SampleType =
  | 'DP Pools'
  | 'cfDNA Tubes'
  | 'DTC Tubes'
  | 'MNC Tubes'
  | 'PA Pool Tubes'
  | 'Plasma Tubes'
  | 'BC Tubes';

export interface PlasmaContainer {
  id: string;              // e.g. PB001
  name: string;            // human label (also used by your importer as containerId in grid CSV)
  location: string;        // freezer/rack description
  containerType: ContainerType;
  sampleType: SampleType;
  temperature: string;     // e.g. "-80°C"
  totalSlots: number;      // rows*cols
  occupiedSlots: number;   // how many positions are filled
  lastUpdated: string;     // "YYYY-MM-DD HH:mm" (as used in your code)
}

// Rows/cols by containerType (kept simple; adjust if you have special racks).
const LAYOUTS: Record<ContainerType, { rows: number; cols: number }> = {
  '9x9-box':  { rows: 9, cols: 9 },
  '5x5-box':  { rows: 5, cols: 5 },
  '5x4-rack': { rows: 5, cols: 4 },
  '9x9-rack': { rows: 9, cols: 9 },
};

export function getGridDimensions(
  containerType: ContainerType,
  _sampleType?: SampleType
) {
  const layout = LAYOUTS[containerType] ?? LAYOUTS['9x9-box'];
  return { ...layout, total: layout.rows * layout.cols };
}
