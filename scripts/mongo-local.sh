#!/usr/bin/env bash
#
# Runs MongoDB locally WITHOUT Docker and WITHOUT root.
#
# Docker is the primary path (see docker-compose.yml), but it needs your user
# to be in the `docker` group. If it isn't — and adding it needs sudo plus a
# re-login — this script downloads the official MongoDB community binaries into
# ./.mongodb (gitignored) and runs mongod as your own user instead.
#
#   ./scripts/mongo-local.sh start    # download if needed, then start
#   ./scripts/mongo-local.sh stop
#   ./scripts/mongo-local.sh status
#
# Data lives in .mongodb/data and survives restarts.

set -euo pipefail

MONGO_VERSION="8.0.4"
DISTRO="ubuntu2404"
ARCH="x86_64"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONGO_DIR="$ROOT_DIR/.mongodb"
DATA_DIR="$MONGO_DIR/data"
LOG_FILE="$MONGO_DIR/mongod.log"
PID_FILE="$MONGO_DIR/mongod.pid"

BUILD="mongodb-linux-${ARCH}-${DISTRO}-${MONGO_VERSION}"
BIN_DIR="$MONGO_DIR/$BUILD/bin"
MONGOD="$BIN_DIR/mongod"

download() {
  if [ -x "$MONGOD" ]; then
    return
  fi

  echo "Downloading MongoDB ${MONGO_VERSION} (one time, ~100MB)..."
  mkdir -p "$MONGO_DIR"
  local url="https://fastdl.mongodb.org/linux/${BUILD}.tgz"
  curl -fL --progress-bar "$url" -o "$MONGO_DIR/mongodb.tgz"
  tar -xzf "$MONGO_DIR/mongodb.tgz" -C "$MONGO_DIR"
  rm -f "$MONGO_DIR/mongodb.tgz"
  echo "MongoDB binaries ready at $BIN_DIR"
}

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start() {
  if is_running; then
    echo "MongoDB is already running (pid $(cat "$PID_FILE")) on port 27017"
    return
  fi

  download
  mkdir -p "$DATA_DIR"

  "$MONGOD" \
    --dbpath "$DATA_DIR" \
    --port 27017 \
    --bind_ip 127.0.0.1 \
    --logpath "$LOG_FILE" \
    --pidfilepath "$PID_FILE" \
    --fork >/dev/null

  echo "MongoDB started on mongodb://localhost:27017 (logs: $LOG_FILE)"
}

stop() {
  if ! is_running; then
    echo "MongoDB is not running"
    return
  fi
  kill "$(cat "$PID_FILE")"
  echo "MongoDB stopped"
}

status() {
  if is_running; then
    echo "running (pid $(cat "$PID_FILE")) on port 27017"
  else
    echo "stopped"
  fi
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 1
    ;;
esac
