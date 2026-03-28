import { NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await database.printProfile.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Print profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await database.printProfile.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? existing.name,
        columns: body.columns ?? existing.columns,
        rows: body.rows ?? existing.rows,
        fontSize: body.fontSize ?? existing.fontSize,
        showUsername: body.showUsername ?? existing.showUsername,
        showPassword: body.showPassword ?? existing.showPassword,
        showProfile: body.showProfile ?? existing.showProfile,
        showSalesPoint: body.showSalesPoint ?? existing.showSalesPoint,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
        userX: body.userX ?? existing.userX,
        userY: body.userY ?? existing.userY,
        passX: body.passX ?? existing.passX,
        passY: body.passY ?? existing.passY,
        cardWidth: body.cardWidth !== undefined ? body.cardWidth : existing.cardWidth,
        cardHeight: body.cardHeight !== undefined ? body.cardHeight : existing.cardHeight,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A print profile with this name already exists" }, { status: 409 });
    }
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
    const existing = await database.printProfile.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Print profile not found" }, { status: 404 });
    }

    await database.printProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
