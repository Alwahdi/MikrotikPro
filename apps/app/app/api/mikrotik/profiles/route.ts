import { NextResponse } from "next/server";
import { withRouter, getProfiles, addProfile, getHotspotProfiles, removeProfile, removeHotspotProfile } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

export async function GET(request: Request) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "usermanager";
    console.log(`[API] GET /api/mikrotik/profiles type=${type}`);

    const data = await withRouter(host, port, user, password, async (api, version) => {
      if (type === "hotspot") {
        return getHotspotProfiles(api);
      }
      return getProfiles(api, version);
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Profiles GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const { name, price, validity, limitName, transferLimit, uptimeLimit } =
      await request.json();
    console.log(`[API] POST /api/mikrotik/profiles name=${name}`);

    if (!name || !limitName) {
      return NextResponse.json(
        { error: "Name and limit name required" },
        { status: 400 }
      );
    }

    await withRouter(host, port, user, password, async (api, version) =>
      addProfile(api, version, name, price || "0", validity || "0s", limitName, transferLimit, uptimeLimit)
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Profiles POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "usermanager";

    if (!id) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
    }

    console.log(`[API] DELETE /api/mikrotik/profiles id=${id} type=${type}`);

    await withRouter(host, port, user, password, async (api, version) => {
      if (type === "hotspot") {
        return removeHotspotProfile(api, id);
      }
      return removeProfile(api, version, id);
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Profiles DELETE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
