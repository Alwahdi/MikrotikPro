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

    const router = await database.router.findFirst({
      where: { id: routerId, organizationId: orgId },
    });
    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const [batches, total] = await Promise.all([
      database.cardBatch.findMany({
        where: { routerId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { cards: true } },
          cards: {
            select: { isSold: true },
          },
        },
        skip,
        take: limit,
      }),
      database.cardBatch.count({ where: { routerId } }),
    ]);

    const result = batches.map((batch) => ({
      ...batch,
      totalCards: batch._count.cards,
      soldCards: batch.cards.filter((c) => c.isSold).length,
      cards: undefined,
      _count: undefined,
    }));

    return NextResponse.json({
      batches: result,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
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
    const { routerId, profileName, quantity, prefix, cards } = body;

    if (!routerId || !profileName || !quantity || !cards || !Array.isArray(cards)) {
      return NextResponse.json(
        { error: "Missing required fields: routerId, profileName, quantity, cards[]" },
        { status: 400 }
      );
    }

    const router = await database.router.findFirst({
      where: { id: routerId, organizationId: orgId },
    });
    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const batch = await database.cardBatch.create({
      data: {
        routerId,
        clerkUserId: userId,
        profileName,
        quantity: Number(quantity),
        prefix: prefix || null,
        cards: {
          create: cards.map((card: { username: string; password: string }) => ({
            username: card.username,
            password: card.password,
          })),
        },
      },
      include: { cards: true },
    });

    await database.auditLog.create({
      data: {
        routerId,
        clerkUserId: userId,
        action: "cards.generate",
        target: profileName,
        details: JSON.stringify({ quantity, prefix }),
      },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
