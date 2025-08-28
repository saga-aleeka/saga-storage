import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Thermometer,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  GraduationCap,
  Users,
  Eye,
  Edit3,
  Scan,
  Lock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getSampleTypeColor, getGridDimensions } from './PlasmaContainerList';
import type { PlasmaContainer } from './PlasmaContainerList';
import { UserActivity } from './RealtimeSync';
import { useRealtimeSamples } from './useRealtimeSamples';

interface ContainerCardProps {
  container: PlasmaContainer;
  onSelect: (container: PlasmaContainer) => void;
  onEdit?: (container: PlasmaContainer) => void;
  onDelete?: (container: PlasmaContainer) => void;
  onArchive?: (container: PlasmaContainer) => void;
  onRestore?: (container: PlasmaContainer) => void;
  onToggleTraining?: (container: PlasmaContainer) => void;

  // Real-time collaboration props
  userActivities?: UserActivity[];
  lockedBy?: { userId: string; userName: string };
  isOnline?: boolean;
  broadcastUserActivity?: (containerId: string, action: UserActivity['action']) => void;
  broadcastSampleUpdate?: (containerId: string, samples: any) => void;
  userId?: string;
  userName?: string;
}

export function ContainerCard({
  container,
  onSelect,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onToggleTraining,
  userActivities = [],
  lockedBy,
  isOnline = true,
  broadcastUserActivity,
  broadcastSampleUpdate,
  userId,
  userName,
}: ContainerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [liveOccupiedSlots, setLiveOccupiedSlots] = useState(container.occupiedSlots);

  // Real-time sample count
  const { getSampleCount } = useRealtimeSamples({
    containerId: container.id,
    broadcastSampleUpdate,
    userId,
    userName,
  });

  useEffect(() => {
    const updateSampleCount = () => {
      setLiveOccupiedSlots(getSampleCount());
    };

    // initial and periodic updates
    updateSampleCount();
    const handleSampleUpdate = (event: Event) => {
      const e = event as CustomEvent<{ containerId?: string }>;
      if (e.detail?.containerId === container.id) updateSampleCount();
    };
    window.addEventListener('plasma-sample-update', handleSampleUpdate as EventListener);
    const interval = setInterval(updateSampleCount, 5000);

    return () => {
      window.removeEventListener('plasma-sample-update', handleSampleUpdate as EventListener);
      clearInterval(interval);
    };
  }, [container.id, getSampleCount]);

  // Activities (dedup by user)
  const containerActivities = useMemo(
    () => userActivities.filter((a) => a.containerId === container.id),
    [userActivities, container.id]
  );

  const uniqueActivitiesByUser = useMemo(() => {
    const map = new Map<string, UserActivity>();
    for (const a of containerActivities) {
      if (!map.has(a.userId)) map.set(a.userId, a);
    }
    return Array.from(map.values());
  }, [containerActivities]);

  const activeUsers = uniqueActivitiesByUser.length;

  // Lock status (hide lock if it's me)
  const isLockedBySomeoneElse = !!lockedBy && lockedBy.userId !== userId;

  // Capacity math with guards
  const totalSlots = Math.max(1, getGridDimensions(container.containerType, container.sampleType).total || 0);
  const rawPct = (liveOccupiedSlots / totalSlots) * 100;
  const pctCapped = Math.min(100, Math.max(0, Math.round(rawPct)));

  const occupancyVariant: 'default' | 'secondary' | 'destructive' =
    pctCapped === 100 ? 'destructive' : pctCapped >= 80 ? 'secondary' : 'default';

  const occupancyLabel =
    pctCapped === 100 ? 'Full' : pctCapped >= 80 ? 'Nearly Full' : pctCapped >= 50 ? 'Half Full' : 'Available';

  // Broadcast viewing throttled
  const lastViewSentRef = useRef(0);
  const VIEW_THROTTLE_MS = 5000;
  const sendViewing = () => {
    const now = Date.now();
    if (now - lastViewSentRef.current >= VIEW_THROTTLE_MS) {
      broadcastUserActivity?.(container.id, 'viewing');
      lastViewSentRef.current = now;
    }
  };
  useEffect(() => {
    lastViewSentRef.current = 0;
  }, [container.id]);

  const handleContainerClick = () => {
    sendViewing();
    onSelect(container);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      broadcastUserActivity?.(container.id, 'editing');
      onEdit(container);
    }
  };

  const getUserInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getActivityIcon = (action: UserActivity['action']) => {
    switch (action) {
      case 'viewing':
        return <Eye className="h-3 w-3" />;
      case 'editing':
        return <Edit3 className="h-3 w-3" />;
      case 'scanning':
        return <Scan className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const topAvatars = uniqueActivitiesByUser.slice(0, 3);

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${container.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleContainerClick();
        }
      }}
      className={`cursor-pointer transition-all duration-200 hover:shadow-md relative ${
        isHovered ? 'ring-2 ring-primary/20' : ''
      } ${isLockedBySomeoneElse ? 'ring-2 ring-orange-200 bg-orange-50/50' : ''} ${!isOnline ? 'opacity-75' : ''}`}
      onMouseEnter={() => {
        setIsHovered(true);
        sendViewing();
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleContainerClick}
    >
      {/* Online/Offline indicator */}
      <div className="absolute top-2 right-2 z-10">
        {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
      </div>

      {/* Lock indicator (other user) */}
      {isLockedBySomeoneElse && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
            <Lock className="h-3 w-3" />
            <span>{lockedBy!.userName}</span>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{container.name}</CardTitle>
            <CardDescription className="truncate">{container.location}</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Active users indicator */}
            {activeUsers > 0 && (
              <div className="flex items-center gap-1">
                {topAvatars.map((activity) => (
                  <div key={activity.userId} className="relative">
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-xs">{getUserInitials(activity.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      {getActivityIcon(activity.action)}
                    </div>
                  </div>
                ))}
                {uniqueActivitiesByUser.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{uniqueActivitiesByUser.length - 3}</div>
                )}
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={handleEditClick} disabled={isLockedBySomeoneElse}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onToggleTraining && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTraining(container);
                    }}
                    disabled={isLockedBySomeoneElse}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    {container.isTraining ? 'Remove Training' : 'Mark as Training'}
                  </DropdownMenuItem>
                )}
                {onArchive && !container.isArchived && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(container);
                    }}
                    disabled={isLockedBySomeoneElse}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                {onRestore && container.isArchived && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(container);
                    }}
                  >
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(container);
                    }}
                    className="text-destructive"
                    disabled={isLockedBySomeoneElse}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-blue-500" />
            <span className="text-sm">{container.temperature}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {container.containerType.replace('-', ' ')}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Capacity</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {liveOccupiedSlots}/{totalSlots}
              </span>
              {liveOccupiedSlots !== container.occupiedSlots && (
                <div className="flex items-center gap-1 text-xs text-green-600" aria-live="polite">
                  <Wifi className="h-3 w-3" />
                  Live
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                pctCapped === 100 ? 'bg-red-500' : pctCapped >= 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${pctCapped}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={occupancyVariant} className="text-xs">
              {occupancyLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">{pctCapped}% full</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={`text-xs ${getSampleTypeColor(container.sampleType)}`}>{container.sampleType}</Badge>

          {container.isTraining && (
            <Badge className="text-xs bg-training text-training-foreground">
              <GraduationCap className="w-3 h-3 mr-1" />
              Training
            </Badge>
          )}

          {container.isArchived && (
            <Badge className="text-xs bg-archive text-archive-foreground">
              <Archive className="w-3 h-3 mr-1" />
              Archived
            </Badge>
          )}
        </div>

        {(activeUsers > 0 || isLockedBySomeoneElse) && (
          <div className="pt-2 border-t">
            {isLockedBySomeoneElse ? (
              <div className="text-xs text-orange-600 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Being edited by {lockedBy!.userName}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {activeUsers} active {activeUsers === 1 ? 'user' : 'users'}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">Last updated: {container.lastUpdated}</div>
      </CardContent>
    </Card>
  );
}
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
      {/* ...header unchanged... */}

      <div className="space-y-3">
        {/* Sample Type row unchanged */}

        <div className="flex justify-between items-center">
          <span className="text-sm">Occupancy</span>
          <div className="flex items-center gap-2">
            <Badge variant={getOccupancyColor(effectiveOccupied, effectiveTotalSlots)}>
              {effectiveOccupied}/{effectiveTotalSlots}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {getOccupancyStatus(effectiveOccupied, effectiveTotalSlots)}
            </span>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              container.isArchived
                ? 'bg-archive'
                : container.isTraining
                ? 'bg-training'
                : 'bg-primary'
            }`}
            style={{
              width: `${Math.min(100, (effectiveOccupied / effectiveTotalSlots) * 100)}%`,
            }}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Last updated: {container.lastUpdated}
        </div>
      </div>
    </Card>
  );
}
