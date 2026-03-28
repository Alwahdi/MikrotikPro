import { RouterOSAPI } from "node-routeros";
import type {
  User,
  HotspotUser,
  Profile,
  Session,
  ActiveConnection,
  Customer,
  RouterInfo,
  Limitation,
  ProfileLimitation,
  UserProfileAssignment,
  Payment,
  HotspotServer,
  IpBinding,
  NetworkInterface,
  Neighbor,
  SystemScript,
  SystemScheduler,
} from "./types";

export async function withRouter<T>(
  host: string,
  port: number,
  user: string,
  password: string,
  callback: (api: RouterOSAPI, version: number) => Promise<T>
): Promise<T> {
  console.log(`[MIKROTIK] Connecting to ${host}:${port} as ${user}...`);
  const api = new RouterOSAPI({ host, port, user, password, timeout: 15 });
  try {
    await api.connect();
    console.log(`[MIKROTIK] Connected to ${host}:${port}`);
    const res = (await api.write("/system/resource/print")) as Record<
      string,
      string
    >[];
    const versionStr = res[0]?.version || "6";
    const version = Number.parseInt(versionStr.charAt(0), 10);
    console.log(
      `[MIKROTIK] RouterOS version: ${versionStr} (major: ${version})`
    );
    return await callback(api, version);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[MIKROTIK] Error: ${message}`);
    throw err;
  } finally {
    try {
      api.close();
      console.log("[MIKROTIK] Connection closed");
    } catch {
      /* ignore */
    }
  }
}

function umPath(version: number, subpath: string): string {
  const prefix = version >= 7 ? "/user-manager" : "/tool/user-manager";
  const path = `${prefix}${subpath}`;
  console.log(`[MIKROTIK] API path: ${path} (v${version})`);
  return path;
}

// ── User Manager ──────────────────────────────────────────

export async function getUsers(
  api: RouterOSAPI,
  version: number
): Promise<{ active: User[]; inactive: User[] }> {
  console.log("[MIKROTIK] getUsers() called");
  const raw = (await api.write(umPath(version, "/user/print"), [
    "=.proplist=.id,username,password,actual-profile,uptime-used,download-used,upload-used,disabled,last-seen",
  ])) as Record<string, string>[];

  const active: User[] = [];
  const inactive: User[] = [];

  for (const r of raw) {
    const u: User = {
      id: r[".id"] || "",
      username: r.username || "",
      password: r.password || "",
      profile: r["actual-profile"] || "",
      uptimeUsed: r["uptime-used"] || "0s",
      downloadUsed: r["download-used"] || "0",
      uploadUsed: r["upload-used"] || "0",
      disabled: r.disabled === "true" || r.disabled === "yes",
      lastSeen: r["last-seen"] || "never",
    };
    if (u.profile) active.push(u);
    else inactive.push(u);
  }

  return { active, inactive };
}

export async function addUser(
  api: RouterOSAPI,
  version: number,
  username: string,
  password: string,
  profile: string,
  customer: string
): Promise<string> {
  console.log(
    `[MIKROTIK] addUser() username=${username} profile=${profile} customer=${customer} (v${version})`
  );

  let addResult: Record<string, string>[];

  if (version >= 7) {
    const params = [`=name=${username}`, "=shared-users=0"];
    if (password) params.push(`=password=${password}`);
    console.log("[MIKROTIK] v7 user/add params:", params);
    addResult = (await api.write(
      umPath(version, "/user/add"),
      params
    )) as Record<string, string>[];
  } else {
    const params = [`=username=${username}`];
    if (password) params.push(`=password=${password}`);
    if (customer) params.push(`=customer=${customer}`);
    console.log("[MIKROTIK] v6 user/add params:", params);
    addResult = (await api.write(
      umPath(version, "/user/add"),
      params
    )) as Record<string, string>[];
  }

  const userId = addResult[0]?.ret || addResult[0]?.[".id"] || "";
  console.log(`[MIKROTIK] User created with id: ${userId}`);

  if (profile) {
    if (version >= 7) {
      console.log("[MIKROTIK] v7 assigning profile via user-profile/add");
      await api.write("/user-manager/user-profile/add", [
        `=user=${userId}`,
        `=profile=${profile}`,
      ]);
    } else {
      console.log(
        "[MIKROTIK] v6 assigning profile via create-and-activate-profile"
      );
      await api.write(
        umPath(version, "/user/create-and-activate-profile"),
        [
          `=numbers=${userId}`,
          `=profile=${profile}`,
          `=customer=${customer || "admin"}`,
        ]
      );
    }
  }

  return userId;
}

export async function removeUser(
  api: RouterOSAPI,
  version: number,
  id: string
): Promise<void> {
  if (version >= 7) {
    await api.write(umPath(version, "/user/remove"), [`=numbers=${id}`]);
  } else {
    await api.write(umPath(version, "/user/remove"), [`=.id=${id}`]);
  }
}

export async function disableUser(
  api: RouterOSAPI,
  version: number,
  id: string
): Promise<void> {
  if (version >= 7) {
    await api.write(umPath(version, "/user/disable"), [`=numbers=${id}`]);
  } else {
    await api.write(umPath(version, "/user/disable"), [`=.id=${id}`]);
  }
}

export async function enableUser(
  api: RouterOSAPI,
  version: number,
  id: string
): Promise<void> {
  if (version >= 7) {
    await api.write(umPath(version, "/user/enable"), [`=numbers=${id}`]);
  } else {
    await api.write(umPath(version, "/user/enable"), [`=.id=${id}`]);
  }
}

// ── Profiles ──────────────────────────────────────────────

export async function getProfiles(
  api: RouterOSAPI,
  version: number
): Promise<Profile[]> {
  console.log("[MIKROTIK] getProfiles() called");
  const raw = (await api.write(umPath(version, "/profile/print"), [
    "=.proplist=.id,name,price,validity",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    price: r.price || "0",
    validity: r.validity || "",
  }));
}

export async function addProfile(
  api: RouterOSAPI,
  version: number,
  name: string,
  price: string,
  validity: string,
  limitName: string,
  transferLimit?: string,
  uptimeLimit?: string
): Promise<void> {
  const profileParams =
    version >= 7
      ? [
          `=name=${name}`,
          `=name-for-users=${name}`,
          "=starts-when=first-auth",
          `=price=${price}`,
          `=validity=${validity}`,
        ]
      : [
          `=name=${name}`,
          `=name-for-users=${name}`,
          "=starts-at=logon",
          `=price=${price}`,
          `=validity=${validity}`,
          "=owner=admin",
        ];

  console.log(
    `[MIKROTIK] addProfile() name=${name} v${version}`,
    profileParams
  );
  await api.write(umPath(version, "/profile/add"), profileParams);

  const limParams: string[] = [`=name=${limitName}`];
  if (transferLimit) limParams.push(`=transfer-limit=${transferLimit}`);
  if (uptimeLimit) limParams.push(`=uptime-limit=${uptimeLimit}`);
  if (version < 7) limParams.push("=owner=admin");

  console.log(`[MIKROTIK] addLimitation() v${version}`, limParams);

  const limPath =
    version >= 7 ? "/limitation/add" : "/profile/limitation/add";
  await api.write(umPath(version, limPath), limParams);

  const linkPath =
    version >= 7
      ? "/profile-limitation/add"
      : "/profile/profile-limitation/add";
  await api.write(umPath(version, linkPath), [
    `=profile=${name}`,
    `=limitation=${limitName}`,
  ]);
}

export async function removeProfile(
  api: RouterOSAPI,
  version: number,
  id: string
): Promise<void> {
  console.log(`[MIKROTIK] removeProfile() id=${id} v${version}`);
  if (version >= 7) {
    await api.write(umPath(version, "/profile/remove"), [`=numbers=${id}`]);
  } else {
    await api.write(umPath(version, "/profile/remove"), [`=.id=${id}`]);
  }
}

export async function setProfile(
  api: RouterOSAPI,
  version: number,
  id: string,
  params: Record<string, string>
): Promise<void> {
  console.log(`[MIKROTIK] setProfile() id=${id} v${version}`);
  const args = version >= 7 ? [`=numbers=${id}`] : [`=.id=${id}`];
  for (const [key, value] of Object.entries(params)) {
    args.push(`=${key}=${value}`);
  }
  await api.write(umPath(version, "/profile/set"), args);
}

// ── Limitations ───────────────────────────────────────────

export async function getLimitations(
  api: RouterOSAPI,
  version: number
): Promise<Limitation[]> {
  console.log("[MIKROTIK] getLimitations() called");
  const limPath =
    version >= 7 ? "/limitation/print" : "/profile/limitation/print";
  const raw = (await api.write(umPath(version, limPath), [
    "=.proplist=.id,name,transfer-limit,uptime-limit,owner",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    transferLimit: r["transfer-limit"] || "",
    uptimeLimit: r["uptime-limit"] || "",
    owner: r.owner || "",
  }));
}

export async function setLimitation(
  api: RouterOSAPI,
  version: number,
  id: string,
  params: Record<string, string>
): Promise<void> {
  console.log(`[MIKROTIK] setLimitation() id=${id} v${version}`);
  const limPath =
    version >= 7 ? "/limitation/set" : "/profile/limitation/set";
  const args = version >= 7 ? [`=numbers=${id}`] : [`=.id=${id}`];
  for (const [key, value] of Object.entries(params)) {
    args.push(`=${key}=${value}`);
  }
  await api.write(umPath(version, limPath), args);
}

export async function getProfileLimitations(
  api: RouterOSAPI,
  version: number
): Promise<ProfileLimitation[]> {
  console.log("[MIKROTIK] getProfileLimitations() called");
  const linkPath =
    version >= 7
      ? "/profile-limitation/print"
      : "/profile/profile-limitation/print";
  const raw = (await api.write(umPath(version, linkPath), [
    "=.proplist=.id,profile,limitation",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    profile: r.profile || "",
    limitation: r.limitation || "",
  }));
}

export async function getUserProfileAssignments(
  api: RouterOSAPI,
  version: number
): Promise<UserProfileAssignment[]> {
  console.log("[MIKROTIK] getUserProfileAssignments() called");
  const raw = (await api.write(umPath(version, "/user-profile/print"), [
    "=.proplist=.id,user,profile",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    user: r.user || "",
    profile: r.profile || "",
  }));
}

// ── Customers ─────────────────────────────────────────────

export async function getCustomers(
  api: RouterOSAPI,
  version: number
): Promise<Customer[]> {
  console.log("[MIKROTIK] getCustomers() called");
  const raw = (await api.write(umPath(version, "/customer/print"), [
    "=.proplist=login",
  ])) as Record<string, string>[];
  return raw.map((r) => ({ login: r.login || "" }));
}

// ── Payments ──────────────────────────────────────────────

export async function getPayments(
  api: RouterOSAPI,
  version: number
): Promise<Payment[]> {
  console.log("[MIKROTIK] getPayments() called");
  const raw = (await api.write(umPath(version, "/payment/print"), [
    "=.proplist=user,price,profile,method",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    user: r.user || "",
    price: r.price || "0",
    profile: r.profile || "",
    method: r.method || "",
  }));
}

// ── All Sessions (for sales/revenue) ─────────────────────

export interface SessionRecord {
  user: string;
  started: string;
  uptime: string;
  upload: string;
  download: string;
  nasPortId: string;
}

export async function getAllSessions(
  api: RouterOSAPI,
  version: number
): Promise<SessionRecord[]> {
  console.log("[MIKROTIK] getAllSessions() called");
  const fields =
    version >= 7
      ? "=.proplist=user,started,uptime,upload,download,nas-port-id"
      : "=.proplist=user,from-time,uptime,upload,download,nas-port-id";

  const raw = (await api.write(umPath(version, "/session/print"), [
    fields,
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    user: r.user || "",
    started: r.started || r["from-time"] || "",
    uptime: r.uptime || "",
    upload: r.upload || "0",
    download: r.download || "0",
    nasPortId: r["nas-port-id"] || "",
  }));
}

// ── Batch Add Users ──────────────────────────────────────

// Add a single user to router (used for streaming progress)
export async function batchAddUsersSingle(
  api: RouterOSAPI,
  version: number,
  u: { username: string; password: string; profile: string; customer: string }
): Promise<void> {
  let addResult: Record<string, string>[];

  if (version >= 7) {
    const params = [`=name=${u.username}`, "=shared-users=0"];
    if (u.password) params.push(`=password=${u.password}`);
    addResult = (await api.write(
      umPath(version, "/user/add"),
      params
    )) as Record<string, string>[];
  } else {
    const params = [`=username=${u.username}`];
    if (u.password) params.push(`=password=${u.password}`);
    if (u.customer) params.push(`=customer=${u.customer}`);
    addResult = (await api.write(
      umPath(version, "/user/add"),
      params
    )) as Record<string, string>[];
  }

  const userId = addResult[0]?.ret || addResult[0]?.[".id"] || "";

  if (u.profile) {
    if (version >= 7) {
      await api.write("/user-manager/user-profile/add", [
        `=user=${userId}`,
        `=profile=${u.profile}`,
      ]);
    } else {
      await api.write(
        umPath(version, "/user/create-and-activate-profile"),
        [
          `=numbers=${userId}`,
          `=profile=${u.profile}`,
          `=customer=${u.customer || "admin"}`,
        ]
      );
    }
  }
}

export async function batchAddUsers(
  api: RouterOSAPI,
  version: number,
  users: { username: string; password: string; profile: string; customer: string }[]
): Promise<{ success: string[]; failed: { username: string; error: string }[] }> {
  console.log(`[MIKROTIK] batchAddUsers() count=${users.length}`);
  const success: string[] = [];
  const failed: { username: string; error: string }[] = [];

  for (const u of users) {
    try {
      await batchAddUsersSingle(api, version, u);
      success.push(u.username);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ username: u.username, error: msg });
    }
  }

  return { success, failed };
}

// ── Database Operations ───────────────────────────────────

export async function optimizeDatabase(
  api: RouterOSAPI,
  version: number
): Promise<void> {
  console.log(`[MIKROTIK] optimizeDatabase() v${version}`);
  if (version >= 7) {
    await api.write(umPath(version, "/database/optimize-db"));
  } else {
    await api.write(umPath(version, "/database/rebuild"));
  }
}

export async function saveDatabase(
  api: RouterOSAPI,
  version: number
): Promise<void> {
  console.log(`[MIKROTIK] saveDatabase() v${version}`);
  await api.write(umPath(version, "/database/save"));
}

// ── Sessions ──────────────────────────────────────────────

export async function getSessions(
  api: RouterOSAPI,
  version: number,
  username: string
): Promise<Session[]> {
  console.log(`[MIKROTIK] getSessions() user=${username}`);
  const fields =
    version >= 7
      ? "=.proplist=user,started,uptime,upload,download"
      : "=.proplist=user,from-time,uptime,upload,download";

  const raw = (await api.write(umPath(version, "/session/print"), [
    fields,
    `?user=${username}`,
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    user: r.user || "",
    started: r.started || r["from-time"] || "",
    uptime: r.uptime || "",
    upload: r.upload || "0",
    download: r.download || "0",
  }));
}

// ── Hotspot ───────────────────────────────────────────────

export async function getHotspotUsers(
  api: RouterOSAPI
): Promise<HotspotUser[]> {
  console.log("[MIKROTIK] getHotspotUsers() called");
  const raw = (await api.write("/ip/hotspot/user/print", [
    "=.proplist=.id,name,password,profile,uptime,limit-uptime,bytes-out,bytes-in,limit-bytes-total,disabled,comment",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    password: r.password || "",
    profile: r.profile || "",
    uptime: r.uptime || "0s",
    limitUptime: r["limit-uptime"] || "",
    bytesIn: r["bytes-in"] || "0",
    bytesOut: r["bytes-out"] || "0",
    limitBytesTotal: r["limit-bytes-total"] || "0",
    disabled: r.disabled === "true" || r.disabled === "yes",
    comment: r.comment || "",
  }));
}

export async function addHotspotUser(
  api: RouterOSAPI,
  name: string,
  password: string,
  profile: string
): Promise<void> {
  await api.write("/ip/hotspot/user/add", [
    `=name=${name}`,
    `=password=${password}`,
    `=profile=${profile}`,
  ]);
}

export async function removeHotspotUser(
  api: RouterOSAPI,
  id: string
): Promise<void> {
  await api.write("/ip/hotspot/user/remove", [`=.id=${id}`]);
}

export async function disableHotspotUser(
  api: RouterOSAPI,
  id: string
): Promise<void> {
  await api.write("/ip/hotspot/user/disable", [`=.id=${id}`]);
}

export async function enableHotspotUser(
  api: RouterOSAPI,
  id: string
): Promise<void> {
  await api.write("/ip/hotspot/user/enable", [`=.id=${id}`]);
}

export async function setHotspotUser(
  api: RouterOSAPI,
  id: string,
  params: Record<string, string>
): Promise<void> {
  console.log(`[MIKROTIK] setHotspotUser() id=${id}`);
  const args = [`=.id=${id}`];
  for (const [key, value] of Object.entries(params)) {
    args.push(`=${key}=${value}`);
  }
  await api.write("/ip/hotspot/user/set", args);
}

export async function resetHotspotUserCounters(
  api: RouterOSAPI,
  id: string
): Promise<void> {
  console.log(`[MIKROTIK] resetHotspotUserCounters() id=${id}`);
  await api.write("/ip/hotspot/user/reset-counters", [`=.id=${id}`]);
}

export async function getHotspotProfiles(
  api: RouterOSAPI
): Promise<Profile[]> {
  const raw = (await api.write("/ip/hotspot/user/profile/print", [
    "=.proplist=.id,name",
  ])) as Record<string, string>[];
  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    price: "",
    validity: "",
  }));
}

export async function removeHotspotProfile(
  api: RouterOSAPI,
  id: string
): Promise<void> {
  console.log(`[MIKROTIK] removeHotspotProfile() id=${id}`);
  await api.write("/ip/hotspot/user/profile/remove", [`=.id=${id}`]);
}

export async function addHotspotProfile(
  api: RouterOSAPI,
  name: string,
  params?: Record<string, string>
): Promise<void> {
  console.log(`[MIKROTIK] addHotspotProfile() name=${name}`);
  const args = [`=name=${name}`];
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      args.push(`=${key}=${value}`);
    }
  }
  await api.write("/ip/hotspot/user/profile/add", args);
}

export async function getHotspotServers(
  api: RouterOSAPI
): Promise<HotspotServer[]> {
  console.log("[MIKROTIK] getHotspotServers() called");
  const raw = (await api.write("/ip/hotspot/print", [
    "=.proplist=.id,name,interface,disabled",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    interface: r.interface || "",
    disabled: r.disabled === "true" || r.disabled === "yes",
  }));
}

// ── Active Connections ────────────────────────────────────

export async function getActiveConnections(
  api: RouterOSAPI
): Promise<ActiveConnection[]> {
  console.log("[MIKROTIK] getActiveConnections() called");
  const raw = (await api.write("/ip/hotspot/active/print", [
    "=.proplist=.id,user,uptime,address,bytes-in,bytes-out,mac-address",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    user: r.user || "",
    uptime: r.uptime || "",
    address: r.address || "",
    bytesIn: r["bytes-in"] || "0",
    bytesOut: r["bytes-out"] || "0",
    macAddress: r["mac-address"] || "",
  }));
}

export async function kickActiveConnection(
  api: RouterOSAPI,
  id: string
): Promise<void> {
  console.log(`[MIKROTIK] kickActiveConnection() id=${id}`);
  await api.write("/ip/hotspot/active/remove", [`=.id=${id}`]);
}

// ── IP Binding (MAC Block/Unblock) ────────────────────────

export async function getIpBindings(
  api: RouterOSAPI
): Promise<IpBinding[]> {
  console.log("[MIKROTIK] getIpBindings() called");
  const raw = (await api.write("/ip/hotspot/ip-binding/print", [
    "=.proplist=.id,mac-address,type,comment",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    macAddress: r["mac-address"] || "",
    type: r.type || "",
    comment: r.comment || "",
  }));
}

export async function addIpBinding(
  api: RouterOSAPI,
  macAddress: string,
  type: string,
  comment?: string
): Promise<void> {
  console.log(`[MIKROTIK] addIpBinding() mac=${macAddress} type=${type}`);
  const args = [`=mac-address=${macAddress}`, `=type=${type}`];
  if (comment) args.push(`=comment=${comment}`);
  await api.write("/ip/hotspot/ip-binding/add", args);
}

export async function removeIpBinding(
  api: RouterOSAPI,
  id: string
): Promise<void> {
  console.log(`[MIKROTIK] removeIpBinding() id=${id}`);
  await api.write("/ip/hotspot/ip-binding/remove", [`=.id=${id}`]);
}

// ── Router Info ───────────────────────────────────────────

export async function getRouterInfo(api: RouterOSAPI): Promise<RouterInfo> {
  console.log("[MIKROTIK] getRouterInfo() called");
  const raw = (await api.write(
    "/system/resource/print"
  )) as Record<string, string>[];
  const r = raw[0] || {};
  return {
    version: r.version || "",
    cpuLoad: r["cpu-load"] || "0",
    freeMemory: r["free-memory"] || "0",
    totalMemory: r["total-memory"] || "0",
    uptime: r.uptime || "",
    boardName: r["board-name"] || "",
  };
}

export async function monitorSystemResource(
  api: RouterOSAPI
): Promise<{ cpuLoad: string }> {
  console.log("[MIKROTIK] monitorSystemResource() called");
  const raw = (await api.write("/system/resource/print", [
    "=.proplist=cpu-load",
  ])) as Record<string, string>[];
  return { cpuLoad: raw[0]?.["cpu-load"] || "0" };
}

// ── System Scripts ────────────────────────────────────────

export async function getSystemScripts(
  api: RouterOSAPI
): Promise<SystemScript[]> {
  console.log("[MIKROTIK] getSystemScripts() called");
  const raw = (await api.write("/system/script/print", [
    "=.proplist=.id,name,source",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    source: r.source || "",
  }));
}

export async function addSystemScript(
  api: RouterOSAPI,
  name: string,
  source: string
): Promise<void> {
  console.log(`[MIKROTIK] addSystemScript() name=${name}`);
  await api.write("/system/script/add", [
    `=name=${name}`,
    `=source=${source}`,
  ]);
}

// ── System Scheduler ──────────────────────────────────────

export async function getSystemSchedulers(
  api: RouterOSAPI
): Promise<SystemScheduler[]> {
  console.log("[MIKROTIK] getSystemSchedulers() called");
  const raw = (await api.write("/system/scheduler/print", [
    "=.proplist=.id,name,on-event,interval",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    onEvent: r["on-event"] || "",
    interval: r.interval || "",
  }));
}

export async function addSystemScheduler(
  api: RouterOSAPI,
  name: string,
  onEvent: string,
  interval: string
): Promise<void> {
  console.log(`[MIKROTIK] addSystemScheduler() name=${name}`);
  await api.write("/system/scheduler/add", [
    `=name=${name}`,
    `=on-event=${onEvent}`,
    `=interval=${interval}`,
  ]);
}

// ── System Reboot ─────────────────────────────────────────

export async function rebootRouter(api: RouterOSAPI): Promise<void> {
  console.log("[MIKROTIK] rebootRouter() called");
  await api.write("/system/reboot");
}

// ── Interfaces ────────────────────────────────────────────

export async function getInterfaces(
  api: RouterOSAPI
): Promise<NetworkInterface[]> {
  console.log("[MIKROTIK] getInterfaces() called");
  const raw = (await api.write("/interface/print", [
    "=.proplist=.id,name,type,mac-address,disabled",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    id: r[".id"] || "",
    name: r.name || "",
    type: r.type || "",
    macAddress: r["mac-address"] || "",
    disabled: r.disabled === "true" || r.disabled === "yes",
  }));
}

export async function getInterfaceMac(
  api: RouterOSAPI,
  interfaceName: string
): Promise<string> {
  console.log(`[MIKROTIK] getInterfaceMac() interface=${interfaceName}`);
  const raw = (await api.write("/interface/print", [
    "=.proplist=mac-address",
    `?default-name=${interfaceName}`,
  ])) as Record<string, string>[];
  return raw[0]?.["mac-address"] || "";
}

// ── Network Discovery ─────────────────────────────────────

export async function getNeighbors(
  api: RouterOSAPI
): Promise<Neighbor[]> {
  console.log("[MIKROTIK] getNeighbors() called");
  const raw = (await api.write("/ip/neighbor/print", [
    "=.proplist=address,mac-address,identity,platform,board,interface",
  ])) as Record<string, string>[];

  return raw.map((r) => ({
    address: r.address || "",
    macAddress: r["mac-address"] || "",
    identity: r.identity || "",
    platform: r.platform || "",
    board: r.board || "",
    interface: r.interface || "",
  }));
}

// ── Export ─────────────────────────────────────────────────

export async function exportConfig(api: RouterOSAPI): Promise<string> {
  console.log("[MIKROTIK] exportConfig() called");
  const raw = (await api.write("/export")) as Record<string, string>[];
  return raw.map((r) => r.ret || r.message || "").join("\n");
}
