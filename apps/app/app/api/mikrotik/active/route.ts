import { NextResponse } from "next/server";
import { withRouter, getActiveConnections } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function GET() {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    console.log("[API] GET /api/mikrotik/active");

    const data = await withRouter(host, port, user, password, async (api) =>
      getActiveConnections(api)
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Active GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
