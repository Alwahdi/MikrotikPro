import { NextResponse } from "next/server";
import { withRouter, removeUser, disableUser, enableUser } from "@repo/mikrotik";
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
    console.log(`[API] DELETE /api/mikrotik/users/${id}`);

    await withRouter(host, port, user, password, async (api, version) =>
      removeUser(api, version, id)
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Users DELETE error:", message);
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
    console.log(`[API] PATCH /api/mikrotik/users/${id} action=${action}`);

    if (action === "disable") {
      await withRouter(host, port, user, password, async (api, version) =>
        disableUser(api, version, id)
      );
    } else if (action === "enable") {
      await withRouter(host, port, user, password, async (api, version) =>
        enableUser(api, version, id)
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Users PATCH error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
