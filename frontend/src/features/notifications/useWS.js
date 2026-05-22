import { useEffect, useRef } from "react";
import { useAuthStore } from "../../auth/store";
import { toast } from "sonner";
import { useNotificationsStore } from "./store";

import snotificationSound from "./notificationsound.mp3";
import notificationIcon from './notification.png';


export function useWS() {
  const token = useAuthStore((s) => s.token);

  const wsRef = useRef(null);

  const addIncoming = useNotificationsStore((s) => s.addIncoming);

  const audioRef = useRef(new Audio(notificationSound));
  

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    if (!token) return;

    const url =
      (import.meta.env.VITE_WS_BASE || "ws://localhost:8005") +
      `/ws?token=${token}`;

    const ws = new WebSocket(url);

    wsRef.current = ws;

    ws.onopen = () => {};

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        if (msg.type === "notification") {
          addIncoming(msg.data);

          // replay sound every notification
          audioRef.current.currentTime = 0;

          audioRef.current.play().catch(() => {});

          toast(msg.data.title, {
            description: msg.data.message,
          });
          if (Notification.permission === "granted") {
            new Notification(msg.data.title, {
              body: msg.data.message,

              icon: notificationIcon,
            });
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {};

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, 20000);

    return () => {
      clearInterval(ping);

      try {
        ws.close();
      } catch {}
    };
  }, [token, addIncoming]);
}
