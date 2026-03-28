import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { RouterSessionData } from "./types";

export const routerSessionOptions: SessionOptions = {
  password:
    process.env.ROUTER_SESSION_SECRET ||
    "mums-router-session-key-must-be-at-least-32-characters-long",
  cookieName: "mums-router-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getRouterSession() {
  const cookieStore = await cookies();
  return getIronSession<RouterSessionData>(cookieStore, routerSessionOptions);
}
