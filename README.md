# 기획서 사전 점검 도구

MD 파일 업로드 → AI 자동 분석 → 완성본 기획서 + 에이전트 프롬프트 생성

---

## 처음 설치 (터미널에 한 줄 붙여넣기)

```bash
git clone https://github.com/dean0208/preflight-checker.git ~/preflight-checker && cd ~/preflight-checker && npm install && npm start
```

브라우저가 자동으로 열립니다.

---

## 두 번째부터

`~/preflight-checker` 폴더에서 `기획서점검도구.command` 더블클릭

---

## 사전 조건

- Node.js 설치 (없으면 https://nodejs.org 에서 설치)
- Claude Code 회사 계정 로그인 필요
  - 확인: 터미널에서 `echo "테스트" | claude -p` 실행 시 응답 오면 OK
  - 안 되면: `claude auth login` 실행 후 로그인

---

## 사용 방법

1. MD 기획서 파일 드래그앤드롭
2. AI가 활용처 자동 판단 + 6개 항목 점검
3. 진단 결과 확인 (과도한 설계 / 부족한 설계 경고 포함)
4. 보완 항목 — AI 추천 답변 미리 입력됨 (그대로 제출 or 수정)
5. 완성된 기획서 MD 다운로드 + 에이전트 프롬프트 복사

---

API 키 불필요 — 회사 Claude Code 엔터프라이즈 계정 자동 사용
