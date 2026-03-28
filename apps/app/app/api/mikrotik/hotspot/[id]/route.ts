import { NextResponse } from "next/server";
import {
  withRouter,
  removeHotspotUser,
  disableHotspotUser,
  enableHotspotUser,
} from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { id } = await params;
    const { host, port, user, password } = session.router;
    console.log(`[API] DELETE /api/mikrotik/hotspot/${id}`);

    await withRouter(host, port, user, password, async (api) =>
      removeHotspotUser(api, id)
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Hotspot DELETE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await request.json();
    const { host, port, user, password } = session.router;
    console.log(`[API] PATCH /api/mikrotik/hotspot/${id} action=${action}`);

    if (action === "disable") {
      await withRouter(host, port, user, password, async (api) =>
        disableHotspotUser(api, id)
      );
    } else if (action === "enable") {
      await withRouter(host, port, user, password, async (api) =>
        enableHotspotUser(api, id)
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Hotspot PATCH error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
