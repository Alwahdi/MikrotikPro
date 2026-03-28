import { NextResponse } from "next/server";
import { withRouter, getRouterInfo } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function POST(request: Request) {
  try {
    const { host, port, user, password } = await request.json();
    console.log(`[API] POST /api/mikrotik/connect host=${host} port=${port}`);

    if (!host || !port || !user || !password) {
      return NextResponse.json(
        { error: "Missing connection parameters" },
        { status: 400 }
      );
    }

    const routerInfo = await withRouter(
      host,
      Number(port),
      user,
      password,
      async (api) => getRouterInfo(api)
    );

    const session = await getRouterSession();
    session.isLoggedIn = true;
    session.username = user;
    session.router = { host, port: Number(port), user, password };

    const versionStr = routerInfo.version || "6";
    session.routerVersion = Number.parseInt(versionStr.charAt(0), 10);
    await session.save();

    console.log("[API] Router connected, session saved");
    return NextResponse.json({ success: true, routerInfo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Connect error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getRouterSession();
    session.destroy();
    console.log("[API] Router session destroyed");
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      username: session.username,
      routerVersion: session.routerVersion,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
