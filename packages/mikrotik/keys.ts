import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      ROUTER_SESSION_SECRET: z.string().min(32).optional(),
    },
    client: {},
    runtimeEnv: {
      ROUTER_SESSION_SECRET: process.env.ROUTER_SESSION_SECRET,
    },
  });
