const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Claude Code CLI로 AI 호출 (회사 엔터프라이즈 계정 인증 그대로 사용, 비용 없음)
function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'claude',
      ['-p', '--output-format', 'text'],
      { timeout: 120000, maxBuffer: 1024 * 1024 * 10 },
      (err, stdout, stderr) => {
        if (err) {
          const msg = stderr || err.message || '';
          if (msg.includes('authenticate') || msg.includes('OAuth') || msg.includes('expired')) {
            return reject(new Error('Claude Code 로그인이 필요합니다. 터미널에서 claude 를 실행해서 회사 계정으로 로그인해주세요.'));
          }
          return reject(new Error(msg || err.message));
        }
        resolve(stdout.trim());
      }
    );
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

// ── 완성본 MD + 에이전트 프롬프트 생성 ───────────────────────
app.post('/complete', async (req, res) => {
  const { original_content, answers, analysis } = req.body;

  const answersText = Object.entries(answers || {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n') || '(추가 답변 없음)';

  const prompt = `당신은 소프트웨어 기획서 작성 전문가입니다.
아래 원본 기획서와 추가 답변을 합쳐서 두 가지를 JSON으로 출력하세요.
JSON 외 다른 텍스트는 절대 출력하지 마세요.

{
  "completed_md": "완성된 기획서 전체 (순수 MD 형식, 개발자가 바로 참고할 수 있게 구체적으로)",
  "agent_prompt": "AI 코딩 에이전트용 지시 프롬프트 (5~7문장, 아래 정의서를 기반으로... 로 시작, 기술스택/핵심기능/완료기준 포함, 순수 텍스트)"
}

규칙:
- completed_md: 원본 내용 최대한 유지, 누락 항목 자연스럽게 보완, 순수 MD
- agent_prompt: 마크다운 없이 순수 텍스트 5~7문장

[원본 기획서]
${original_content}

[추가 답변]
${answersText}

[분석 메모]
배포유형: ${analysis?.deploy_type_label || ''}
리스크: ${(analysis?.risks || []).join(', ')}`;

  try {
    const text = await callClaude(prompt);
    const result = extractJSON(text);
    res.json({
      completed_md: result.completed_md || '',
      agent_prompt: result.agent_prompt || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '완성본 생성 오류: ' + err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n✅ 기획서 점검 도구 실행 중`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`\n📌 Claude Code 엔터프라이즈 계정으로 실행됩니다 (비용 없음)\n`);
});
