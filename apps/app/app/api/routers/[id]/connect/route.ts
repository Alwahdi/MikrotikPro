import { NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { withRouter, getRouterInfo } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const router = await database.router.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    // Connect to the actual Mikrotik device
    const routerInfo = await withRouter(
      router.host,
      router.port,
      router.username,
      router.password,
      async (api) => getRouterInfo(api)
    );

    // Save connection to iron-session
    const session = await getRouterSession();
    session.isLoggedIn = true;
    session.username = router.username;
    session.router = {
      host: router.host,
      port: router.port,
      user: router.username,
      password: router.password,
    };
    const versionStr = routerInfo.version || String(router.version);
    session.routerVersion = Number.parseInt(versionStr.charAt(0), 10);
    await session.save();

    // Audit
    await database.auditLog.create({
      data: {
        routerId: router.id,
        clerkUserId: userId,
        action: "router.connect",
        target: router.name,
      },
    });

    return NextResponse.json({ success: true, routerInfo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] POST /api/routers/[id]/connect error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
