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
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    if (!routerId) {
      return NextResponse.json(
        { error: "routerId is required" },
        { status: 400 }
      );
    }

    // Verify router belongs to org
    const router = await database.router.findFirst({
      where: { id: routerId, organizationId: orgId },
    });
    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const [sales, total] = await Promise.all([
      database.sale.findMany({
        where: { routerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      database.sale.count({ where: { routerId } }),
    ]);

    return NextResponse.json({
      sales,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] GET /api/sales error:", message);
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
    const { routerId, customerName, username, profileName, price, currency, method, notes } = body;

    if (!routerId || !customerName || !username || !profileName || !price) {
      return NextResponse.json(
        { error: "Missing required fields: routerId, customerName, username, profileName, price" },
        { status: 400 }
      );
    }

    // Verify router belongs to org
    const router = await database.router.findFirst({
      where: { id: routerId, organizationId: orgId },
    });
    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const sale = await database.sale.create({
      data: {
        routerId,
        clerkUserId: userId,
        customerName,
        username,
        profileName,
        price,
        currency: currency || "USD",
        method: method || "cash",
        notes: notes || null,
      },
    });

    await database.auditLog.create({
      data: {
        routerId,
        clerkUserId: userId,
        action: "sale.create",
        target: username,
        details: JSON.stringify({ customerName, profileName, price }),
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] POST /api/sales error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
