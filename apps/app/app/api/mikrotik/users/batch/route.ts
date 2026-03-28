import { NextResponse } from "next/server";
import { withRouter, batchAddUsers } from "@repo/mikrotik";
import { getRouterSession } from "@repo/mikrotik/session";

const CHARSETS: Record<string, string> = {
  digits: "0123456789",
  alpha: "abcdefghijklmnopqrstuvwxyz",
  alphanumeric: "0123456789abcdefghijklmnopqrstuvwxyz",
};

function randomString(length: number, charset: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const session = await getRouterSession();
    if (!session.isLoggedIn || !session.router) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { host, port, user, password } = session.router;
    const body = await request.json();
    const {
      count,
      prefix = "",
      suffix = "",
      usernameLength = 6,
      passwordMode = "same", // "same" | "random" | "empty"
      passwordLength = 6,
      charset: charsetKey = "alphanumeric", // "digits" | "alpha" | "alphanumeric"
      profile = "",
      customer = "admin",
    } = body;

    const charset = CHARSETS[charsetKey] || CHARSETS.alphanumeric;

    if (!count || count < 1 || count > 500) {
      return NextResponse.json(
        { error: "Count must be between 1 and 500" },
        { status: 400 }
      );
    }

    // Generate unique usernames
    const usedNames = new Set<string>();
    const users: { username: string; password: string; profile: string; customer: string }[] = [];

    for (let i = 0; i < count; i++) {
      let username: string;
      let attempts = 0;
      do {
        username = `${prefix}${randomString(usernameLength, charset)}${suffix}`;
        attempts++;
        if (attempts > 1000) {
          return NextResponse.json(
            { error: "Could not generate enough unique usernames. Try a longer length." },
            { status: 400 }
          );
        }
      } while (usedNames.has(username));
      usedNames.add(username);

      let userPassword = "";
      if (passwordMode === "same") {
        userPassword = username;
      } else if (passwordMode === "random") {
        userPassword = randomString(passwordLength, charset);
      }
      // "empty" leaves password as ""

      users.push({ username, password: userPassword, profile, customer });
    }

    console.log(`[API] POST /api/mikrotik/users/batch count=${count}`);

    const result = await withRouter(host, port, user, password, async (api, version) =>
      batchAddUsers(api, version, users)
    );

    return NextResponse.json({
      ...result,
      generated: users.map((u) => ({ username: u.username, password: u.password })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[API] Batch users error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
