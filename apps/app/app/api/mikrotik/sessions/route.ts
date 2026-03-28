import { NextResponse } from "next/server";
import { withRouter, getSessions } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function GET(request: Request) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || "";
    console.log(`[API] GET /api/mikrotik/sessions username=${username}`);

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter required" },
        { status: 400 }
      );
    }

    const data = await withRouter(host, port, user, password, async (api, version) =>
      getSessions(api, version, username)
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Sessions GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
