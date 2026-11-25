# 💧 만성 탈수 탈출 챌린지 (수분 게코)

아이폰 Safari에 맞춘 한 페이지 웹 게임이에요. 하루 1,500ml를 채우면 게코가 진화합니다.

- 주소: https://verylucky629-alt.github.io/stencil-studio/hydro-gecko/
- 홈 화면에 추가하면 앱처럼 전체 화면으로 열립니다.

## 게임 규칙

| 레벨 | 진화 | XP |
| --- | --- | --- |
| Lv.1 | 바싹 마른 선인장 | 0 ~ 99 |
| Lv.2 | 이슬 머금은 새싹 | 100 ~ 249 |
| Lv.3 | 촉촉한 크레스티드 게코 | 250 ~ 499 |
| Lv.4 | 수분 풀충전 오아시스 | 500 ~ 999 |
| Lv.5 | 걸어다니는 에비앙 마스터 | 1000 이상 |

오늘의 퀘스트

- 09:00 모닝 워터 250ml +10 XP
- 13:00 점심 포션 300ml +15 XP
- 17:00 오후 버프 300ml +15 XP
- 20:30 나이트 한 모금 200ml +10 XP
- 자유 한 컵 150ml +10 XP (여러 번 가능)
- 카페인 기록: 아메리카노 150mg, 에스프레소·라떼 75mg, 에너지드링크 100mg, 녹차 30mg 프리셋과 직접 mg 입력
  - 카페인 100mg당 물 150ml를 오늘 목표에 더합니다. (예: 150mg → 목표 1,725ml)
  - 기록할 때마다 탈수 디버프 1개(최대 3개). 다음 맹물 한 잔에 디버프 해제 + 20 XP 보너스
  - 보통 하루 300mg 이하에서는 큰 이뇨 탈수가 없지만, 챌린지에서는 수분 보충을 위해 100mg당 150ml를 더 권장합니다

## 저장 구조

1. 기기(localStorage, 키 `hydroGecko:state:v2`)에 즉시 저장합니다. 웹에서 누른 기록은 여기에 남습니다.
2. 페이지를 열 때 `./state.json`을 읽어 병합합니다.
   - 같은 `lastDate`면 `xp`, `todayMl`, `completedQuests`를 큰 값 기준으로 합칩니다.
   - `state.json`의 날짜가 더 최신이면 그 날 값으로 넘어가고 누적 XP는 유지합니다.
   - `history`는 날짜별로 `ml`, `xp`, `goal`, `q`, `caf`(카페인 mg)를 큰 값 기준으로 합칩니다.
   - 카페인도 오늘 값(`caffeineMg`)을 큰 값 기준으로 합치고, 기록 목록은 id 기준으로 합집합합니다.
   - `caffeineMg`, `caffeineLog`가 없는 예전 `state.json`을 읽어도 기기 기록은 그대로 유지됩니다.
3. 그래서 채팅에서 "물 마셨어"라고 하면 메인 에이전트가 `state.json`을 갱신해 커밋, 푸시하면 다음에 페이지를 열 때 자동으로 반영됩니다.

`state.json` 예시

```json
{
  "xp": 120,
  "streak": 2,
  "bestStreak": 2,
  "lastDate": "2026-11-24",
  "todayMl": 550,
  "todayXp": 65,
  "totalMl": 3200,
  "coffeeDebuff": 0,
  "caffeineMg": 150,
  "caffeineLog": [{ "id": "c1", "name": "아메리카노", "mg": 150, "day": "2026-11-24", "at": "2026-11-24T14:10:00+09:00" }],
  "completedQuests": ["morning", "lunch"],
  "history": { "2026-11-24": { "ml": 550, "xp": 65, "goal": false, "q": 2, "caf": 150 } },
  "badges": ["first-sip"],
  "updatedAt": "2026-11-24T22:40:00+09:00"
}
```

`completedQuests`에 쓰는 id: `morning`, `lunch`, `afternoon`, `night`. 자유 한 컵은 `freeCups` 숫자로 셉니다.

## 파일

- `index.html`: 화면 구조와 캐릭터 SVG 5종
- `style.css`: 모바일 우선 스타일, 안전 영역, 애니메이션
- `app.js`: 상태, 퀘스트, 레벨, 스트릭, 도장판, 배지, state.json 병합
- `state.json`: 채팅 쪽에서 갱신하는 원격 상태
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `icon-180.png`: 홈 화면 아이콘

## 배포 위치

지금은 GitHub 연결에 저장소 생성 권한이 없어서 `stencil-studio` 저장소의 `hydro-gecko/` 폴더로 배포했습니다. 전용 저장소(`hydro-gecko`)를 만들 수 있게 되면 이 폴더를 그대로 옮기고 Pages를 켜면 됩니다.

## 검증 팁

브라우저 콘솔에서 `__hydro.getState()`로 현재 상태를, `__hydro.getLevel()`로 레벨을, `__hydro.getGoal()`로 오늘 목표(기본+카페인 보정)를 확인할 수 있습니다. `__hydro.addCaffeine(150)`로 카페인 기록도 시험해 볼 수 있습니다.
