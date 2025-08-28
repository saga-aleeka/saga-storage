// app.tsx
import React, { useState, useEffect } from "react";
import {
  PlasmaContainerList
} from "./components/PlasmaContainerList";
import type { PlasmaContainer } from "./components/PlasmaContainerList";
import { useRealtimeSync } from "./components/RealtimeSync";
import type { UserActivity } from "./components/RealtimeSync";
import { CollaborationPanel } from "./components/CollaborationIndicators";
import { AuditTrail } from "./components/AuditTrail";
import {
  ConflictResolution,
} from "./components/ConflictResolution";
import type {
  ConflictEvent,
  ConflictLock,
} from "./components/ConflictResolution";
import { AdminDashboard } from "./components/AdminDashboard";
import { ThemeToggle } from "./components/ThemeToggle";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import {
  User as UserIcon,
  FileText,
  AlertTriangle,
  Settings,
  Database,
  Activity,
  Cloud,
  Edit3,
  Plus,
} from "lucide-react";

// Supabase-backed helpers
import {
  fetchContainers,
  subscribeToContainers,
  subscribeToUserSessions,
  updateUserSession,
  checkDatabaseHealth,
  createAuditLog,
} from "./utils/supabase/database";

const STORAGE_KEY = "saga-containers";
const USER_INITIALS_KEY = "saga-user-initials";

// Simple user interface for tracking
interface SimpleUser {
  initials: string;
  timestamp: string;
}

// Theme detection and application
function useSystemTheme() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Apply initial theme
    applyTheme(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
}

export default function App() {
  useSystemTheme();
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [containers, setContainers] = useState<PlasmaContainer[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [lockedContainers, setLockedContainers] = useState<
    Map<string, { userId: string; userName: string }>
  >(new Map());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentUserInitials, setCurrentUserInitials] = useState<string>("");
  const [showInitialsDialog, setShowInitialsDialog] = useState(false);
  const [showSystemDialog, setShowSystemDialog] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [conflictLocks] = useState<ConflictLock[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<
    "connected" | "connecting" | "error"
  >("connecting");
  const [tempInitials, setTempInitials] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Debug state to see what's happening
  useEffect(() => {
    console.log('App state:', { 
      currentUserInitials, 
      showInitialsDialog, 
      isAdminMode,
      containers: containers.length 
    });
  }, [currentUserInitials, showInitialsDialog, isAdminMode, containers.length]);

  // Load initials and containers on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("🌐 Back online - attempting to restore database connection");
      checkDatabaseConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDatabaseStatus("error");
      toast.warning("📡 Working offline - changes will sync when reconnected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check URL parameters for admin mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get("admin");
    setIsAdminMode(adminParam === "true");
  }, []);

  // Subscribe to Supabase realtime once DB is connected
  useEffect(() => {
    if (databaseStatus !== "connected") return;

    const containersChannel = subscribeToContainers((incoming) => {
      setContainers(incoming);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
    });

    const sessionsChannel = subscribeToUserSessions((sessions) => {
      // Merge DB sessions into activity list (favor latest timestamp)
      setUserActivities((prev) => {
        const map = new Map<string, UserActivity>();
        prev.forEach((a) => map.set(a.userId, a));
        sessions.forEach((s: any) => {
          const mapped: UserActivity = {
            userId: s.user_id || s.userId,
            userName: s.user_name || s.userName || (s.user_id || "User"),
            containerId: s.container_id || s.containerId || "",
            action:
              s.activity_type === "editing"
                ? "editing"
                : s.activity_type === "scanning"
                ? "scanning"
                : "viewing",
            timestamp: s.last_seen ? new Date(s.last_seen).getTime() : Date.now(),
          };
          const existing = map.get(mapped.userId);
          if (!existing || existing.timestamp < mapped.timestamp) {
            map.set(mapped.userId, mapped);
          }
        });
        return Array.from(map.values());
      });
    });

    return () => {
      // @ts-expect-error Supabase channel has unsubscribe()
      containersChannel?.unsubscribe?.();
      // @ts-expect-error Supabase channel has unsubscribe()
      sessionsChannel?.unsubscribe?.();
    };
  }, [databaseStatus]);

  // Heartbeat user session while connected
  useEffect(() => {
    if (databaseStatus !== "connected" || !currentUserInitials) return;
    const tick = () =>
      updateUserSession(currentUserInitials, currentUserInitials, "user_session").catch(
        (e) => console.error("Session heartbeat failed:", e)
      );
    tick(); // immediate
    const id = setInterval(tick, 60_000); // every minute
    return () => clearInterval(id);
  }, [databaseStatus, currentUserInitials]);

  // Initialize app with immediate UI render
  const initializeApp = async () => {
    // Load user initials immediately (synchronous)
    loadUserInitials();

    // Load containers from localStorage immediately for fast startup
    loadContainersFromStorage();

    // Start background database connection check (non-blocking)
    setTimeout(() => {
      checkDatabaseConnection();
    }, 100);
  };

  // Check database connection with timeout
  const checkDatabaseConnection = async () => {
    if (!isOnline) return;

    try {
      setDatabaseStatus("connecting");

      // 10s timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout")), 10_000)
      );

      await Promise.race([checkDatabaseHealth(), timeoutPromise]);

      setDatabaseStatus("connected");

      // If database is healthy, try to sync containers
      syncContainersFromDatabase();
      toast.success("🚀 Database connection established");
    } catch (error) {
      console.error("Database connection failed:", error);
      setDatabaseStatus("error");
      toast.warning("⚠️ Database connection failed - working in offline mode");
    }
  };

  // Load user initials from localStorage (synchronous)
  const loadUserInitials = () => {
    try {
      const saved = localStorage.getItem(USER_INITIALS_KEY);
      console.log('Loading user initials:', saved);
      if (saved) {
        const userData = JSON.parse(saved) as SimpleUser;
        console.log('Parsed user data:', userData);
        setCurrentUserInitials(userData.initials);
      } else {
        console.log('No saved user initials found');
      }
    } catch (error) {
      console.error("Error loading user initials:", error);
    }
  };

  // Save user initials
  const saveUserInitials = (initials: string) => {
    const userData: SimpleUser = {
      initials: initials.toUpperCase(),
      timestamp: new Date().toISOString(),
    };

    setCurrentUserInitials(userData.initials);
    localStorage.setItem(USER_INITIALS_KEY, JSON.stringify(userData));

    // Try to update user session in database (non-blocking)
    if (databaseStatus === "connected") {
      setTimeout(() => {
        updateUserSession(userData.initials, userData.initials, "user_session").catch(
          (error) => {
            console.error("Failed to update user session:", error);
          }
        );
      }, 0);
    }

    toast.success(`Welcome to SAGA Storage System, ${userData.initials}!`);
  };

  // Handle initials input
  const handleInitialsSubmit = () => {
    if (tempInitials.trim().length >= 2) {
      saveUserInitials(tempInitials.trim());
      setShowInitialsDialog(false);
      setTempInitials("");
    } else {
      toast.error("Please enter at least 2 characters for your initials");
    }
  };

  // Change user initials
  const handleChangeInitials = () => {
    setTempInitials(currentUserInitials);
    setShowInitialsDialog(true);
  };

  // Load containers from localStorage immediately (synchronous)
  const loadContainersFromStorage = () => {
    try {
      const savedContainers = localStorage.getItem(STORAGE_KEY);
      if (savedContainers) {
        const parsedContainers = JSON.parse(savedContainers);
        if (Array.isArray(parsedContainers)) {
          setContainers(parsedContainers);
        }
      }
    } catch (error) {
      console.error("Error loading containers from storage:", error);
    }
  };

  // Sync containers from database (non-blocking)
  const syncContainersFromDatabase = async () => {
    try {
      const containersFromDb = await fetchContainers();
      if (containersFromDb && containersFromDb.length >= 0) {
        setContainers(containersFromDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(containersFromDb));
        if (containersFromDb.length > 0) {
          toast.success(`📦 Synced ${containersFromDb.length} containers from database`);
        }
      }
    } catch (error) {
      console.error("Error syncing containers from database:", error);
    }
  };

  // Handle container updates with database persistence and local backup
  const handleContainersChange = async (newContainers: PlasmaContainer[]) => {
    setContainers(newContainers);

    // Always save to localStorage as backup
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContainers));

    // Try to broadcast to other users if online
    if (isOnline && databaseStatus === "connected") {
      try {
        broadcastContainerUpdate(newContainers);
      } catch (error) {
        console.error("Failed to broadcast container update:", error);
      }
    }

    // Log container changes (non-blocking)
    if (currentUserInitials) {
      setTimeout(() => {
        createAuditLog(
          "container_updated",
          "container",
          "bulk_update",
          {
            description: `Container list updated - ${newContainers.length} containers`,
            newValues: { containerCount: newContainers.length },
          },
          currentUserInitials
        ).catch((error) => {
          console.error("Failed to create audit log:", error);
        });
      }, 0);
    }
  };

  // Handle user activity updates (BroadcastChannel)
  const handleUserActivity = (activities: UserActivity[]) => {
    setUserActivities((prev) => {
      const map = new Map<string, UserActivity>();
      prev.forEach((a) => map.set(a.userId, a));
      activities.forEach((a) => {
        const existing = map.get(a.userId);
        if (!existing || existing.timestamp < a.timestamp) {
          map.set(a.userId, a);
        }
      });
      return Array.from(map.values());
    });
  };

  // Handle container locking with audit
  const handleContainerLocked = (
    containerId: string,
    userId: string,
    userName: string
  ) => {
    setLockedContainers((prev) => new Map(prev).set(containerId, { userId, userName }));
    toast.info(`🔒 ${userName} is editing container ${containerId}`);
  };

  // Handle container unlocking
  const handleContainerUnlocked = (containerId: string) => {
    setLockedContainers((prev) => {
      const newMap = new Map(prev);
      newMap.delete(containerId);
      return newMap;
    });
  };

  const handleExitAdmin = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("admin");
    window.history.replaceState({}, "", url.toString());
    setIsAdminMode(false);
  };

  // Handle conflicts
  const handleConflictResolved = (conflict: ConflictEvent) => {
    setConflicts((prev) => prev.map((c) => (c.id === conflict.id ? conflict : c)));
    toast.success("Conflict resolved successfully");
  };

  const handleBroadcastConflict = (conflict: ConflictEvent) => {
    const event = new CustomEvent("plasma-conflict", { detail: conflict });
    window.dispatchEvent(event);
  };

  const handleBroadcastLock = (lock: ConflictLock) => {
    const event = new CustomEvent("plasma-lock", { detail: lock });
    window.dispatchEvent(event);
  };

  // Initialize real-time sync (BroadcastChannel)
  const {
    userId,
    userName,
    broadcastContainerUpdate,
    broadcastSampleUpdate,
    broadcastUserActivity,
    lockContainer,
    unlockContainer,
    isContainerLocked,
  } = useRealtimeSync({
    containers,
    onContainersChange: setContainers,
    onUserActivity: handleUserActivity,
    onContainerLocked: handleContainerLocked,
    onContainerUnlocked: handleContainerUnlocked,
  });

  // Enhanced collaboration props with database
  const collaborationProps = {
    userId: currentUserInitials || userId,
    userName: currentUserInitials || userName,
    currentUser: currentUserInitials ? { initials: currentUserInitials } : null,
    broadcastSampleUpdate,
    broadcastUserActivity,
    lockContainer,
    unlockContainer,
    isContainerLocked,
    lockedContainers,
    userActivities,
    isOnline,
    databaseStatus,
  };

  // Show initials input if no current user initials
  if (!currentUserInitials) {
    console.log('Showing initials dialog because currentUserInitials is:', currentUserInitials);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="text-center mb-6">
             <img
               src="/sagaLogo.png"
               alt="SAGA Diagnostics"
              className="h-12 w-auto mx-auto mb-4"
              src="/saga logo.png"
             />
              <h1>SAGA Storage System</h1>
              <p className="text-muted-foreground">Welcome to your clinical lab management platform</p>
              <p className="text-sm text-muted-foreground mt-2">
                Advanced sample tracking and freezer management for laboratory workflows
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {databaseStatus === "connected" ? (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <Cloud className="h-3 w-3 mr-1" />
                    Database Connected
                  </Badge>
                ) : databaseStatus === "connecting" ? (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Database className="h-3 w-3 mr-1 animate-spin" />
                    Connecting...
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <Database className="h-3 w-3 mr-1" />
                    Offline Mode
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="initials">Enter Your Initials</Label>
                <Input
                  id="initials"
                  placeholder="e.g. JS"
                  value={tempInitials}
                  onChange={(e) => setTempInitials(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInitialsSubmit();
                  }}
                  maxLength={4}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be used to track your sample handling activities
                </p>
              </div>

              <Button onClick={handleInitialsSubmit} className="w-full" disabled={tempInitials.trim().length < 2}>
                <UserIcon className="h-4 w-4 mr-2" />
                Start Using SAGA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Initials Dialog */}
        <Dialog open={showInitialsDialog} onOpenChange={setShowInitialsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Your Initials</DialogTitle>
              <DialogDescription>Change the initials used to track your activities</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-initials">Your Initials</Label>
                <Input
                  id="new-initials"
                  placeholder="e.g. JS"
                  value={tempInitials}
                  onChange={(e) => setTempInitials(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInitialsSubmit();
                  }}
                  maxLength={4}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleInitialsSubmit} className="flex-1" disabled={tempInitials.trim().length < 2}>
                  Update Initials
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInitialsDialog(false);
                    setTempInitials("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Toaster position="top-right" />
      </div>
    );
  }

  // Admin dashboard with simplified features
  if (isAdminMode) {
    console.log('Rendering admin mode');
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <img
                src="/saga logo.png"
                alt="SAGA Diagnostics"
                className="h-8 w-auto"
              />
              <div>
                <h1>SAGA System Administration</h1>
                <p className="text-sm text-muted-foreground">User: {currentUserInitials}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Admin Mode
              </Badge>
              {databaseStatus === "connected" ? (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <Cloud className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : databaseStatus === "connecting" ? (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                  <Database className="h-3 w-3 mr-1 animate-spin" />
                  Connecting...
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <Database className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              <Button variant="outline" onClick={handleExitAdmin}>
                Exit Admin
              </Button>
              <Button variant="ghost" onClick={handleChangeInitials}>
                <Edit3 className="h-4 w-4 mr-2" />
                Change Initials
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="containers" className="p-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="containers" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Containers
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Conflicts
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="containers" className="mt-6">
            <AdminDashboard
              onExitAdmin={handleExitAdmin}
              containers={containers}
              onContainersChange={handleContainersChange}
              {...collaborationProps}
            />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AuditTrail currentUser={currentUserInitials} />
          </TabsContent>

          <TabsContent value="conflicts" className="mt-6">
            <ConflictResolution
              currentUser={currentUserInitials}
              onConflictResolved={handleConflictResolved}
              broadcastConflict={handleBroadcastConflict}
              broadcastLock={handleBroadcastLock}
            />
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3>System Information</h3>
                    {databaseStatus !== "connected" && (
                      <Button variant="outline" size="sm" onClick={checkDatabaseConnection}>
                        <Database className="h-4 w-4 mr-2" />
                        Retry Connection
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Version</p>
                      <p>v2.1.0 Enterprise + Database</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Database Status</p>
                      <Badge variant={databaseStatus === "connected" ? "default" : "secondary"}>
                        {databaseStatus === "connected" ? (
                          <>
                            <Cloud className="h-3 w-3 mr-1" />
                            Connected
                          </>
                        ) : databaseStatus === "connecting" ? (
                          <>
                            <Database className="h-3 w-3 mr-1 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Database className="h-3 w-3 mr-1" />
                            Offline
                          </>
                        )}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p>{new Set(userActivities.map((a) => a.userId)).size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Containers</p>
                      <p>{containers.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Locks</p>
                      <p>{lockedContainers.size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Open Conflicts</p>
                      <p>{conflicts.filter((c) => c.status === "active").length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CollaborationPanel userActivities={userActivities} isOnline={isOnline} />
        <Toaster position="top-right" />
      </div>
    );
  }

  // Main application interface
  console.log('Rendering main application interface');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-stone-900">
      {/* Content Area */}
      <div className="px-6 py-6">
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img
              src="/saga logo.png"
              alt="SAGA Diagnostics"
              className="h-12 w-auto"
            />
            <div>
              <span className="text-sm text-gray-600 dark:text-stone-300">User: {currentUserInitials}</span>
              <p className="text-sm text-gray-600">Laboratory Storage System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {databaseStatus === "connected" ? (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Cloud className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : databaseStatus === "connecting" ? (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                <Database className="h-3 w-3 mr-1 animate-spin" />
                Connecting...
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Database className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            <Dialog open={showSystemDialog} onOpenChange={setShowSystemDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-600 dark:text-stone-300 hover:text-gray-900 dark:hover:text-stone-100">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>System Tools</DialogTitle>
                  <DialogDescription>Access administrative functions and system information</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set("admin", "true");
                      window.location.href = url.toString();
                    }}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Open Admin Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowSystemDialog(false);
                      toast.info("Audit logs available in admin dashboard");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Audit Logs
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowSystemDialog(false);
                      toast.info(`${userActivities.length} active user sessions - Database: ${databaseStatus}`);
                    }}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    System Status
                  </Button>
                  {databaseStatus !== "connected" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setShowSystemDialog(false);
                        checkDatabaseConnection();
                      }}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Retry Database Connection
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowSystemDialog(false);
                      handleChangeInitials();
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Change Initials ({currentUserInitials})
                  </Button>
                  <ThemeToggle />
                  <ThemeToggle />
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Container
            </Button>
          </div>
        </div>

      {/* Main content */}
      <PlasmaContainerList
        containers={containers}
        onContainersChange={handleContainersChange}
        {...collaborationProps}
      />

      <CollaborationPanel userActivities={userActivities} isOnline={isOnline} />

      {/* Initials Dialog */}
      <Dialog open={showInitialsDialog} onOpenChange={setShowInitialsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Your Initials</DialogTitle>
            <DialogDescription>Change the initials used to track your activities</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-initials">Your Initials</Label>
              <Input
                id="new-initials"
                placeholder="e.g. JS"
                value={tempInitials}
                onChange={(e) => setTempInitials(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInitialsSubmit();
                  }
                }}
                maxLength={4}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleInitialsSubmit} className="flex-1" disabled={tempInitials.trim().length < 2}>
                Update Initials
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowInitialsDialog(false);
                  setTempInitials("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
      </div>
    </div>
  );
}