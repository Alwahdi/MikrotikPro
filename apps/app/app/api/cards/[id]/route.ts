import { NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const batch = await database.cardBatch.findFirst({
      where: { id },
      include: {
        cards: { orderBy: { createdAt: "asc" } },
        router: { select: { organizationId: true } },
      },
    });

    if (!batch || batch.router.organizationId !== orgId) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { cardIds, soldTo } = body;

    if (!cardIds || !Array.isArray(cardIds)) {
      return NextResponse.json(
        { error: "cardIds[] is required" },
        { status: 400 }
      );
    }

    // Verify batch belongs to org
    const batch = await database.cardBatch.findFirst({
      where: { id },
      include: {
        router: { select: { organizationId: true, id: true } },
      },
    });

    if (!batch || batch.router.organizationId !== orgId) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Mark cards as sold
    await database.card.updateMany({
      where: {
        id: { in: cardIds },
        batchId: id,
      },
      data: {
        isSold: true,
        soldAt: new Date(),
        soldTo: soldTo || null,
      },
    });

    await database.auditLog.create({
      data: {
        routerId: batch.router.id,
        clerkUserId: userId,
        action: "cards.sell",
        target: batch.profileName,
        details: JSON.stringify({ cardCount: cardIds.length, soldTo }),
      },
    });

    return NextResponse.json({ success: true, updated: cardIds.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const batch = await database.cardBatch.findFirst({
      where: { id },
      include: {
        router: { select: { organizationId: true, id: true } },
      },
    });

    if (!batch || batch.router.organizationId !== orgId) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Cascade delete will remove cards too
    await database.cardBatch.delete({ where: { id } });

    await database.auditLog.create({
      data: {
        routerId: batch.router.id,
        clerkUserId: userId,
        action: "cards.batch.delete",
        target: batch.profileName,
        details: JSON.stringify({ batchId: id, quantity: batch.quantity }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
