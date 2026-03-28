"use client";

import { useCallback, useEffect, useState } from "react";

interface RouterConnectionState {
  isConnected: boolean;
  routerVersion: number;
  isLoading: boolean;
}

export function useRouterConnection() {
  const [state, setState] = useState<RouterConnectionState>({
    isConnected: false,
    routerVersion: 6,
    isLoading: true,
  });

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/connect");
      const data = await res.json();
      setState({
        isConnected: data.connected === true,
        routerVersion: data.routerVersion || 6,
        isLoading: false,
      });
    } catch {
      setState({ isConnected: false, routerVersion: 6, isLoading: false });
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const disconnect = useCallback(async () => {
    try {
      await fetch("/api/mikrotik/connect", { method: "DELETE" });
      setState({ isConnected: false, routerVersion: 6, isLoading: false });
    } catch {
      // ignore
    }
  }, []);

  return {
    ...state,
    disconnect,
    refresh: checkConnection,
  };
}
