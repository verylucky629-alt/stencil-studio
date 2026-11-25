# CPX 틀니

CPX 51개 토픽이 하나씩 완성될수록 앞니부터 어금니까지 차오르는 진도판.
https://verylucky629-alt.github.io/stencil-studio/cpx-denture/

## 데이터 갱신

페이지는 `data.json` 하나만 읽는다. 노션에 토픽을 채운 뒤 키워드 파일을 갱신하고 아래를 돌리면 된다.

```
python3 work/export_cpx_denture.py                  # work/cpx_keywords.json -> data.json
python3 work/export_cpx_denture.py --rebuild-topics # 노션 원문에서 토픽/기본 대본까지 다시 뽑기
```

그 다음 이 폴더를 커밋해 푸시하면 GitHub Pages에 바로 반영된다.

## 구성

- `index.html` 마크업
- `styles.css` 스타일과 모션
- `app.js` 치열 아치 계산, 51개 치아 매칭, 채우기 모션, 모달, 목록
- `data.json` 토픽 51개 + 완료분 내 답

치아 배치: 상악 26개(13쌍)와 하악 25개. 완료한 순서대로 가운데 앞니에서 바깥 어금니로 채워지고, 상악을 다 채우면 하악으로 넘어간다. 남은 토픽은 번호 순서대로 다음 자리를 받는다.

## 고칠 때

`app.js`나 `styles.css`를 고치면 `index.html` 끝의 `?v=` 숫자를 하나 올려야 폰에 예전 파일이 남지 않는다.
