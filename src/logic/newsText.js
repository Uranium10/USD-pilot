// 속보 본문에서 화면상 중복되는 종목명 접두사만 걷어내는 순수 함수.
//
// 시장 데이터의 news.text는 로컬 생성기(`${종목명}, …`)와 AI 컴파일러(기업명이 문장에
// 없을 때만 같은 형태로 보충) 양쪽 모두 "종목명이 앞에 붙어 있을 수 있는" 문자열이다.
// LIVE WIRE 패널은 종목명을 본문 위에 따로 표시하므로 본문에서는 그 접두사를 뺀다.
//
// 2026-08-10: 예전 구현은 `^[^,:]{1,30}[,:]\s*`로 "앞쪽 구두점까지"를 무조건 잘라냈다.
// 로컬 생성기 형식에는 맞았지만 AI가 쓴 자연스러운 문장까지 같은 규칙에 걸려,
// `감사원 발표에 따르면, 오비탈 레일이 …`에서는 출처 절이 통째로 사라지고
// `셀레네 드릴, 3광구 …`에서는 주어가 잘렸다. 잘 쓰인 문장일수록 더 크게 훼손되는
// 구조였다. 이제는 실제로 그 종목 이름으로 시작할 때만 제거한다.
export function newsBody(text, name) {
  const value = String(text || '')
  const trimmed = value.trimStart()
  if (!name || !trimmed.startsWith(name)) return value
  const rest = trimmed.slice(name.length)
  const separator = rest.match(/^\s*[,，:：]\s*/)
  return separator ? rest.slice(separator[0].length) : value
}
