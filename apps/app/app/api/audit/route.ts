import { NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const routerId = searchParams.get("routerId");
    const action = searchParams.get("action");
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (routerId) {
      const router = await database.router.findFirst({
        where: { id: routerId, organizationId: orgId },
      });
      if (!router) {
        return NextResponse.json({ error: "Router not found" }, { status: 404 });
      }
      where.routerId = routerId;
    } else {
      // Only show logs for routers belonging to the org
      const orgRouters = await database.router.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      where.routerId = { in: orgRouters.map((r) => r.id) };
    }

    if (action) {
      where.action = { startsWith: action };
    }

    const [logs, total] = await Promise.all([
      database.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      database.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] GET /api/audit error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
