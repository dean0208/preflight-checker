# 기획서 사전 점검 도구

MD 파일 업로드 → AI 자동 진단 → 완성형 개발 프롬프트 복사

---

## 처음 설치 (터미널에 한 줄 붙여넣기)

```bash
git clone https://github.com/dean0208/preflight-checker.git ~/preflight-checker && cd ~/preflight-checker && npm install && npm start
```

---

## 실행

```bash
cd ~/preflight-checker && git pull && npm start
```

3000번 포트를 다른 앱이 쓰고 있으면 3001, 3002 등 빈 포트를 자동으로 찾아 브라우저를 엽니다.

---

## 사전 조건

- Node.js 설치
- Claude Code 회사 계정 로그인
  - 확인: `echo "테스트" | claude -p` 실행 후 응답 확인
  - 로그인 필요: `claude auth login`

---

## 사용 흐름

1. MD 기획서 파일을 올립니다.
2. AI가 활용처를 개인 / 팀 / 전사 / 행사 / 외부 서비스로 판별하고, 그 규모에 맞춰 과도하거나 부족한 설계를 진단합니다.
3. 추천 Claude / OpenAI 모델을 확인하고, 실제 사용할 AI 에이전트에서 해당 모델을 직접 선택합니다.
4. **복사할 개발 프롬프트 만들기**를 누릅니다.
5. 생성된 프롬프트 전체를 복사하여 Claude Code 또는 Codex에 그대로 붙여넣습니다.

사용자가 보완 항목을 입력하거나 MD 파일을 내려받을 필요가 없습니다. 프롬프트에는 기획서 원문과 자동 보완된 최소 설계, 구현·검증 지시가 모두 포함됩니다.

---

API 키 불필요 — 회사 Claude Code 엔터프라이즈 계정을 사용합니다.
