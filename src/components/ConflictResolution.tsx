import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Unlock,
  RefreshCw,
  Settings,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export interface ConflictEvent {
  id: string;
  timestamp: string;
  type: 'sample_conflict' | 'container_lock' | 'concurrent_edit' | 'data_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'escalated';
  containerId: string;
  position?: string;
  sampleId?: string;
  conflictingUsers: Array<{
    id: string;
    name: string;
    action: string;
    timestamp: string;
  }>;
  details: {
    description: string;
    originalValue?: any;
    conflictingValue?: any;
    affectedData?: Record<string, any>;
  };
  resolution?: {
    type: 'auto' | 'manual' | 'escalated';
    resolvedBy: string;
    resolvedAt: string;
    choice: 'accept_original' | 'accept_new' | 'merge' | 'custom';
    notes?: string;
  };
}

export interface ConflictLock {
  id: string;
  containerId: string;
  position?: string;
  userId: string;
  userName: string;
  lockType: 'edit' | 'scan' | 'move' | 'delete';
  acquiredAt: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

const CONFLICT_STORAGE_KEY = 'plasma-conflicts';
const LOCK_STORAGE_KEY = 'plasma-locks';

interface ConflictResolutionProps {
  currentUser?: string;
  onConflictResolved?: (conflict: ConflictEvent) => void;
  broadcastConflict?: (conflict: ConflictEvent) => void;
  broadcastLock?: (lock: ConflictLock) => void;
}

export function ConflictResolution({
  currentUser = 'System',
  onConflictResolved,
  broadcastConflict,
  broadcastLock
}: ConflictResolutionProps) {
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [activeLocks, setActiveLocks] = useState<ConflictLock[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictEvent | null>(null);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionChoice, setResolutionChoice] = useState<ConflictEvent['resolution']['choice']>('accept_new');

  // Load data on mount
  useEffect(() => {
    loadConflicts();
    loadLocks();
  }, []);

  // Listen for storage changes and broadcast events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCK_STORAGE_KEY) loadLocks();
      if (e.key === CONFLICT_STORAGE_KEY) loadConflicts();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onLockEvent = (ev: CustomEvent<ConflictLock>) => {
      const next = activeLocks
        .filter(l => !(l.containerId === ev.detail.containerId && l.position === ev.detail.position))
        .concat(ev.detail);
      saveLocks(next);
    };
    window.addEventListener('plasma-lock' as any, onLockEvent as EventListener);
    return () => window.removeEventListener('plasma-lock' as any, onLockEvent as EventListener);
  }, [activeLocks]);

  // Auto-cleanup expired locks
  useEffect(() => {
    const cleanup = () => {
      const now = new Date();
      const valid = activeLocks.filter(l => new Date(l.expiresAt) > now);
      if (valid.length !== activeLocks.length) saveLocks(valid);
    };
    const id = setInterval(cleanup, 5000);
    return () => clearInterval(id);
  }, [activeLocks]);

  const loadConflicts = () => {
    try {
      const saved = localStorage.getItem(CONFLICT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setConflicts(parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
    }
  };

  const loadLocks = () => {
    try {
      const saved = localStorage.getItem(LOCK_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = new Date();
          const validLocks = parsed.filter(lock => new Date(lock.expiresAt) > now);
          setActiveLocks(validLocks);
          
          // Clean up expired locks
          if (validLocks.length !== parsed.length) {
            localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(validLocks));
          }
        }
      }
    } catch (error) {
      console.error('Error loading locks:', error);
    }
  };

  const saveConflicts = (newConflicts: ConflictEvent[]) => {
    try {
      localStorage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(newConflicts));
      setConflicts(newConflicts);
    } catch (error) {
      console.error('Error saving conflicts:', error);
    }
  };

  const saveLocks = (newLocks: ConflictLock[]) => {
    try {
      localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(newLocks));
      setActiveLocks(newLocks);
    } catch (error) {
      console.error('Error saving locks:', error);
    }
  };

  const createConflict = (
    type: ConflictEvent['type'],
    containerId: string,
    details: ConflictEvent['details'],
    options: {
      position?: string;
      sampleId?: string;
      severity?: ConflictEvent['severity'];
      conflictingUsers?: ConflictEvent['conflictingUsers'];
    } = {}
  ): ConflictEvent => {
    const conflict: ConflictEvent = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      severity: options.severity || 'medium',
      status: 'active',
      containerId,
      position: options.position,
      sampleId: options.sampleId,
      conflictingUsers: options.conflictingUsers || [],
      details,
    };

    const updatedConflicts = [...conflicts, conflict];
    saveConflicts(updatedConflicts);

    // Broadcast if function provided
    if (broadcastConflict) {
      broadcastConflict(conflict);
    }

    return conflict;
  };

  const resolveConflict = (
    conflictId: string,
    resolution: Omit<ConflictEvent['resolution'], 'resolvedBy' | 'resolvedAt'>
  ) => {
    const updatedConflicts = conflicts.map(conflict => {
      if (conflict.id === conflictId) {
        const resolved: ConflictEvent = {
          ...conflict,
          status: 'resolved',
          resolution: {
            ...resolution,
            resolvedBy: currentUser,
            resolvedAt: new Date().toISOString()
          }
        };
        
        if (onConflictResolved) {
          onConflictResolved(resolved);
        }
        
        return resolved;
      }
      return conflict;
    });

    saveConflicts(updatedConflicts);
    toast.success('Conflict resolved successfully');
  };

  const forceReleaseLock = (containerId: string, position?: string) => {
    const updated = activeLocks.filter(
      l => !(l.containerId === containerId && l.position === position)
    );
    saveLocks(updated);
  };

  const createLock = (
    containerId: string,
    lockType: ConflictLock['lockType'],
    options: {
      position?: string;
      duration?: number; // minutes
      metadata?: Record<string, any>;
    } = {}
  ): ConflictLock => {
    const duration = options.duration || 30; // Default 30 minutes
    const lock: ConflictLock = {
      id: `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      containerId,
      position: options.position,
      userId: currentUser,
      userName: currentUser,
      lockType,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + duration * 60 * 1000).toISOString(),
      metadata: options.metadata
    };

    const updatedLocks = [...activeLocks, lock];
    saveLocks(updatedLocks);

    // Broadcast if function provided
    if (!broadcastLock) {
      window.dispatchEvent(new CustomEvent('plasma-lock', { detail: lock }));
    }

    return lock;
  };

  const handleResolveConflict = () => {
    if (!selectedConflict) return;

    resolveConflict(selectedConflict.id, {
      type: 'manual',
      choice: resolutionChoice,
      notes: resolutionNotes
    });

    setShowResolutionDialog(false);
    setSelectedConflict(null);
    setResolutionNotes('');
    setResolutionChoice('accept_new');
  };

  // Statistics
  const stats = useMemo(() => {
    const activeConflicts = conflicts.filter(c => c.status === 'active').length;
    const resolvedToday = conflicts.filter(c => {
      if (c.status !== 'resolved' || !c.resolution?.resolvedAt) return false;
      const d = new Date(c.resolution.resolvedAt);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate();
    }).length;

    return {
      activeConflicts,
      activeLocks: activeLocks.length,
      resolvedToday,
      totalConflicts: conflicts.length
    };
  }, [conflicts, activeLocks]);

  const getSeverityColor = (severity: ConflictEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: ConflictEvent['status']) => {
    switch (status) {
      case 'active': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'escalated': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Conflict Resolution
          </h2>
          <p className="text-muted-foreground">
            Manage conflicts and resource locks in the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadConflicts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-medium text-orange-600">{stats.activeConflicts}</p>
              <p className="text-sm text-muted-foreground">Active Conflicts</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-medium text-blue-600">{stats.activeLocks}</p>
              <p className="text-sm text-muted-foreground">Active Locks</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-medium text-green-600">{stats.resolvedToday}</p>
              <p className="text-sm text-muted-foreground">Resolved Today</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-medium">{stats.totalConflicts}</p>
              <p className="text-sm text-muted-foreground">Total Conflicts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Conflicts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Conflicts</CardTitle>
        </CardHeader>
        <CardContent>
          {conflicts.filter(c => c.status === 'active').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active conflicts</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflicts.filter(c => c.status === 'active').map((conflict) => (
                    <TableRow key={conflict.id}>
                      <TableCell className="text-xs">
                        {new Date(conflict.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(conflict.status)}
                          <span className="text-sm">{conflict.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{conflict.containerId}</p>
                          {conflict.position && (
                            <p className="text-xs text-muted-foreground">Position: {conflict.position}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getSeverityColor(conflict.severity)}`}>
                          {conflict.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="text-xs">{conflict.conflictingUsers.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedConflict(conflict);
                            setShowResolutionDialog(true);
                          }}
                        >
                          Resolve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Active Locks */}
      <Card>
        <CardHeader>
          <CardTitle>Active Resource Locks</CardTitle>
        </CardHeader>
        <CardContent>
          {activeLocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Unlock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active locks</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Container</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLocks.map((lock) => (
                    <TableRow key={lock.id}>
                      <TableCell className="font-medium">{lock.containerId}</TableCell>
                      <TableCell>{lock.position || 'All'}</TableCell>
                      <TableCell>{lock.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lock.lockType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(lock.expiresAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceReleaseLock(lock.containerId, lock.position)}
                        >
                          Release
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Conflict</DialogTitle>
            <DialogDescription>
              Choose how to resolve this conflict and provide any additional notes.
            </DialogDescription>
          </DialogHeader>
          
          {selectedConflict && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Conflict Details</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Type:</strong> {selectedConflict.type.replace('_', ' ')}</p>
                  <p><strong>Container:</strong> {selectedConflict.containerId}</p>
                  {selectedConflict.position && (
                    <p><strong>Position:</strong> {selectedConflict.position}</p>
                  )}
                  <p><strong>Description:</strong> {selectedConflict.details.description}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="resolution-choice">Resolution Choice</Label>
                <Select value={resolutionChoice} onValueChange={(value: any) => setResolutionChoice(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accept_original">Accept Original Value</SelectItem>
                    <SelectItem value="accept_new">Accept New Value</SelectItem>
                    <SelectItem value="merge">Merge Values</SelectItem>
                    <SelectItem value="custom">Custom Resolution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resolution-notes">Resolution Notes</Label>
                <Textarea
                  id="resolution-notes"
                  placeholder="Explain the resolution decision..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleResolveConflict} className="flex-1">
                  Resolve Conflict
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResolutionDialog(false);
                    setSelectedConflict(null);
                    setResolutionNotes('');
                    setResolutionChoice('accept_new');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}