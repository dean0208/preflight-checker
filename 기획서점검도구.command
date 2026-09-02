#!/bin/bash

# 기획서 점검 도구 실행기
# 이 파일을 더블클릭하면 브라우저가 자동으로 열립니다

INSTALL_DIR="$HOME/preflight-checker"
PORT=3000

# ── 이미 실행 중이면 바로 브라우저 오픈 ─────────────────────────
if lsof -Pi :$PORT -sTCP:LISTEN -t &> /dev/null; then
  open "http://localhost:$PORT"
  exit 0
fi

# ── 설치 안 되어 있으면 먼저 설치 ──────────────────────────────
if [ ! -d "$INSTALL_DIR" ]; then
  osascript -e 'display dialog "처음 실행입니다. 설치를 시작합니다 (약 30초)." buttons {"확인"} default button "확인"'
  curl -fsSL https://raw.githubusercontent.com/dean0208/preflight-checker/main/start.sh | bash
  exit 0
fi

# ── 서버 실행 ───────────────────────────────────────────────────
cd "$INSTALL_DIR"
node server.js &

# 서버 뜰 때까지 대기
for i in {1..10}; do
  sleep 0.5
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    break
  fi
done

open "http://localhost:$PORT"
