#!/bin/bash

# 기획서 사전 점검 도구 자동 설치 및 실행 스크립트

set -e

REPO_URL="https://github.com/dean0208/preflight-checker.git"
INSTALL_DIR="$HOME/preflight-checker"
PORT=3000

echo ""
echo "🔍 기획서 사전 점검 도구를 시작합니다..."
echo ""

# ── Node.js 확인 ────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "⚠️  Node.js가 설치되어 있지 않습니다."
  echo ""
  if command -v brew &> /dev/null; then
    echo "→ Homebrew로 Node.js를 설치합니다..."
    brew install node
  else
    echo "→ https://nodejs.org 에서 Node.js를 설치한 후 다시 실행해주세요."
    exit 1
  fi
fi

echo "✅ Node.js $(node -v) 확인"

# ── Claude Code 확인 ─────────────────────────────────────────────
if [ ! -f "$HOME/.claude/.credentials.json" ]; then
  echo ""
  echo "⚠️  Claude Code 로그인이 필요합니다."
  echo "→ 'claude' 명령어를 실행해서 회사 계정으로 로그인한 후 다시 시도해주세요."
  exit 1
fi

echo "✅ Claude Code 인증 확인"

# ── 이미 실행 중인 경우 처리 ─────────────────────────────────────
if lsof -Pi :$PORT -sTCP:LISTEN -t &> /dev/null; then
  echo ""
  echo "✅ 이미 실행 중입니다. 브라우저를 열겠습니다."
  open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true
  exit 0
fi

# ── 설치 또는 업데이트 ────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "→ 최신 버전으로 업데이트 중..."
  cd "$INSTALL_DIR"
  git pull --quiet origin main 2>/dev/null || true
else
  echo "→ 설치 중... ($INSTALL_DIR)"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# ── 의존성 설치 ────────────────────────────────────────────────────
echo "→ 패키지 설치 중..."
npm install --silent

# ── 서버 실행 ────────────────────────────────────────────────────
echo ""
echo "🚀 서버를 시작합니다..."
echo ""

# 백그라운드로 서버 실행
node server.js &
SERVER_PID=$!

# 서버 뜰 때까지 대기
for i in {1..10}; do
  sleep 0.5
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    break
  fi
done

# 브라우저 자동 오픈
open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true

echo "✅ http://localhost:$PORT 에서 실행 중입니다."
echo ""
echo "종료하려면 Ctrl+C 를 누르세요."
echo ""

# 서버 프로세스 유지
wait $SERVER_PID
