import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { ScrollArea } from './ui/scroll-area';
import { 
  FileText, 
  Download, 
  Filter, 
  Search,
  CalendarIcon,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Audit log types
export type AuditAction = 
  | 'user_login' | 'user_logout' | 'user_created' | 'user_updated' | 'user_deleted'
  | 'container_created' | 'container_updated' | 'container_deleted' | 'container_archived'
  | 'sample_scanned' | 'sample_moved' | 'sample_removed' | 'sample_updated'
  | 'system_backup' | 'system_restore' | 'system_maintenance'
  | 'data_export' | 'data_import' | 'unauthorized_access'
  | 'role_assigned' | 'permission_changed';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entityType: 'user' | 'container' | 'sample' | 'system' | 'role';
  entityId: string;
  entityName?: string;
  details: {
    description: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    affectedItems?: Array<{ type: string; id: string; name: string }>;
    metadata?: Record<string, any>;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

const AUDIT_STORAGE_KEY = 'plasma-audit-logs';

// Helper function to create audit log entries
export function createAuditLog(
  action: AuditAction,
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  details: AuditLogEntry['details'],
  userInitials?: string,
  options: {
    entityName?: string;
    severity?: AuditLogEntry['severity'];
    success?: boolean;
    metadata?: Record<string, any>;
  } = {}
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId: userInitials || 'system',
    userName: userInitials || 'System',
    userRole: 'operator', // Default role
    action,
    entityType,
    entityId,
    entityName: options.entityName,
    details: {
      ...details,
      metadata: options.metadata
    },
    severity: options.severity || 'medium',
    success: options.success !== false,
    ipAddress: '127.0.0.1', // Placeholder
    userAgent: navigator.userAgent
  };

  // Save to localStorage
  try {
    const existing = localStorage.getItem(AUDIT_STORAGE_KEY);
    const logs = existing ? JSON.parse(existing) : [];
    logs.push(entry);
    
    // Keep only last 1000 entries to prevent storage bloat
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }

  return entry;
}

type Filters = {
  search: string;
  action: AuditAction | 'all';
  entityType: 'container' | 'sample' | 'user' | 'system' | 'role' | 'all';
  severity: AuditLogEntry['severity'] | 'all';
  userId: string | 'all';
  dateFrom: Date | null;
  dateTo: Date | null;
  success: 'true' | 'false' | 'all';
  page: number;
  pageSize: number;
};

interface AuditTrailProps {
  currentUser?: string;
}

export function AuditTrail({ currentUser }: AuditTrailProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    search: '',
    action: 'all',
    entityType: 'all',
    severity: 'all',
    userId: 'all',
    dateFrom: null,
    dateTo: null,
    success: 'all',
    page: 1,
    pageSize: 50,
  });

  // Load audit logs on mount
  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Seed audit logs in development
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      !localStorage.getItem('plasma-audit-seeded')
    ) {
      seedAudit();
      localStorage.setItem('plasma-audit-seeded', '1');
    }
    loadAuditLogs();
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUDIT_STORAGE_KEY && e.newValue) {
        try {
          setAuditLogs(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchTerm }));
    }, 200);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const loadAuditLogs = () => {
    try {
      const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (saved) {
        const logs = JSON.parse(saved);
        if (Array.isArray(logs)) {
          setAuditLogs(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = !filters.search || 
        log.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.entityId.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.details.description.toLowerCase().includes(filters.search.toLowerCase());

      const matchesAction = filters.action === 'all' || log.action === filters.action;
      const matchesEntityType = filters.entityType === 'all' || log.entityType === filters.entityType;
      const matchesSeverity = filters.severity === 'all' || log.severity === filters.severity;
      const matchesUser = filters.userId === 'all' || log.userId === filters.userId;
      const matchesSuccess = filters.success === 'all' || log.success.toString() === filters.success;

      const logDate = new Date(log.timestamp);
      const matchesDateFrom = !filters.dateFrom || logDate >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || logDate <= filters.dateTo;

      return matchesSearch && matchesAction && matchesEntityType && 
             matchesSeverity && matchesUser && matchesSuccess && 
             matchesDateFrom && matchesDateTo;
    });
  }, [auditLogs, filters]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const start = (filters.page - 1) * filters.pageSize;
    return filteredLogs.slice(start, start + filters.pageSize);
  }, [filteredLogs, filters.page, filters.pageSize]);

  const formatActionName = (action: AuditAction) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getSeverityIcon = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <XCircle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Info className="h-4 w-4 text-blue-600" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportAuditLogs = (format: 'json' | 'csv') => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `audit-logs-${new Date().toISOString().split('T')[0]}.json`);
    } else {
      const headers = [
        "Timestamp","User","Role","Action","Entity Type","Entity ID",
        "Description","Severity","Success","IP Address"
      ];

      const rows = filteredLogs.map((log) => [
        log.timestamp,
        esc(log.userName),
        esc(log.userRole),
        esc(formatActionName(log.action)),
        esc(log.entityType),
        esc(log.entityId),
        esc(log.details.description),
        esc(log.severity),
        esc(log.success),
        esc(log.ipAddress || "")
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, `audit-logs-${new Date().toISOString().split("T")[0]}.csv`);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Audit Trail
          </h2>
          <p className="text-muted-foreground">
            Track all system activities and user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportAuditLogs('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportAuditLogs('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={loadAuditLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Action</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters((f) => ({ ...f, action: value as any }))}
              >
                <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="user_login">User Login</SelectItem>
                  <SelectItem value="container_created">Container Created</SelectItem>
                  <SelectItem value="sample_scanned">Sample Scanned</SelectItem>
                  <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Entity Type</Label>
              <Select
                value={filters.entityType}
                onValueChange={(value) => setFilters((f) => ({ ...f, entityType: value as any }))}
              >
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                  <SelectItem value="sample">Sample</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity</Label>
              <Select
                value={filters.severity}
                onValueChange={(value) => setFilters((f) => ({ ...f, severity: value as any }))}
              >
                <SelectTrigger><SelectValue placeholder="All severities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={filters.success}
                onValueChange={(value) => setFilters((f) => ({ ...f, success: value }))}
              >
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Logs ({filteredLogs.length})</span>
            <div className="text-sm text-muted-foreground">
              Page {filters.page} of {Math.max(1, Math.ceil(filteredLogs.length / filters.pageSize))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{log.userName}</p>
                        <p className="text-xs text-muted-foreground">{log.userRole}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {formatActionName(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{log.entityType}</p>
                        <p className="text-xs text-muted-foreground">{log.entityId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{log.details.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(log.severity)}
                        <Badge className={`text-xs ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.success ? 'default' : 'destructive'} className="text-xs">
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(filteredLogs.length, filters.pageSize)} of {filteredLogs.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(filters.pageSize)}
                onValueChange={(v) => setFilters((f) => ({ ...f, pageSize: Number(v), page: 1 }))}
              >
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const last = Math.max(1, Math.ceil(filteredLogs.length / filters.pageSize));
                  setFilters((f) => ({ ...f, page: Math.min(last, f.page + 1) }));
                }}
                disabled={filters.page * filters.pageSize >= filteredLogs.length}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Seed function for development
function seedAudit() {
  createAuditLog('user_login','user','u1',{ description: 'Logged in' },'JD');
  createAuditLog('container_created','container','PB001',{ description:'Created plasma box PB001' }, undefined, { entityName:'Plasma Box PB001' });
  createAuditLog('sample_scanned','sample','C01039DPP1B',{ description:'Scanned sample into PB001 A1' },'AM');
  createAuditLog('unauthorized_access','system','/admin',{ description:'Blocked access to admin' },'ZZ', { success:false });
}