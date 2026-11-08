#!/bin/sh
set -eu

PORT=3000 HOSTNAME=127.0.0.1 node /app/server.js &
NEXT_PID=$!

nginx -g "daemon off;" &
NGINX_PID=$!

term() {
  kill -TERM "$NEXT_PID" "$NGINX_PID" 2>/dev/null || true
  wait "$NEXT_PID" 2>/dev/null || true
  wait "$NGINX_PID" 2>/dev/null || true
}

trap term INT TERM

while kill -0 "$NEXT_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 1
done

term
exit 1
