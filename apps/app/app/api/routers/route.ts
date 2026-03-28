import { NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const routers = await database.router.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        version: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json(routers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] GET /api/routers error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, host, port, username, password, version } = body;

    if (!name || !host || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, host, username, password" },
        { status: 400 }
      );
    }

    const router = await database.router.create({
      data: {
        organizationId: orgId,
        name,
        host,
        port: port ? Number(port) : 8728,
        username,
        password,
        version: version ? Number(version) : 7,
      },
    });

    await database.auditLog.create({
      data: {
        routerId: router.id,
        clerkUserId: userId,
        action: "router.create",
        target: name,
      },
    });

    return NextResponse.json(router, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] POST /api/routers error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
