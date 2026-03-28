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
    const router = await database.router.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        version: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    return NextResponse.json(router);
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

    const existing = await database.router.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    const router = await database.router.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.host && { host: body.host }),
        ...(body.port && { port: Number(body.port) }),
        ...(body.username && { username: body.username }),
        ...(body.password && { password: body.password }),
        ...(body.version && { version: Number(body.version) }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    });

    await database.auditLog.create({
      data: {
        routerId: id,
        clerkUserId: userId,
        action: "router.update",
        target: router.name,
      },
    });

    return NextResponse.json(router);
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
    const existing = await database.router.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    await database.router.delete({ where: { id } });

    await database.auditLog.create({
      data: {
        clerkUserId: userId,
        action: "router.delete",
        target: existing.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
