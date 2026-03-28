import { NextResponse } from "next/server";
import { withRouter, batchAddUsersSingle } from "@repo/mikrotik";
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
      passwordMode = "same",
      passwordLength = 6,
      charset: charsetKey = "alphanumeric",
      profile = "",
      customer = "admin",
      stream = false,
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

      users.push({ username, password: userPassword, profile, customer });
    }

    console.log(`[API] POST /api/mikrotik/users/batch count=${count} stream=${stream}`);

    // Streaming mode: send progress events via SSE
    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const success: string[] = [];
          const failed: { username: string; error: string }[] = [];

          try {
            await withRouter(host, port, user, password, async (api, version) => {
              for (let i = 0; i < users.length; i++) {
                const u = users[i]!;
                try {
                  await batchAddUsersSingle(api, version, u);
                  success.push(u.username);
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  failed.push({ username: u.username, error: msg });
                }

                // Send progress event
                const progress = {
                  current: i + 1,
                  total: users.length,
                  percent: Math.round(((i + 1) / users.length) * 100),
                  lastUser: u.username,
                  lastStatus: failed.find((f) => f.username === u.username) ? "failed" : "success",
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`));
              }
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: msg })}\n\n`));
          }

          // Send final result
          const result = {
            type: "done",
            success,
            failed,
            generated: users.map((u) => ({ username: u.username, password: u.password })),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming fallback
    const result = await withRouter(host, port, user, password, async (api, version) => {
      const success: string[] = [];
      const failed: { username: string; error: string }[] = [];
      for (const u of users) {
        try {
          await batchAddUsersSingle(api, version, u);
          success.push(u.username);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          failed.push({ username: u.username, error: msg });
        }
      }
      return { success, failed };
    });

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
