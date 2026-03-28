export interface User {
  id: string;
  username: string;
  password: string;
  profile: string;
  uptimeUsed: string;
  downloadUsed: string;
  uploadUsed: string;
  disabled: boolean;
  lastSeen: string;
}

export interface HotspotUser {
  id: string;
  name: string;
  password: string;
  profile: string;
  uptime: string;
  limitUptime: string;
  bytesIn: string;
  bytesOut: string;
  limitBytesTotal: string;
  disabled: boolean;
  comment: string;
}

export interface Profile {
  id: string;
  name: string;
  price: string;
  validity: string;
}

export interface Session {
  user: string;
  started: string;
  uptime: string;
  upload: string;
  download: string;
}

export interface ActiveConnection {
  id: string;
  user: string;
  uptime: string;
  address: string;
  bytesIn: string;
  bytesOut: string;
  macAddress: string;
}

export interface Customer {
  login: string;
}

export interface RouterInfo {
  version: string;
  cpuLoad: string;
  freeMemory: string;
  totalMemory: string;
  uptime: string;
  boardName: string;
}

export interface Limitation {
  id: string;
  name: string;
  transferLimit: string;
  uptimeLimit: string;
  owner: string;
}

export interface ProfileLimitation {
  id: string;
  profile: string;
  limitation: string;
}

export interface UserProfileAssignment {
  id: string;
  user: string;
  profile: string;
}

export interface Payment {
  user: string;
  price: string;
  profile: string;
  method: string;
}

export interface HotspotServer {
  id: string;
  name: string;
  interface: string;
  disabled: boolean;
}

export interface IpBinding {
  id: string;
  macAddress: string;
  type: string;
  comment: string;
}

export interface NetworkInterface {
  id: string;
  name: string;
  type: string;
  macAddress: string;
  disabled: boolean;
}

export interface Neighbor {
  address: string;
  macAddress: string;
  identity: string;
  platform: string;
  board: string;
  interface: string;
}

export interface SystemScript {
  id: string;
  name: string;
  source: string;
}

export interface SystemScheduler {
  id: string;
  name: string;
  onEvent: string;
  interval: string;
}

export interface RouterConnection {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface RouterSessionData {
  isLoggedIn: boolean;
  username?: string;
  router?: RouterConnection;
  routerVersion?: number;
}
