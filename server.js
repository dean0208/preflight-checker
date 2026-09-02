const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');
const net = require('net');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 빈 포트 자동 탐색
function findFreePort(start = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => {
      server.close();
      findFreePort(start + 1).then(resolve).catch(reject);
    });
    server.once('listening', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.listen(start);
  });
}

// Claude Code CLI로 AI 호출 (회사 엔터프라이즈 계정 인증 그대로 사용, 비용 없음)
// 로그인 쉘로 실행해서 각자 PC의 PATH에서 claude를 찾음
function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    // 로그인 쉘(-l)로 실행 → 각자 PC의 ~/.zshrc, ~/.bashrc 등 PATH 적용
    const child = spawn(
      '/bin/bash',
      ['-l', '-c', 'claude -p --output-format text'],
      { timeout: 120000 }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);

    child.on('close', code => {
      if (code !== 0) {
        const msg = `${stderr}\n${stdout}`.trim();
        if (msg.includes('session limit') || msg.includes('rate limit') || msg.includes('usage limit')) {
          const reset = msg.match(/resets\s+([^\n]+)/i)?.[1];
          return reject(new Error(`Claude Code 사용 한도에 도달했습니다.${reset ? ` 초기화: ${reset}` : ''} 한도 초기화 후 다시 시도해주세요.`));
        }
        if (msg.includes('authenticate') || msg.includes('OAuth') || msg.includes('expired') || msg.includes('login')) {
          return reject(new Error('Claude Code 로그인이 필요합니다. 터미널에서 claude auth login 을 실행해주세요.'));
        }
        if (msg.includes('command not found') || msg.includes('No such file')) {
          return reject(new Error('Claude Code가 설치되어 있지 않습니다. claude.ai에서 Claude Code를 설치해주세요.'));
        }
        return reject(new Error(msg || `exit code ${code}`));
      }
      resolve(stdout.trim());
    });

    child.on('error', err => reject(new Error(err.message)));
    child.stdin.write(prompt, 'utf8');
    child.stdin.end();
  });
}

function extractJSON(text) {
  const cleaned = text.replace(/^```[a-z]*\n?/gm, '').replace(/^```\s*$/gm, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('응답에서 JSON을 찾을 수 없습니다.\n' + cleaned.slice(0, 300));
  return JSON.parse(match[0]);
}

// ── 분석 ──────────────────────────────────────────────────────
app.post('/analyze', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'MD 내용이 없습니다.' });

  const prompt = `당신은 비개발자가 작성한 소프트웨어 기획서를 점검하는 전문가입니다.
기획서를 읽고 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 출력하지 마세요.

{
  "usage_type": "personal",
  "usage_type_label": "개인 업무 효율화",
  "usage_type_desc": "활용처 한 줄 설명",
  "deploy_type": "local",
  "deploy_type_label": "로컬 실행용",
  "score": 62,
  "summary": "기획서 한 줄 요약",
  "volume_guide": "이 활용처에 맞는 적정 볼륨/복잡도 가이드 2~3문장 (과도한 설계 경고 또는 부족한 설계 경고 포함)",
  "sections": [
    { "id": "purpose",        "name": "목적 & 사용자",  "status": "good",    "message": "상태 설명", "suggestion": "", "question": "", "ai_answer": "" },
    { "id": "infrastructure", "name": "인프라",         "status": "warning", "message": "상태 설명", "suggestion": "보완 제안", "question": "질문", "ai_answer": "맥락에 맞는 AI 추천 답변 2~3문장" },
    { "id": "security",       "name": "보안",           "status": "missing", "message": "상태 설명", "suggestion": "보완 제안", "question": "질문", "ai_answer": "맥락에 맞는 AI 추천 답변 2~3문장" },
    { "id": "data",           "name": "데이터 관리",    "status": "good",    "message": "상태 설명", "suggestion": "", "question": "", "ai_answer": "" },
    { "id": "complexity",     "name": "기술 난이도",    "status": "good",    "message": "상태 설명", "suggestion": "", "question": "", "ai_answer": "" },
    { "id": "completeness",   "name": "기획 완성도",    "status": "warning", "message": "상태 설명", "suggestion": "보완 제안", "question": "질문", "ai_answer": "맥락에 맞는 AI 추천 답변 2~3문장" }
  ],
  "risks": ["주요 리스크1", "주요 리스크2"],
  "recommended_models": {
    "claude": { "model": "claude-sonnet-4.5", "reason": "추천 이유" },
    "openai": { "model": "gpt-4o", "reason": "추천 이유" }
  }
}

━━━ 활용처(usage_type) 분류 기준 ━━━
기획서에서 누가, 어떤 목적으로 쓰는지를 우선 판단하세요.

"personal"     → 개인 업무 효율화
  - 혼자 또는 1~2명이 사용
  - 예: 내 일정 정리, 개인 메모, 나만 쓰는 자동화 스크립트
  - 적정 볼륨: 로컬 실행, DB는 파일/SQLite면 충분, 인증 불필요

"team"         → 팀/부서 내부 도구
  - 특정 팀(5~30명)이 사용
  - 예: 팀 일정 공유, 부서 내 업무 현황판, 회의록 관리
  - 적정 볼륨: 사내 서버 또는 간단한 클라우드, 기본 인증 필요

"company"      → 전사 배포 서비스
  - 회사 전직원(30명~) 또는 전사 프로세스에 연결
  - 예: 전사 공지 시스템, 사내 인트라넷, 전사 결재 도구
  - 적정 볼륨: 안정적 서버, 백업, 권한 관리, 보안 필수

"event"        → 행사/캠페인 일회성 도구
  - 특정 행사나 이벤트에 한정 사용, 이후 불필요
  - 예: 행사 만족도 조사, 투표 시스템, 이벤트 QR 체크인
  - 적정 볼륨: 최소한의 스택, 행사 당일만 안정적이면 OK, 복잡한 설계 불필요

"product"      → 외부 공개 서비스/제품
  - 고객이나 외부 사용자가 접근
  - 예: 회사 서비스 앱, 고객용 포털, B2B SaaS
  - 적정 볼륨: 확장성, 보안, 모니터링, 비용 설계 필수

━━━ 점검 기준: 활용처에 맞게 조정 ━━━
각 섹션을 점검할 때 반드시 usage_type을 기준으로 판단하세요.

[personal/event 기획서에서 경고해야 할 과도한 설계]
- DB를 RDS/MySQL/PostgreSQL로 쓰려는 경우 → SQLite나 파일로도 충분
- 인증/로그인 시스템 구축 → 불필요한 복잡도
- 클라우드 서버 비용이 발생하는 배포 → 로컬이나 무료 플랜으로 충분
- MSA, 마이크로서비스, 쿠버네티스 언급 → 명백한 과설계
- CI/CD 파이프라인 → 혼자 쓰는 도구에 불필요

[team/company 기획서에서 경고해야 할 부족한 설계]
- 인증/권한 관리 없음 → 팀 도구에 필수
- 데이터 백업 계획 없음 → 팀 데이터 유실 위험
- 로컬에서만 실행 → 팀원 접근 불가

[product 기획서에서 경고해야 할 부족한 설계]
- 보안 설계 없음 → 외부 서비스에 치명적
- 비용 설계 없음 → 트래픽 증가 시 파산 위험
- 모니터링/알림 없음 → 장애 대응 불가

━━━ 나머지 규칙 ━━━
- deploy_type: "local" / "internal" / "public"
- status: "good" / "warning" / "missing"
- suggestion: good이면 빈 문자열
- question: warning/missing일 때 질문, good이면 빈 문자열
- ai_answer: warning/missing 항목에 대해 이 기획서의 usage_type과 맥락을 반영한 구체적 추천 답변 (사용자가 그대로 제출해도 될 만큼), good이면 빈 문자열
- volume_guide: 이 기획서가 활용처 대비 과도하게 크거나 부족하게 설계된 부분이 있으면 명확히 지적
- Claude 추천: claude-opus-4 / claude-sonnet-4.5 / claude-haiku-4.5 중 usage_type과 복잡도에 맞게
- OpenAI 추천: gpt-4o / gpt-4o-mini / o3 / o4-mini 중 usage_type과 복잡도에 맞게
- 모든 텍스트 한국어

분석할 기획서:
${content}`;

  try {
    const text = await callClaude(prompt);
    const result = extractJSON(text);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI 분석 오류: ' + err.message });
  }
});

// ── 복붙 전용 AI 개발 프롬프트 생성 ─────────────────────────
app.post('/complete', async (req, res) => {
  const { original_content, analysis } = req.body;
  const recommended = analysis?.recommended_models || {};

  const prompt = `당신은 비개발자가 AI 코딩 에이전트에게 바로 붙여넣을 개발 지시문을 작성하는 전문가입니다.
원본 기획서와 진단 결과를 반영해, 사용자가 수정 없이 그대로 복사해 Claude Code나 Codex에 붙여넣을 수 있는 "완성형 개발 프롬프트" 하나를 작성하세요.

필수 규칙:
- 순수 텍스트 또는 Markdown으로만 작성하고, 인사말/해설은 넣지 마세요.
- "아래 정의서를 기반으로"로 시작하세요.
- 원본 기획의 의도는 유지하되, 진단에서 발견한 누락·리스크는 활용처에 맞는 최소 설계로 이미 결정해서 반영하세요. 사용자에게 추가 질문하지 마세요.
- 활용처가 personal 또는 event이면 유료 인프라, 로그인, 복잡한 DB, 과도한 보안·운영 설계를 강요하지 마세요.
- 활용처가 team/company/product면 필요한 인증·백업·권한·보안 요구사항을 빠뜨리지 마세요.
- 반드시 포함: 목적과 사용자 / 선택할 기술 스택 / 구현할 핵심 기능 / 데이터 및 배포 방식 / 완료·검증 기준 / 하지 말아야 할 과도한 설계.
- 구현자는 먼저 프로젝트 구조와 현재 파일을 점검하고, 구현 후 실제 실행·테스트까지 완료해야 한다고 명시하세요.
- 모델은 사용자가 UI에서 직접 선택하므로, 특정 모델 사용을 지시하지 마세요.

[원본 기획서]
${original_content}

[자동 진단 결과]
활용처: ${analysis?.usage_type_label || ''}
배포 유형: ${analysis?.deploy_type_label || ''}
적정 볼륨: ${analysis?.volume_guide || ''}
주요 리스크: ${(analysis?.risks || []).join(', ')}
세부 점검: ${(analysis?.sections || []).map(s => `${s.name}: ${s.status} - ${s.suggestion || s.message || ''}`).join('\n')}

[UI에 별도 표시할 모델 추천]
Claude: ${recommended.claude?.model || ''} (${recommended.claude?.reason || ''})
OpenAI: ${recommended.openai?.model || ''} (${recommended.openai?.reason || ''})`;

  try {
    const agentPrompt = await callClaude(prompt);
    if (!agentPrompt) throw new Error('생성된 프롬프트가 비어 있습니다.');
    res.json({ agent_prompt: agentPrompt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '프롬프트 생성 오류: ' + err.message });
  }
});

const { execSync } = require('child_process');

findFreePort(3000).then(PORT => {
  app.listen(PORT, () => {
    console.log(`\n✅ 기획서 점검 도구 실행 중`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`\n📌 Claude Code 엔터프라이즈 계정으로 실행됩니다 (비용 없음)\n`);

    // 브라우저 자동 오픈
    try {
      execSync(`open http://localhost:${PORT}`);
    } catch (_) {}
  });
});
