// server.ts
// Run locally: deno run -A server.ts

import { join, dirname, fromFileUrl } from "https://deno.land/std@0.208.0/path/mod.ts";

// Load environment variables from .env file if it exists
try {
  const currentDir = dirname(fromFileUrl(import.meta.url));
  const envPath = join(currentDir, '../../../.env');
  const envFile = await Deno.readTextFile(envPath);
  const envVars = envFile.split('\n').filter(line => line.includes('='));
  for (const line of envVars) {
    const [key, value] = line.split('=');
    if (key && value && !Deno.env.get(key.trim())) {
      Deno.env.set(key.trim(), value.trim());
    }
  }
} catch (error) {
  console.log('No .env file found or error reading it:', error.message);
}

import { Hono } from "https://deno.land/x/hono@v3.7.2/mod.ts";
import { cors, logger } from "https://deno.land/x/hono@v3.7.2/middleware.ts";

// Use your KV helpers (your file name)
import * as kv from "./kv_store.tsx";

const app = new Hono();

// CORS & logging
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["*"],
  }),
);
app.use("*", logger());

// Health
app.get("/make-server-aaac77aa/health", (c) =>
  {
    console.log('Health check - Environment check:');
    console.log('SUPABASE_URL:', Deno.env.get("SUPABASE_URL") ? 'Set' : 'Not set');
    console.log('VITE_SUPABASE_URL:', Deno.env.get("VITE_SUPABASE_URL") ? 'Set' : 'Not set');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? 'Set' : 'Not set');
    console.log('VITE_SUPABASE_ANON_KEY:', Deno.env.get("VITE_SUPABASE_ANON_KEY") ? 'Set' : 'Not set');
    
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "SAGA Storage System API",
      environment: {
        supabase_url: Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") ? 'configured' : 'missing',
        service_role_key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? 'configured' : 'missing',
        anon_key: Deno.env.get("VITE_SUPABASE_ANON_KEY") ? 'configured' : 'missing'
      }
  })
  }
);

// -----------------------------
// Containers
// -----------------------------
app.get("/make-server-aaac77aa/containers", async (c) => {
  try {
    const containers = (await kv.get("saga-containers")) || [];
    return c.json({ containers });
  } catch (error) {
    console.error("Server error fetching containers:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

app.post("/make-server-aaac77aa/containers", async (c) => {
  try {
    const body = await c.req.json();
    const { container, userId } = body;

    if (!container || !userId) {
      return c.json({ error: "Container data and userId required" }, 400);
    }

    const newContainer = {
      ...container,
      id:
        container.id ||
        `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId,
      updated_by: userId,
    };

    const existing = (await kv.get("saga-containers")) || [];
    const updated = [...existing, newContainer];
    await kv.set("saga-containers", updated);

    await createAuditLogEntry(
      "container_created",
      "container",
      newContainer.id,
      userId,
      {
        description: `Container created: ${newContainer.name}`,
        containerType: newContainer.type,
        location:
          `${newContainer.location_freezer ?? ""}${
            newContainer.location_rack ? "/" + newContainer.location_rack : ""
          }${
            newContainer.location_drawer
              ? "/" + newContainer.location_drawer
              : ""
          }`,
      },
    );

    return c.json({ container: newContainer });
  } catch (error) {
    console.error("Server error creating container:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

app.put("/make-server-aaac77aa/containers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { container, userId } = body;

    if (!container || !userId) {
      return c.json({ error: "Container data and userId required" }, 400);
    }

    const existing = (await kv.get("saga-containers")) || [];
    const idx = existing.findIndex((x: any) => x.id === id);
    if (idx === -1) return c.json({ error: "Container not found" }, 404);

    const oldContainer = existing[idx];
    const updatedContainer = {
      ...oldContainer,
      ...container,
      id,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    existing[idx] = updatedContainer;

    await kv.set("saga-containers", existing);

    await createAuditLogEntry("container_updated", "container", id, userId, {
      description: `Container updated: ${updatedContainer.name}`,
      changes: getContainerChanges(oldContainer, updatedContainer),
    });

    return c.json({ container: updatedContainer });
  } catch (error) {
    console.error("Server error updating container:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

app.delete("/make-server-aaac77aa/containers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "userId required" }, 400);

    const existing = (await kv.get("saga-containers")) || [];
    const target = existing.find((x: any) => x.id === id);
    if (!target) return c.json({ error: "Container not found" }, 404);

    const updated = existing.filter((x: any) => x.id !== id);
    await kv.set("saga-containers", updated);

    await createAuditLogEntry("container_deleted", "container", id, userId, {
      description: `Container deleted: ${target.name}`,
      containerType: target.type,
      sampleCount: target.samples ? Object.keys(target.samples).length : 0,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Server error deleting container:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

// -----------------------------
// Container locking
// -----------------------------
app.post("/make-server-aaac77aa/containers/:id/lock", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { userId, userName } = body;
    if (!userId || !userName) {
      return c.json({ error: "UserId and userName required" }, 400);
    }

    const locks = (await kv.get("saga-container-locks")) || {};
    if (locks[id] && locks[id].userId !== userId) {
      return c.json(
        { error: "Container is already locked by another user" },
        409,
      );
    }

    locks[id] = { userId, userName, lockedAt: new Date().toISOString() };
    await kv.set("saga-container-locks", locks);

    const containers = (await kv.get("saga-containers")) || [];
    const container = containers.find((x: any) => x.id === id);
    if (container) {
      container.locked_by = userId;
      container.locked_at = new Date().toISOString();
      await kv.set("saga-containers", containers);
    }

    return c.json({ container });
  } catch (error) {
    console.error("Server error locking container:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

app.delete("/make-server-aaac77aa/containers/:id/lock", async (c) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "userId required" }, 400);

    const locks = (await kv.get("saga-container-locks")) || {};
    if (locks[id] && locks[id].userId !== userId) {
      return c.json({ error: "Container is locked by another user" }, 403);
    }

    delete locks[id];
    await kv.set("saga-container-locks", locks);

    const containers = (await kv.get("saga-containers")) || [];
    const container = containers.find((x: any) => x.id === id);
    if (container) {
      container.locked_by = null;
      container.locked_at = null;
      await kv.set("saga-containers", containers);
    }

    return c.json({ container });
  } catch (error) {
    console.error("Server error unlocking container:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

// -----------------------------
// User sessions (presence)
// -----------------------------
app.post("/make-server-aaac77aa/sessions", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, userName, activityType, containerId, metadata } = body;

    const session = {
      user_id: userId,
      user_name: userName,
      activity_type: activityType,
      container_id: containerId,
      last_seen: new Date().toISOString(),
      status: "active",
      metadata,
    };

    const sessions: Record<string, any> = (await kv.get("saga-user-sessions")) ||
      {};
    sessions[userId] = session;

    // purge sessions older than 5 minutes
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    for (const [k, v] of Object.entries(sessions)) {
      if (v.last_seen < cutoff) delete sessions[k];
    }

    await kv.set("saga-user-sessions", sessions);
    return c.json({ session });
  } catch (error) {
    console.error("Server error updating session:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

app.get("/make-server-aaac77aa/sessions", async (c) => {
  try {
    const sessions = (await kv.get("saga-user-sessions")) || {};
    return c.json({ sessions: Object.values(sessions) });
  } catch (error) {
    console.error("Server error fetching sessions:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

// -----------------------------
// Audit logs
// -----------------------------
app.post("/make-server-aaac77aa/audit-logs", async (c) => {
  try {
    const body = await c.req.json();
    const {
      actionType,
      resourceType,
      resourceId,
      userId,
      userName,
      details,
      oldValues,
      newValues,
      metadata,
      severity,
      success,
    } = body;

    const auditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: userId,
      user_name: userName,
      details,
      old_values: oldValues,
      new_values: newValues,
      metadata,
      severity: severity || "low",
      success: success !== false,
      timestamp: new Date().toISOString(),
    };

    const logs = (await kv.get("saga-audit-logs")) || [];
    logs.unshift(auditLog);
    if (logs.length > 1000) logs.splice(1000);
    await kv.set("saga-audit-logs", logs);

    return c.json({ auditLog });
  } catch (error) {
    console.error("Server error creating audit log:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

app.get("/make-server-aaac77aa/audit-logs", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");
    const resourceType = c.req.query("resourceType");
    const actionType = c.req.query("actionType");
    const userId = c.req.query("userId");
    const severity = c.req.query("severity");

    let logs = (await kv.get("saga-audit-logs")) || [];

    if (resourceType) logs = logs.filter((x: any) =>
      x.resource_type === resourceType
    );
    if (actionType) logs = logs.filter((x: any) =>
      x.action_type === actionType
    );
    if (userId) logs = logs.filter((x: any) => x.user_id === userId);
    if (severity) logs = logs.filter((x: any) => x.severity === severity);

    const paginated = logs.slice(offset, offset + limit);
    return c.json({ logs: paginated });
  } catch (error) {
    console.error("Server error fetching audit logs:", error);
    return c.json(
      { error: "Internal server error", details: (error as Error).message },
      500,
    );
  }
});

// -----------------------------
// Helpers
// -----------------------------
async function createAuditLogEntry(
  actionType: string,
  resourceType: string,
  resourceId: string,
  userId: string,
  details: any,
) {
  try {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: userId,
      user_name: "System User",
      details,
      severity: "low",
      success: true,
      timestamp: new Date().toISOString(),
    };

    const logs = (await kv.get("saga-audit-logs")) || [];
    logs.unshift(entry);
    if (logs.length > 1000) logs.splice(1000);
    await kv.set("saga-audit-logs", logs);
  } catch (error) {
    console.error("Error creating audit log entry:", error);
  }
}

function getContainerChanges(oldContainer: any, newContainer: any) {
  const changes: Record<string, { from: any; to: any }> = {};
  const fields = [
    "name",
    "type",
    "sample_type",
    "status",
    "location_freezer",
    "location_rack",
    "location_drawer",
  ];

    for (const f of fields) {
      if (oldContainer[f] !== newContainer[f]) {
        changes[f] = { from: oldContainer[f], to: newContainer[f] };
      }
    }

  const oldCount = oldContainer.samples
    ? Object.keys(oldContainer.samples).length
    : 0;
  const newCount = newContainer.samples
    ? Object.keys(newContainer.samples).length
    : 0;

  if (oldCount !== newCount) {
    (changes as any).sampleCount = { from: oldCount, to: newCount };
  }

  return changes;
}

console.log("SAGA Storage System API server starting...");
Deno.serve({ port: 8000 }, app.fetch);
