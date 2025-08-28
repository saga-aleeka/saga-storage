import { useEffect, useRef, useCallback } from 'react';
import type { PlasmaContainer } from './PlasmaContainerList';

export interface SyncMessage {
  type:
    | 'container_update'
    | 'sample_update'
    | 'user_activity'
    | 'container_lock'
    | 'container_unlock'
    | 'container_lock_renew';
  containerId?: string;
  data?: any;
  timestamp: number;
  userId: string;
  userName?: string;
}

export interface UserActivity {
  userId: string;
  userName: string;
  containerId: string;
  action: 'viewing' | 'editing' | 'scanning';
  timestamp: number;
}

interface RealtimeSyncProps {
  containers: PlasmaContainer[];
  onContainersChange: (containers: PlasmaContainer[]) => void;
  onUserActivity?: (activities: UserActivity[]) => void;
  onContainerLocked?: (containerId: string, userId: string, userName: string) => void;
  onContainerUnlocked?: (containerId: string) => void;

  /** Optionally inject identity instead of prompting */
  identity?: { userId?: string; userName?: string };
}

/* -------------------- identity helpers -------------------- */

const generateUserId = () => {
  const stored = localStorage.getItem('plasma-user-id');
  if (stored) return stored;
  const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('plasma-user-id', newId);
  return newId;
};

const getUserName = () => {
  const stored = localStorage.getItem('plasma-user-name');
  if (stored) return stored;
  // Avoid blocking UIs; fall back to a neutral alias
  const name = `User ${new Date().toLocaleTimeString()}`;
  localStorage.setItem('plasma-user-name', name);
  return name;
};

/* -------------------- tiny BC fallback -------------------- */

type PostFn = (msg: SyncMessage) => void;
type SubscribeFn = (fn: (msg: SyncMessage) => void) => () => void;

function makeChannel(topic: string): { post: PostFn; subscribe: SubscribeFn; close: () => void } {
  if (typeof BroadcastChannel !== 'undefined') {
    const ch = new BroadcastChannel(topic);
    return {
      post: (msg) => ch.postMessage(msg),
      subscribe: (fn) => {
        const handler = (e: MessageEvent<SyncMessage>) => fn(e.data);
        ch.addEventListener('message', handler);
        return () => ch.removeEventListener('message', handler);
      },
      close: () => ch.close(),
    };
  }

  // Fallback via localStorage "storage" events
  const KEY = `__${topic}__`;
  const post: PostFn = (msg) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(msg));
      // Write a second time to ensure storage event even if value identical
      localStorage.removeItem(KEY);
    } catch {}
  };
  const subscribe: SubscribeFn = (fn) => {
    const handler = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        const parsed = typeof e.newValue === 'string' ? (JSON.parse(e.newValue) as SyncMessage) : null;
        if (parsed) fn(parsed);
      } catch {}
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  };
  return { post, subscribe, close: () => {} };
}

/* -------------------- hook -------------------- */

const ACTIVITY_TTL_MS = 30_000;
const LOCK_TTL_MS = 30_000;
const LOCK_RENEW_MS = 10_000;

export function useRealtimeSync({
  containers,
  onContainersChange,
  onUserActivity,
  onContainerLocked,
  onContainerUnlocked,
  identity,
}: RealtimeSyncProps) {
  const chanRef = useRef<ReturnType<typeof makeChannel> | null>(null);
  const userIdRef = useRef<string>(identity?.userId || generateUserId());
  const userNameRef = useRef<string>(identity?.userName || getUserName());
  const lastUpdateRef = useRef<number>(Date.now());

  // Track latest activity by user
  const userActivitiesRef = useRef<Map<string, UserActivity>>(new Map());

  // Track locks with owner + expiry
  const lockMapRef = useRef<Map<string, { userId: string; userName: string; expiresAt: number }>>(new Map());
  // local renewal timers for containers we lock
  const myLockTimersRef = useRef<Map<string, number>>(new Map());

  // init channel
  useEffect(() => {
    const ch = makeChannel('plasma-sync');
    chanRef.current = ch;

    const unsubscribe = ch.subscribe((message) => {
      // Ignore own messages
      if (message.userId === userIdRef.current) return;

      // Drop very old container updates (others are event-like)
      if (message.type === 'container_update' && message.timestamp <= lastUpdateRef.current) return;

      switch (message.type) {
        case 'container_update': {
          if (message.data && Array.isArray(message.data)) {
            lastUpdateRef.current = message.timestamp;
            onContainersChange(message.data);
          }
          break;
        }
        case 'sample_update': {
          if (message.containerId && message.data) {
            const storageKey = `samples-${message.containerId}`;
            localStorage.setItem(storageKey, JSON.stringify(message.data));
            const evt = new CustomEvent('plasma-sample-update', {
              detail: { containerId: message.containerId, samples: message.data },
            });
            window.dispatchEvent(evt);
          }
          break;
        }
        case 'user_activity': {
          const activity = message.data as UserActivity | undefined;
          if (!activity) break;
          userActivitiesRef.current.set(activity.userId, activity);

          // purge old
          const cutoff = Date.now() - ACTIVITY_TTL_MS;
          for (const [uid, act] of userActivitiesRef.current) {
            if (act.timestamp < cutoff) userActivitiesRef.current.delete(uid);
          }
          onUserActivity?.(Array.from(userActivitiesRef.current.values()));
          break;
        }
        case 'container_lock':
        case 'container_lock_renew': {
          if (message.containerId && message.userId && message.userName) {
            lockMapRef.current.set(message.containerId, {
              userId: message.userId,
              userName: message.userName,
              expiresAt: Date.now() + LOCK_TTL_MS,
            });
            if (message.type === 'container_lock') {
              onContainerLocked?.(message.containerId, message.userId, message.userName);
            }
          }
          break;
        }
        case 'container_unlock': {
          if (message.containerId) {
            lockMapRef.current.delete(message.containerId);
            onContainerUnlocked?.(message.containerId);
          }
          break;
        }
      }
    });

    // periodic maintenance: expire stale locks & activities
    const interval = window.setInterval(() => {
      // expire locks
      const now = Date.now();
      for (const [cid, info] of lockMapRef.current) {
        if (info.expiresAt <= now) {
          lockMapRef.current.delete(cid);
          onContainerUnlocked?.(cid);
        }
      }
      // expire activities
      const cutoff = Date.now() - ACTIVITY_TTL_MS;
      let pruned = false;
      for (const [uid, act] of userActivitiesRef.current) {
        if (act.timestamp < cutoff) {
          userActivitiesRef.current.delete(uid);
          pruned = true;
        }
      }
      if (pruned) onUserActivity?.(Array.from(userActivitiesRef.current.values()));
    }, 5_000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
      ch.close();
    };
  }, [onContainersChange, onUserActivity, onContainerLocked, onContainerUnlocked, identity?.userId, identity?.userName]);

  /* ---------- broadcasters ---------- */

  const post = (msg: SyncMessage) => chanRef.current?.post(msg);

  const broadcastContainerUpdate = useCallback((updatedContainers: PlasmaContainer[]) => {
    const message: SyncMessage = {
      type: 'container_update',
      data: updatedContainers,
      timestamp: Date.now(),
      userId: userIdRef.current,
      userName: userNameRef.current,
    };
    lastUpdateRef.current = message.timestamp;
    post(message);
  }, []);

  const broadcastSampleUpdate = useCallback((containerId: string, samples: any) => {
    const message: SyncMessage = {
      type: 'sample_update',
      containerId,
      data: samples,
      timestamp: Date.now(),
      userId: userIdRef.current,
      userName: userNameRef.current,
    };
    post(message);
  }, []);

  const broadcastUserActivity = useCallback((containerId: string, action: UserActivity['action']) => {
    const activity: UserActivity = {
      userId: userIdRef.current,
      userName: userNameRef.current,
      containerId,
      action,
      timestamp: Date.now(),
    };

    // update local immediately so the UI reflects our own actions
    userActivitiesRef.current.set(activity.userId, activity);
    onUserActivity?.(Array.from(userActivitiesRef.current.values()));

    const message: SyncMessage = {
      type: 'user_activity',
      data: activity,
      timestamp: Date.now(),
      userId: userIdRef.current,
      userName: userNameRef.current,
    };
    post(message);
  }, [onUserActivity]);

  /* ---------- locking with renewal ---------- */

  const sendLock = (containerId: string, kind: 'container_lock' | 'container_lock_renew') => {
    const message: SyncMessage = {
      type: kind,
      containerId,
      timestamp: Date.now(),
      userId: userIdRef.current,
      userName: userNameRef.current,
    };
    post(message);
  };

  const lockContainer = useCallback((containerId: string) => {
    // record locally
    lockMapRef.current.set(containerId, {
      userId: userIdRef.current,
      userName: userNameRef.current,
      expiresAt: Date.now() + LOCK_TTL_MS,
    });
    onContainerLocked?.(containerId, userIdRef.current, userNameRef.current);
    sendLock(containerId, 'container_lock');

    // start/refresh renewal timer
    const existing = myLockTimersRef.current.get(containerId);
    if (existing) window.clearInterval(existing);
    const timer = window.setInterval(() => {
      // keep lock alive while held
      const info = lockMapRef.current.get(containerId);
      if (!info || info.userId !== userIdRef.current) return; // someone else owns or released
      lockMapRef.current.set(containerId, {
        ...info,
        expiresAt: Date.now() + LOCK_TTL_MS,
      });
      sendLock(containerId, 'container_lock_renew');
    }, LOCK_RENEW_MS);
    myLockTimersRef.current.set(containerId, timer);
  }, [onContainerLocked]);

  const unlockContainer = useCallback((containerId: string) => {
    // clear renewal
    const t = myLockTimersRef.current.get(containerId);
    if (t) {
      window.clearInterval(t);
      myLockTimersRef.current.delete(containerId);
    }
    // clear local + notify
    lockMapRef.current.delete(containerId);
    onContainerUnlocked?.(containerId);
    const message: SyncMessage = {
      type: 'container_unlock',
      containerId,
      timestamp: Date.now(),
      userId: userIdRef.current,
      userName: userNameRef.current,
    };
    post(message);
  }, [onContainerUnlocked]);

  /* ---------- helpers ---------- */

  /** Any lock present (including our own) */
  const isContainerLocked = useCallback((containerId: string) => {
    return lockMapRef.current.has(containerId);
  }, []);

  /** True only if someone else holds the lock */
  const isContainerLockedByOther = useCallback((containerId: string) => {
    const info = lockMapRef.current.get(containerId);
    return !!info && info.userId !== userIdRef.current;
  }, []);

  /** Get the lock owner info if locked */
  const getLockOwner = useCallback(
    (containerId: string) => lockMapRef.current.get(containerId) || null,
    []
  );

  return {
    userId: userIdRef.current,
    userName: userNameRef.current,
    broadcastContainerUpdate,
    broadcastSampleUpdate,
    broadcastUserActivity,
    lockContainer,
    unlockContainer,
    isContainerLocked,
    isContainerLockedByOther,
    getLockOwner,
  };
}

/* -------------------- helper component -------------------- */

export function RealtimeSync(props: RealtimeSyncProps) {
  useRealtimeSync(props);
  return null;
}
