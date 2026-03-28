import { NextResponse } from "next/server";
import { withRouter, getUsers, addUser } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function GET() {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    console.log("[API] GET /api/mikrotik/users");

    const data = await withRouter(host, port, user, password, async (api, version) =>
      getUsers(api, version)
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Users GET error:", message);
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
    const { username, userPassword, profile, customer } = await request.json();
    console.log(`[API] POST /api/mikrotik/users username=${username}`);

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const userId = await withRouter(host, port, user, password, async (api, version) =>
      addUser(api, version, username, userPassword || "", profile || "", customer || "admin")
    );

    return NextResponse.json({ success: true, id: userId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Users POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
