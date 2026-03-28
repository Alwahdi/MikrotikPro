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

    // Summary stats
    const [totalSales, totalRevenue, recentSales, cardStats] = await Promise.all([
      database.sale.count({ where: { routerId } }),
      database.sale.aggregate({
        where: { routerId },
        _sum: { price: true },
      }),
      database.sale.findMany({
        where: { routerId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      database.card.groupBy({
        by: ["isSold"],
        where: { batch: { routerId } },
        _count: true,
      }),
    ]);

    const soldCards = cardStats.find((c) => c.isSold)?._count || 0;
    const unsoldCards = cardStats.find((c) => !c.isSold)?._count || 0;

    return NextResponse.json({
      totalSales,
      totalRevenue: totalRevenue._sum.price || 0,
      recentSales,
      cards: { sold: soldCards, unsold: unsoldCards, total: soldCards + unsoldCards },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
