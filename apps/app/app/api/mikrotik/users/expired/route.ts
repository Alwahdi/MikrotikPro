import { NextResponse } from "next/server";
import { withRouter, getUsers, removeUser } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

// GET: returns disabled/expired users
export async function GET() {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const data = await withRouter(host, port, user, password, async (api, version) =>
      getUsers(api, version)
    );

    // Inactive = users without a profile (expired/disabled)
    return NextResponse.json(data.inactive || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: delete all disabled/expired users or specific ones
export async function DELETE(request: Request) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const body = await request.json().catch(() => ({}));
    const { userIds } = body as { userIds?: string[] };

    const result = await withRouter(host, port, user, password, async (api, version) => {
      let toDelete: string[] = [];

      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        toDelete = userIds;
      } else {
        // Delete all expired/inactive users
        const data = await getUsers(api, version);
        toDelete = data.inactive.map((u) => u.id);
      }

      const deleted: string[] = [];
      const failed: { id: string; error: string }[] = [];

      for (const id of toDelete) {
        try {
          await removeUser(api, version, id);
          deleted.push(id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          failed.push({ id, error: msg });
        }
      }

      return { deleted: deleted.length, failed };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
