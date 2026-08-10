# U.S.D 제출 문서 초안

이 폴더는 공모전/해커톤 제출 화면의 PDF 항목에 맞춘 초안이다.

## 문서 구성

| 제출 항목 | 초안 파일 | 상태 |
|---|---|---|
| NAN2026 포지셔닝 | `00_NAN2026_POSITIONING.md` | 각 PDF의 첫 1~2페이지에 재사용 |
| 게임 소개 및 설명 문서 | `01_GAME_OVERVIEW_DRAFT.md` | 본문 초안 완료, 화면 캡처 필요 |
| AI 활용 기술 문서 | `02_AI_TECHNICAL_DOCUMENT_DRAFT.md` | 본문 초안 완료, 아키텍처 그림 정리 필요 |
| 팀 소개 문서 | `03_TEAM_INTRODUCTION_TEMPLATE.md` | 팀 정보 입력 필요 |
| 포트폴리오 및 참고자료 | `04_PORTFOLIO_REFERENCES_TEMPLATE.md` | 선택 제출용 템플릿 |

## PDF 제작 권장 순서

1. 모든 `[입력 필요: ...]` 항목을 검색해 실제 정보로 교체한다.
2. 게임 화면은 16:9 또는 원본 비율로 캡처하고 개인정보·API 키가 보이지 않는지 확인한다.
3. Markdown을 Google Docs, Notion, Typora, Obsidian 또는 Pandoc로 불러온다.
4. 본문 글꼴은 Noto Sans KR/Pretendard 10.5~11pt, 제목은 18~24pt를 권장한다.
5. 표와 코드가 페이지 밖으로 잘리지 않는지 확인한 뒤 PDF로 내보낸다.
6. PDF 파일명에는 팀명과 프로젝트명을 포함한다.

권장 파일명:

```text
[팀명]_USD_게임소개.pdf
[팀명]_USD_AI활용기술.pdf
[팀명]_USD_팀소개.pdf
[팀명]_USD_포트폴리오.pdf
```

## 제출 전 공통 확인

- 배포 URL과 저장소 URL이 실제로 열리는가
- 테스트 계정이 필요하다면 계정 정보가 적혀 있는가
- 화면 캡처가 현재 빌드와 일치하는가
- 개발용 환경 변수와 API 키가 노출되지 않았는가
- 실험 모델과 현재 운영 모델이 구분되어 있는가
- 비용은 런타임 AI 비용과 개발 도구 비용을 혼동하지 않았는가
- 팀원 이름, 역할, 기여 내용이 최종 합의와 일치하는가

## 현재 구현 기준

- 문서 기준일: 2026-08-10
- 현재 주간 시나리오 모델: `gpt-5.6-luna`, reasoning `low`
- 전체 서사 RunPlan 모델: `claude-opus-5`, effort `high` (사전 생성 풀)
- 짧은 보조 텍스트 모델: `gemini-3.6-flash` (보조/실험 경로)
- 프론트엔드: React 19, Vite 8, Zustand
- 서버/저장: Vercel Functions, Turso(libSQL), localStorage 보조 백업

## 문서 전체의 중심 메시지

> **U.S.D는 AI로 콘텐츠를 만든 게임을 넘어, AI가 한 런의 시장 서사를 계획하고 매주 플레이 조건을 연출하는 게임이다.**

모든 제출 문서는 아래 세 근거를 같은 순서로 보여 주는 것이 좋다.

1. **AI Director:** RunPlan이 7주 전체를 계획하고 CycleScenario가 매주 사건을 연출한다.
2. **Playable Consequence:** AI 사건이 뉴스 문장에 머물지 않고 종목·방향·크기·시점·정보에 연결된다.
3. **Production Discipline:** 프리페치, 검증·재시도, 캐시, fallback과 실측 벤치마크로 실제 플레이 가능한 시스템을 만들었다.

"AI가 모든 것을 한다"고 과장하지 않는다. 가격 수치, 거래 체결, 부채와 엔딩은 결정론적 게임 코드가 통제하고, AI는 반복 플레이의 의미와 연출을 담당한다. 이 역할 분리가 U.S.D의 기술적 설계 포인트다.
