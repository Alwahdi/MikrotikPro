import { NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await database.printProfile.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(profiles);
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
    const { name, ...settings } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const profile = await database.printProfile.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        columns: settings.columns ?? 3,
        rows: settings.rows ?? 10,
        fontSize: settings.fontSize ?? 10,
        showUsername: settings.showUsername ?? true,
        showPassword: settings.showPassword ?? true,
        showProfile: settings.showProfile ?? false,
        showSalesPoint: settings.showSalesPoint ?? false,
        imageUrl: settings.imageUrl ?? null,
        userX: settings.userX ?? 3,
        userY: settings.userY ?? 10,
        passX: settings.passX ?? 3,
        passY: settings.passY ?? 18,
        cardWidth: settings.cardWidth ?? null,
        cardHeight: settings.cardHeight ?? null,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A print profile with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
