import React, { useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { StorageContainer } from "./StorageDashboard";

type WellStatus = "sample" | "control" | "blank" | "empty";
type WellResult = "positive" | "negative" | "inconclusive";

interface Well {
  position: string;
  sampleId?: string;
  concentration?: string;
  absorbance?: number;
  status: WellStatus;
  result?: WellResult;
}

const mockWells: Well[] = [
  { position: "A1", sampleId: "S001", concentration: "100μg/ml", absorbance: 0.85, status: "sample", result: "positive" },
  { position: "A2", sampleId: "S002", concentration: "50μg/ml", absorbance: 0.42, status: "sample", result: "negative" },
  { position: "A3", sampleId: "S003", concentration: "200μg/ml", absorbance: 1.23, status: "sample", result: "positive" },
  { position: "H1", concentration: "0μg/ml", absorbance: 0.05, status: "blank" },
  { position: "H2", sampleId: "PC001", concentration: "150μg/ml", absorbance: 0.95, status: "control", result: "positive" },
  { position: "H3", sampleId: "NC001", concentration: "0μg/ml", absorbance: 0.08, status: "control", result: "negative" },
];

interface MicroPlateProps {
  container: StorageContainer;
}

const ROWS = 8;
const COLS = 12;
const ROW_LABELS = Array.from({ length: ROWS }, (_, i) => String.fromCharCode(65 + i)); // A..H
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String(i + 1));

export function MicroPlate({ container }: MicroPlateProps) {
  const [selectedWell, setSelectedWell] = useState<Well | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  // Build a full 96-well grid and merge in any mock data
  const wells = useMemo(() => {
    const byPos = new Map<string, Well>(mockWells.map((w) => [w.position, w]));
    const grid: Well[] = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pos = `${String.fromCharCode(65 + r)}${c + 1}`;
        grid.push(byPos.get(pos) ?? { position: pos, status: "empty" });
      }
    }
    return grid;
  }, []);

  const getWellColor = (well: Well) => {
    if (well.status === "empty") return "bg-gray-100";
    switch (well.status) {
      case "sample":
        if (well.result === "positive") return "bg-red-400";
        if (well.result === "negative") return "bg-green-400";
        if (well.result === "inconclusive") return "bg-yellow-400";
        return "bg-blue-400";
      case "control":
        return "bg-purple-400";
      case "blank":
        return "bg-gray-300";
      default:
        return "bg-gray-100";
    }
  };

  const openWell = (well: Well) => {
    setSelectedPosition(well.position);
    setSelectedWell(well);
  };

  const exportSelectedWellCsv = (well: Well) => {
    const headers = ["Position", "Status", "Sample ID", "Concentration", "Absorbance", "Result"];
    const row = [
      well.position,
      well.status,
      well.sampleId ?? "",
      well.concentration ?? "",
      well.absorbance != null ? String(well.absorbance) : "",
      well.result ?? "",
    ];
    const csv = `${headers.join(",")}\n${row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `well-${well.position}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick counts for the legend
  const counts = useMemo(() => {
    const base = { sample: 0, control: 0, blank: 0, empty: 0 };
    wells.forEach((w) => (base[w.status] += 1));
    return base;
  }, [wells]);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2>Microplate Overview</h2>
          <div className="flex gap-2">
            <Badge variant="outline">
              {container.occupied}/{container.capacity} wells
            </Badge>
            <Badge variant="outline">{container.temperature}</Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 rounded" />
            <span>Sample ({counts.sample})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-400 rounded" />
            <span>Control ({counts.control})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <span>Blank ({counts.blank})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded" />
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded" />
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
            <span>Empty ({counts.empty})</span>
          </div>
        </div>
      </Card>

      {/* 96-well plate */}
      <Card className="p-4">
        <h3 className="mb-4">96-Well Plate</h3>

        <div className="flex flex-col gap-1">
          {/* Column labels */}
          <div className="flex gap-1 mb-2">
            <div className="w-6 h-6" />
            {COL_LABELS.map((c) => (
              <div key={c} className="w-6 h-6 flex items-center justify-center text-xs font-medium">
                {c}
              </div>
            ))}
          </div>

          {/* Rows */}
          {ROW_LABELS.map((rowLabel, rIdx) => (
            <div key={rowLabel} className="flex gap-1">
              {/* Row label */}
              <div className="w-6 h-6 flex items-center justify-center text-xs font-medium">{rowLabel}</div>

              {/* Wells */}
              {COL_LABELS.map((cLabel, cIdx) => {
                const position = `${rowLabel}${cLabel}`;
                const well = wells[rIdx * COLS + cIdx];

                return (
                  <button
                    key={position}
                    type="button"
                    aria-label={`Well ${position} ${well.status}${well.sampleId ? `, sample ${well.sampleId}` : ""}`}
                    className={[
                      "w-6 h-6 rounded border transition-transform duration-150 hover:scale-110 focus:scale-110 outline-none",
                      getWellColor(well),
                      selectedPosition === position ? "ring-2 ring-primary" : "",
                    ].join(" ")}
                    onClick={() => openWell(well)}
                    title={well.sampleId ? `${well.sampleId} - ${well.status}` : `${position} - ${well.status}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Well details */}
      <Dialog open={!!selectedWell} onOpenChange={() => setSelectedWell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Well Details{selectedWell ? ` — ${selectedWell.position}` : ""}</DialogTitle>
          </DialogHeader>

          {selectedWell && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge variant="outline">
                  {selectedWell.status.charAt(0).toUpperCase() + selectedWell.status.slice(1)}
                </Badge>
              </div>

              {selectedWell.status !== "empty" && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedWell.sampleId && (
                    <div>
                      <label className="text-sm text-muted-foreground">Sample ID</label>
                      <p>{selectedWell.sampleId}</p>
                    </div>
                  )}
                  {selectedWell.concentration && (
                    <div>
                      <label className="text-sm text-muted-foreground">Concentration</label>
                      <p>{selectedWell.concentration}</p>
                    </div>
                  )}
                  {selectedWell.absorbance !== undefined && (
                    <div>
                      <label className="text-sm text-muted-foreground">Absorbance</label>
                      <p>{Number.isFinite(selectedWell.absorbance) ? selectedWell.absorbance.toFixed(3) : "—"}</p>
                    </div>
                  )}
                  {selectedWell.result && (
                    <div>
                      <label className="text-sm text-muted-foreground">Result</label>
                      <Badge variant={selectedWell.result === "positive" ? "destructive" : "default"}>
                        {selectedWell.result.charAt(0).toUpperCase() + selectedWell.result.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => console.log("Edit well", selectedWell.position)}>
                  Edit Well
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportSelectedWellCsv(selectedWell)}>
                  Export Data
                </Button>
                {selectedWell.status !== "empty" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      // Placeholder; wire to your clearing logic if needed
                      console.log("Clear well", selectedWell.position);
                    }}
                  >
                    Clear Well
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
