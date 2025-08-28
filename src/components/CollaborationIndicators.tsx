import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Card, CardContent } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Users, Eye, Edit3, Scan, Clock, Wifi, WifiOff } from 'lucide-react';
import type { UserActivity } from './RealtimeSync';

interface CollaborationIndicatorsProps {
  userActivities: UserActivity[];
  currentContainerId?: string;
  lockedBy?: { userId: string; userName: string };
  isOnline?: boolean;
  className?: string;
  currentUserId?: string; // optional, for “(you)”
}

export function CollaborationIndicators({ 
  userActivities, 
  currentContainerId,
  lockedBy,
  isOnline = true,
  className = '',
  currentUserId,
}: CollaborationIndicatorsProps) {
  const [timeNow, setTimeNow] = useState(() => Date.now());

  // Tick every 10s for relative times
  useEffect(() => {
    const id = setInterval(() => setTimeNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const getUserInitials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || '?';

  const getActivityIcon = (action: UserActivity['action']) =>
    action === 'viewing' ? <Eye className="h-3 w-3" /> :
    action === 'editing' ? <Edit3 className="h-3 w-3" /> :
    action === 'scanning' ? <Scan className="h-3 w-3" /> : <Users className="h-3 w-3" />;

  const getActivityColor = (action: UserActivity['action']) =>
    action === 'viewing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
    action === 'editing' ? 'bg-orange-100 text-orange-800 border-orange-200' :
    action === 'scanning' ? 'bg-green-100 text-green-800 border-green-200' :
    'bg-gray-100 text-gray-800 border-gray-200';

  const formatTimeAgo = (ts: number) => {
    const delta = Math.max(0, Math.floor((timeNow - ts) / 1000)); // clamp
    if (delta < 60) return 'just now';
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    return `${Math.floor(delta / 3600)}h ago`;
  };

  // Compute the list once per dependency set
  const relevantActivities = useMemo(() => {
    const base = currentContainerId
      ? userActivities.filter(a => a.containerId === currentContainerId)
      : [...userActivities].sort((a, b) => b.timestamp - a.timestamp);

    // Dedupe: keep latest per (userId, containerId)
    const map = new Map<string, UserActivity>();
    for (const a of base) {
      const key = `${a.userId}::${a.containerId}`;
      const prev = map.get(key);
      if (!prev || prev.timestamp < a.timestamp) map.set(key, a);
    }
    const arr = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    return currentContainerId ? arr : arr.slice(0, 5);
  }, [userActivities, currentContainerId]);

  if (relevantActivities.length === 0 && !lockedBy) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span>No active collaborators</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span>Offline mode</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-2" aria-live="polite">
        {isOnline ? (
          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
            <Wifi className="h-3 w-3 mr-1" />
            Live
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        )}
      </div>

      {/* Container Lock Indicator */}
      {lockedBy && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                <strong>
                  {lockedBy.userName}
                  {currentUserId && lockedBy.userId === currentUserId ? ' (you)' : ''}
                </strong>{' '}
                is editing this container
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Users */}
      {relevantActivities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{currentContainerId ? 'Active on this container' : 'Recent activity'}</span>
          </div>

          {/* One provider for all tooltips */}
          <TooltipProvider delayDuration={150}>
            <div className="space-y-1">
              {relevantActivities.map((activity) => {
                const key = `${activity.userId}-${activity.containerId}-${activity.timestamp}`;
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(activity.userName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {activity.userName}
                              {currentUserId && activity.userId === currentUserId ? ' (you)' : ''}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getActivityColor(activity.action)}`}
                            >
                              {getActivityIcon(activity.action)}
                              {activity.action}
                            </Badge>
                          </div>
                          {!currentContainerId && (
                            <div className="text-xs text-muted-foreground truncate">
                              {activity.containerId}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(activity.timestamp)}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div><strong>{activity.userName}</strong></div>
                        <div>{activity.action} {activity.containerId}</div>
                        <div>{new Date(activity.timestamp).toLocaleString()}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
export function CollaborationPanel({ 
  userActivities, 
  isOnline,
  className = '' 
}: {
  userActivities: UserActivity[];
  isOnline?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeUsers = useMemo(
    () => new Set(userActivities.map(a => a.userId)).size,
    [userActivities]
  );

  if (activeUsers === 0 && isOnline) return null;

  const panelId = "collab-panel-details";

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex items-center gap-2 p-3 w-full text-left hover:bg-muted/50 transition-colors"
            aria-expanded={isExpanded}
            aria-controls={panelId}
          >
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">
                {activeUsers} {activeUsers === 1 ? 'user' : 'users'} active
              </span>
            </div>
          </button>

          {isExpanded && (
            <div id={panelId} className="border-t p-3 max-h-64 overflow-y-auto">
              <CollaborationIndicators 
                userActivities={userActivities}
                isOnline={isOnline}
                // You can pass currentContainerId or currentUserId here if desired
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
