# 기획서 사전 점검 도구

MD 파일 업로드 → AI 자동 분석 → 완성본 기획서 + 에이전트 프롬프트 생성

---

## 실행 방법 (터미널에 한 줄만 붙여넣기)

```bash
curl -fsSL https://raw.githubusercontent.com/dean0208/preflight-checker/main/start.sh | bash
```

브라우저가 자동으로 열립니다.

---

## 사전 조건

- **Claude Code 회사 계정 로그인** 필요
  - 로그인 안 되어 있으면: `claude` 실행 후 로그인
- Node.js 없으면 자동 설치됨 (Mac Homebrew 기준)

---

## 사용 방법

1. MD 기획서 파일 드래그앤드롭
2. AI가 자동 분석 (활용처 판단 + 6개 항목 점검)
3. 진단 결과 확인 — 과도한 설계 / 부족한 설계 경고 포함
4. 보완 항목 확인 — AI 추천 답변 미리 입력됨 (그대로 제출 or 수정)
5. 완성된 기획서 MD 다운로드 + 에이전트 프롬프트 복사

---

## API 키 불필요

회사 Claude Code 엔터프라이즈 계정을 자동으로 사용합니다.
