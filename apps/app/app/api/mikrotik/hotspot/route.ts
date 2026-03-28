import { NextResponse } from "next/server";
import { withRouter, getHotspotUsers, addHotspotUser } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function GET() {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    console.log("[API] GET /api/mikrotik/hotspot");

    const data = await withRouter(host, port, user, password, async (api) =>
      getHotspotUsers(api)
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Hotspot GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const { name, userPassword, profile } = await request.json();
    console.log(`[API] POST /api/mikrotik/hotspot name=${name}`);

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    await withRouter(host, port, user, password, async (api) =>
      addHotspotUser(api, name, userPassword || "", profile || "default")
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Hotspot POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
