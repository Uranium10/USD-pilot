# Luna/low 실험 설정 백업

2026-08-10 기준 비교 실험에 사용하던 주간 생성 후보를 보존한다.

- 모델: `gpt-5.6-luna`
- 추론 강도: `low`
- 최종 실험 커밋: `d15effc5de098c7b7397c412f0f27e4a313d219c`
- 모델 설정: `d15effc5:server/ai/config.js`
- 생성·검증 로직: `d15effc5:server/ai/cycleScenarioModel.js`
- 장문 프롬프트: `d15effc5:server/ai/prompts/cycleScenario.js`
- 스키마: `CYCLE_SCENARIO_SCHEMA` (slim)

프롬프트 원문은 Git에서 아래 명령으로 완전히 복구할 수 있다.

```powershell
git show d15effc5:server/ai/prompts/cycleScenario.js
```

운영 설정은 한국어 뉴스·소문 품질을 위해 `gpt-5.6-terra` / `medium`으로 유지한다.
