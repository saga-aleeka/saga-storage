"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Thermometer, AlertTriangle } from "lucide-react";
import {
  getGridDimensions,
} from "./PlasmaContainerList";
import type { PlasmaContainer } from "./PlasmaContainerList";

// ---- Types -----------------------------------------------------------------

type SlotStatus = "frozen" | "critical" | "thawed" | "empty";

interface FreezerSlot {
  position: string;
  sampleId?: string;
  patientId?: string; // optional for future
  sampleType?: string; // optional for future
  freezeDate?: string; // optional for future
  thawCycles?: number; // optional for future
  status: SlotStatus;
  temperature?: number; // °C (optional, if you track per-slot temps later)
  volume?: string; // optional
}

interface FreezerRackProps {
  container: PlasmaContainer | (Partial<PlasmaContainer> & Record<string, any>);
  // Optional callbacks if you want to wire buttons later
  onEditSample?: (slot: FreezerSlot) => void;
  onOpenTempLog?: (slot: FreezerSlot) => void;
  onRemoveSample?: (slot: FreezerSlot) => void;
}

// ---- Helpers ---------------------------------------------------------------

function parseTemperatureToNumber(tempString?: string): number | undefined {
  if (!tempString) return undefined;
  // Handles values like "-80°C", "-20 C", "RT"
  const n = Number(
    tempString
      .replace(/°/g, "")
      .replace(/[^\d.-]/g, "")
      .trim(),
  );
  return Number.isFinite(n) ? (n as number) : undefined;
}

function getTemperatureBadgeVariant(temp?: number) {
  if (typeof temp !== "number") return "outline" as const;
  if (temp > -70) return "destructive" as const; // critical
  if (temp > -75) return "secondary" as const;  // warning-ish
  return "outline" as const;                    // normal
}

function slotBgClass(status: SlotStatus) {
  switch (status) {
    case "frozen":
      return "bg-blue-600";
    case "critical":
      return "bg-orange-500";
    case "thawed":
      return "bg-red-600";
    case "empty":
    default:
      return "bg-gray-100";
  }
}

// ---- Component -------------------------------------------------------------

export function FreezerRack({
  container,
  onEditSample,
  onOpenTempLog,
  onRemoveSample,
}: FreezerRackProps) {
  const [selectedSlot, setSelectedSlot] = useState<FreezerSlot | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  // Derive grid size from the actual container type & sample type
  const dims = useMemo(
    () =>
      getGridDimensions(
        (container as PlasmaContainer).containerType,
        (container as PlasmaContainer).sampleType,
      ),
    [container],
  );

  // Try to read live samples from localStorage (same shape your Admin import writes)
  // Key: samples-<container.id>  =>  { [position]: { id: string, timestamp: string } }
  const samplesMap = useMemo<Record<string, { id: string; timestamp?: string }>>(
    () => {
      try {
        const key = `samples-${(container as PlasmaContainer).id}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
    [container],
  );

  // Fallback to support previous naming (occupied/capacity) or your current (occupiedSlots/totalSlots)
  const occupiedCount =
    (container as any).occupiedSlots ??
    (container as any).occupied ??
    Object.keys(samplesMap).length ??
    0;

  const totalCount =
    (container as any).totalSlots ??
    (container as any).capacity ??
    dims.total;

  const containerTempNumber = parseTemperatureToNumber(
    (container as PlasmaContainer).temperature,
  );

  // Build the full grid of slots, filling from samplesMap where present
  const slots: FreezerSlot[] = useMemo(() => {
    const s: FreezerSlot[] = [];
    for (let r = 0; r < dims.rows; r++) {
      for (let c = 0; c < dims.cols; c++) {
        const position = `${String.fromCharCode(65 + r)}${c + 1}`;
        const sample = samplesMap[position];

        // Basic status heuristic:
        // - if sample exists & container temp is OK -> "frozen"
        // - if sample exists & temp borderline -> "critical"
        // - if sample exists & temp warm -> "thawed"
        // - otherwise "empty"
        let status: SlotStatus = "empty";
        if (sample?.id) {
          if (typeof containerTempNumber !== "number") {
            status = "frozen";
          } else if (containerTempNumber > -70) {
            status = "critical";
          } else if (containerTempNumber > -65) {
            status = "thawed";
          } else {
            status = "frozen";
          }
        }

        s.push({
          position,
          sampleId: sample?.id,
          status,
        });
      }
    }
    return s;
  }, [dims, samplesMap, containerTempNumber]);

  const utilization = Math.max(
    0,
    Math.min(100, Math.round((occupiedCount / totalCount) * 100)),
  );

  return (
    <div className="space-y-6">
      {/* Header / Legend */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            <h2>Ultra-Low Freezer Rack</h2>
          </div>

        {/* Capacity + Temp */}
          <div className="flex gap-2">
            <Badge variant="outline">
              {occupiedCount}/{totalCount} slots
            </Badge>
            <Badge variant={getTemperatureBadgeVariant(containerTempNumber)}>
              {(container as PlasmaContainer).temperature ?? "N/A"}
            </Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded" />
            <span>Properly Frozen</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded" />
            <span>Temperature Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded" />
            <span>Thawed/Compromised</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
            <span>Empty</span>
          </div>
        </div>

        {/* Utilization bar (optional) */}
        <div className="mt-4">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                utilization === 100
                  ? "bg-red-500"
                  : utilization >= 80
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${utilization}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground text-right">
            {utilization}% full
          </div>
        </div>
      </Card>

      {/* Grid */}
      <Card className="p-4">
        <h3 className="mb-4">
          Freezer Rack Grid ({dims.rows}×{dims.cols})
        </h3>

        <div className="flex flex-col gap-2">
          {/* Column numbers */}
          <div className="flex gap-2 mb-2">
            <div className="w-12 h-12" />
            {Array.from({ length: dims.cols }, (_, i) => (
              <div
                key={i}
                className="w-12 h-12 flex items-center justify-center text-xs font-medium"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: dims.rows }, (_, row) => (
            <div key={row} className="flex gap-2">
              {/* Row label */}
              <div className="w-12 h-12 flex items-center justify-center text-xs font-medium">
                {String.fromCharCode(65 + row)}
              </div>

              {/* Cells */}
              {Array.from({ length: dims.cols }, (_, col) => {
                const position = `${String.fromCharCode(65 + row)}${col + 1}`;
                const slot = slots.find((s) => s.position === position)!;

                return (
                  <button
                    type="button"
                    key={position}
                    className={`w-12 h-12 rounded border-2 cursor-pointer transition-all duration-200 hover:scale-105 relative ${slotBgClass(
                      slot.status,
                    )} ${
                      selectedPosition === position ? "ring-2 ring-primary" : ""
                    } border-gray-300 flex items-center justify-center`}
                    onClick={() => {
                      setSelectedPosition(position);
                      setSelectedSlot(slot);
                    }}
                    title={
                      slot.sampleId
                        ? `${slot.sampleId} (${position})`
                        : `Empty slot ${position}`
                    }
                  >
                    {slot.status === "critical" && (
                      <AlertTriangle className="w-4 h-4 text-white" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Slot dialog */}
      <Dialog
        open={!!selectedSlot}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null);
            setSelectedPosition(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Freezer Slot{selectedSlot ? ` - ${selectedSlot.position}` : ""}
            </DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <div className="flex gap-2">
                  <Badge
                    variant={
                      selectedSlot.status === "critical" ||
                      selectedSlot.status === "thawed"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {selectedSlot.status
                      .charAt(0)
                      .toUpperCase()
                      .concat(selectedSlot.status.slice(1))}
                  </Badge>

                  {/* If you later track per-slot temps, show here. For now we reflect container temp */}
                  {typeof containerTempNumber === "number" && (
                    <Badge variant={getTemperatureBadgeVariant(containerTempNumber)}>
                      {containerTempNumber}°C
                    </Badge>
                  )}
                </div>
              </div>

              {selectedSlot.status !== "empty" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Sample ID
                    </label>
                    <p>{selectedSlot.sampleId}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Position
                    </label>
                    <p>{selectedSlot.position}</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  This position is currently empty.
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditSample?.(selectedSlot)}
                >
                  Edit Sample
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenTempLog?.(selectedSlot)}
                >
                  Temperature Log
                </Button>
                {selectedSlot.status !== "empty" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemoveSample?.(selectedSlot)}
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
