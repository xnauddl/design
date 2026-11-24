# 컴포넌트 · 타이포그래피 자동화 — 사용자 정의서 (원문)

> 2026-11-24 사용자가 준 정의서를 그대로 옮긴 문서다. 고치지 않는다 — 바뀌는 결정은 `tech-design.md`와 명세에 적는다.
> 배경: 옛 컴포넌트 기능은 지우고(SC-D13 — `docs/qa/2026-11-24-scope-review.md`) 정의 · 기획부터 새로 만든다. 1–7장이 컴포넌트, 8장이 타이포그래피, 맨 아래가 같은 날 보충(Font Size).

# Figma Auto Component & Variant Generator

## 1. 프로젝트 목적

Figma에 디자인된 프레임을 자동으로 분석하여 동일한 구조를 가진 디자인 요소를 식별하고, 이를 Component 및 Component Set(Variants)으로 자동 등록하는 Figma Plugin을 개발한다.

단순히 외형이 비슷한 요소를 그룹화하는 것이 아니라, 레이어 계층 구조, 하위 노드 구성, 레이아웃 속성, 텍스트 및 스타일 속성을 종합적으로 분석하여 컴포넌트화 가능성을 판단해야 한다.

기존에 디자인된 프레임의 구조와 시각적 결과물은 최대한 유지하면서 Main Component와 Instance 관계를 생성하는 것을 핵심 목표로 한다.

## 2. 핵심 기능

### 2-1. 프레임 구조 분석

현재 선택한 프레임 또는 지정한 페이지 내 모든 프레임을 분석한다.

분석 항목은 다음과 같다.

- 레이어 계층 구조 및 Depth
- 레이어 유형(Frame, Rectangle, Text, Vector 등)
- 하위 노드 개수 및 순서
- Auto Layout 적용 여부
- Layout 방향 및 정렬 방식
- Padding 및 Item Spacing
- Width / Height 및 Resizing 설정
- Corner Radius
- Fill / Stroke / Effect
- Typography 속성
- Text Content
- Clip Content 및 기타 시각적 속성

단, 텍스트 내용, 색상, 크기, 정렬 등 변경 가능한 속성만 다르다는 이유로 서로 다른 구조라고 판단해서는 안 된다.

### 2-2. 동일 구조 자동 컴포넌트화

동일한 레이어 계층 구조와 하위 노드 구성을 가진 프레임을 하나의 컴포넌트 그룹으로 분류한다.

처리 방식:

1. 동일 구조를 가진 프레임을 탐색한다.
2. 구조적 유사성을 분석한다.
3. 대표 프레임 하나를 Main Component로 등록한다.
4. 나머지 프레임은 해당 Main Component의 Instance로 교체한다.
5. 기존 디자인의 시각적 속성과 배치를 유지한다.

예시:

- Frame A: Icon + Text + Background
- Frame B: Icon + Text + Background
- Frame C: Icon + Text + Background

위 세 프레임은 동일한 구조이므로 하나의 Main Component와 두 개의 Instance로 구성한다.

### 2-3. 속성 차이에 따른 Variant 자동 분류

동일한 구조를 가지고 있지만 시각적 속성이 다른 경우에는 각각 별도의 Component로 만들지 않고 하나의 Component Set으로 통합한다.

다음 속성을 Variant 분류 기준으로 활용한다.

| 속성 | 분류 예시 |
|---|---|
| Color | Primary / Secondary / Neutral |
| Size | Small / Medium / Large |
| Alignment | Left / Center / Right |
| State | Default / Hover / Selected / Disabled |
| Style | Filled / Outlined / Ghost |

예시:

Button 구조가 동일하지만 색상, 크기, 정렬이 다른 경우:

Component Set: Button

- Color=Primary, Size=Medium, Alignment=Center
- Color=Secondary, Size=Medium, Alignment=Center
- Color=Primary, Size=Large, Alignment=Center
- Color=Neutral, Size=Small, Alignment=Left

각 조합은 하나의 Component Set 안에 Variant로 등록한다.

### 2-4. 누락된 Variant 자동 생성

동일한 구조에서 확인된 속성의 전체 조합을 분석하여 누락된 Variant를 탐색한다.

예시:

현재 발견된 Variant:
- Color=Primary, Size=Small
- Color=Primary, Size=Medium
- Color=Secondary, Size=Small

분석된 속성:
- Color: Primary, Secondary
- Size: Small, Medium

누락된 Variant:
- Color=Secondary, Size=Medium

누락된 조합은 Component Set에 빈 Variant로 추가한다.

빈 Variant는 기존 디자인을 임의로 복제하거나 새로운 시각적 디자인을 만들어내지 않는다. 기준이 되는 Variant의 구조를 유지하되, 누락된 조합임을 명확하게 구분하고 추후 디자인 작업이 가능하도록 구성한다.

Figma API에서 완전히 비어 있는 Variant를 생성할 수 없는 경우에는 기준 Variant를 복제하여 구조를 유지하고, 해당 조합의 속성을 지정한 뒤 누락 상태로 표시하는 방식을 사용한다.

### 2-5. 기존 디자인에 Instance 적용

컴포넌트 등록 이후 기존 프레임을 해당 Component의 Instance로 교체한다.

필수 조건:

- 기존 프레임의 위치 유지
- Width / Height 유지
- Auto Layout 유지
- 내부 요소의 상대적 위치 유지
- 색상 및 Typography 유지
- 기존 텍스트 콘텐츠 유지
- 정렬 및 간격 유지
- Instance Override 보존

기존 디자인이 Main Component와 Instance로 교체되더라도 화면상 결과물은 변경 전과 동일해야 한다.

## 3. 구조 분석 및 그룹화 원칙

다음 세 가지 기준으로 구분한다.

**Type A. 완전히 동일한 구조와 속성**

하나의 Main Component를 만들고 나머지는 Instance로 변환한다.

**Type B. 구조는 동일하고 속성만 다름**

하나의 Component Set을 만들고 속성 차이를 Variants로 분류한다.

**Type C. 구조 자체가 다름**

별개의 Component로 관리한다.

주의사항:

- 레이어 이름이 다르다는 이유만으로 다른 구조로 판단하지 않는다.
- 텍스트 콘텐츠가 다르다는 이유만으로 다른 구조로 판단하지 않는다.
- 색상, 크기, 정렬 등의 속성 차이는 구조적 차이와 분리해서 판단한다.
- 자식 레이어의 순서와 계층 관계는 구조 분석에 반영한다.
- 단순히 Bounding Box가 동일하다는 이유로 같은 컴포넌트로 판단하지 않는다.
- 구조적 유사성과 시각적 유사성을 별도로 평가한다.
- 유사도만으로 자동 통합하기 어려운 경우 사용자 확인을 요청한다.

## 4. 플러그인 UI

다음과 같은 기능을 제공한다.

### Step 1. 분석 범위 선택
- 현재 선택된 프레임
- 현재 페이지 전체
- 선택한 상위 프레임 내부

### Step 2. 디자인 분석
- 전체 프레임 개수
- 동일 구조 그룹 개수
- Component 생성 예상 개수
- Variant 생성 예상 개수
- 누락된 Variant 개수
- 별도 관리가 필요한 프레임 개수

### Step 3. 분석 결과 확인

분석 결과를 그룹별로 확인할 수 있도록 한다.

각 그룹에는 다음 정보를 표시한다.
- Component 이름
- 구조가 동일한 프레임 목록
- 속성 차이
- 예상 Variant Properties
- 기존 Variant 목록
- 누락된 Variant 목록
- Component화 대상 여부

### Step 4. 생성 옵션
- 동일 구조 자동 Component화
- 속성 차이에 따른 Variant 자동 생성
- 누락 Variant 자동 생성
- 기존 프레임 Instance 자동 교체
- 기존 디자인 속성 유지

각 기능은 개별적으로 선택할 수 있도록 한다.

### Step 5. 실행 및 결과 확인

작업 완료 후 다음 정보를 제공한다.
- 생성된 Main Component 개수
- 생성된 Component Set 개수
- 생성된 Instance 개수
- 생성된 Variant 개수
- 누락 Variant 개수
- 처리 실패 및 사용자 확인 필요 항목

## 5. 기술적 요구사항

- Figma Plugin API 기반으로 개발한다.
- TypeScript를 사용한다.
- Figma Plugin API에서 실제 지원하는 기능만 사용한다.
- 대규모 프레임 분석 시 성능을 고려한다.
- 분석 단계와 실제 변경 단계를 분리한다.
- 실행 전 변경 예상 결과를 미리 확인할 수 있어야 한다.
- 실행 취소가 가능하도록 작업 단위를 관리한다.
- 기존 레이어의 속성을 최대한 보존한다.
- 동일한 작업을 반복 실행해도 불필요한 컴포넌트가 중복 생성되지 않도록 한다.

## 6. 개발 시 가장 중요한 원칙

이 플러그인은 단순한 중복 디자인 탐색 도구가 아니다.

**디자인 구조를 분석하여 컴포넌트 시스템으로 자동 변환하는 도구**다.

특히 다음 세 가지 기능의 정확성을 가장 중요하게 구현한다.

1. 구조적 동일성 판단
2. 속성 차이에 따른 Variant 자동 분류
3. 누락된 Variant 조합 탐색 및 생성

기존 디자인을 임의로 변경하지 않고, 현재 디자인 결과물을 유지하면서 재사용 가능한 Component System으로 전환하는 것을 최우선으로 한다.

개발을 시작하기 전에 Figma Plugin API의 Component, Component Set, Instance 및 Variant 생성 관련 제약사항을 확인하고, 실제 구현 가능한 방식으로 기술 설계를 먼저 제안한다.

## 7. 특수 형태 컴포넌트 자동 인식 및 생성

일반적인 UI 컴포넌트 외에도 이미지(Image), 아이콘(Icon), 아바타(Avatar), 썸네일(Thumbnail), 로고(Logo), 배지(Badge) 등 시각적 요소를 중심으로 구성된 특수 형태의 컴포넌트를 자동으로 인식하고 생성할 수 있어야 한다.

이러한 요소는 일반적인 프레임 구조 분석만으로 판단하지 않고, 노드 유형, 이미지 Fill, Vector 구조, 마스크, 클리핑, 비율, 외곽 형태 및 시각적 특징을 함께 분석하여 별도의 컴포넌트 유형으로 분류한다.

### 7-1. 특수 형태 컴포넌트 분류

다음 유형을 기본 지원 대상으로 한다.

**A. Image Component**

- 일반 이미지
- 이미지 썸네일
- 배너 이미지
- 카드 이미지
- 프로필 이미지
- 이미지 + 텍스트 조합
- 이미지 + 오버레이 조합
- 이미지 + 아이콘 조합

분석 항목:

- Image Fill 적용 여부
- 이미지 프레임의 Width / Height
- Aspect Ratio
- Fill / Fit / Crop 방식
- Corner Radius
- Clip Content
- Overlay 적용 여부
- 이미지 내부 텍스트 및 아이콘 유무

동일한 이미지 구조에서 이미지 소스만 다른 경우에는 하나의 Component로 통합하고 이미지 소스는 Instance 교체가 가능한 구조로 유지한다.

**B. Icon Component**

- 단일 Vector Icon
- 복합 Vector Icon
- Icon + Background
- Icon + Label
- Icon Button
- 상태별 Icon
- 크기별 Icon

분석 항목:

- Vector 및 Boolean Operation 구조
- Path 개수와 계층 구조
- Icon Bounding Box
- Stroke / Fill
- 색상
- 크기
- 배경 유무
- 정렬 및 Padding

동일한 사용 목적과 외형 구조를 가진 아이콘은 Component로 등록한다.

서로 다른 아이콘 그래픽이 동일한 구조적 컨테이너를 사용하는 경우에는 아이콘 그래픽을 개별 Instance 교체 대상으로 관리할 수 있도록 한다.

단, 서로 다른 아이콘 그래픽을 무조건 하나의 Component로 합치지 않는다.

**C. Avatar Component**

- 원형 아바타
- 사각형 아바타
- 라운드 사각형 아바타
- 이미지형 아바타
- 이니셜 텍스트형 아바타
- 기본 프로필 아이콘형 아바타
- 상태 표시가 포함된 아바타
- 아바타 그룹 및 중첩형 아바타

분석 항목:

- 이미지 또는 Vector 유무
- Shape 형태
- Width / Height
- Aspect Ratio
- Corner Radius
- Border
- Status Indicator
- Initial Text
- Size
- Overlay 및 Stack 구조

동일한 아바타 구조는 하나의 Component Set으로 통합하고 다음과 같이 Variant를 분류할 수 있어야 한다.

예시:

- Type=Image
- Type=Initial
- Type=Default
- Size=Small
- Size=Medium
- Size=Large
- Shape=Circle
- Shape=Square
- Status=Online
- Status=Offline

**D. Thumbnail Component**

- 콘텐츠 썸네일
- 상품 썸네일
- 영상 썸네일
- 문서 썸네일
- 파일 미리보기

이미지 영역, 오버레이, 상태 아이콘, 재생 버튼, 텍스트 등 내부 구성을 분석하여 동일 구조를 컴포넌트화한다.

**E. Logo Component**

- 심볼형 로고
- 워드마크형 로고
- 심볼 + 텍스트 조합
- 가로형 및 세로형 로고
- 반응형 로고

로고 그래픽 자체가 다르더라도 동일한 레이아웃 컨테이너를 사용하는 경우에는 컨테이너 구조와 그래픽 에셋을 분리하여 관리할 수 있도록 한다.

### 7-2. 특수 형태별 구조 인식 원칙

특수 형태 요소는 다음과 같이 판단한다.

1. 이미지 소스가 다르지만 프레임 구조와 표현 방식이 동일하면 동일 컴포넌트 후보로 분류한다.
2. 아이콘의 Vector Path가 다르더라도 동일한 크기 및 컨테이너 규칙을 사용하면 아이콘 시스템의 개별 컴포넌트 후보로 분류한다.
3. 아바타의 이미지, 이니셜, 기본 아이콘은 콘텐츠 유형에 따른 Variant로 분류할 수 있다.
4. 원형, 사각형, 라운드 사각형 등의 Shape 차이는 Variant 속성으로 분류한다.
5. 이미지 비율이 다르거나 이미지 컨테이너의 역할이 다른 경우 별도 Component로 분류할 수 있다.
6. Mask, Clip, Overlay 등의 효과는 구조 분석에 포함한다.
7. 단순히 이미지나 아이콘이라는 이유만으로 서로 다른 사용 목적의 컴포넌트를 통합하지 않는다.

### 7-3. 특수 형태 Component Set 및 Variant 구성

특수 형태 컴포넌트도 일반 컴포넌트와 동일한 Variant 생성 및 누락 조합 탐색 기능을 제공한다.

예시:

Component Set: Avatar

Properties:

- Type: Image / Initial / Default
- Size: Small / Medium / Large
- Shape: Circle / Square
- Status: Online / Offline / None

Component Set: Icon

Properties:

- Size: 16 / 20 / 24 / 32
- Style: Outline / Filled
- Color: Primary / Secondary / Neutral

Component Set: Image

Properties:

- Ratio: 1:1 / 4:3 / 16:9
- Shape: Square / Rounded / Circle
- Display: Cover / Contain
- Overlay: None / Gradient

각 속성의 전체 조합을 분석하고 누락된 Variant를 탐색한다.

다만 모든 조합을 무조건 생성하지 않고, 해당 조합이 디자인 시스템에서 유효한지 검토할 수 있도록 사용자에게 미리보기와 승인 단계를 제공한다.

### 7-4. 에셋과 컴포넌트의 분리 관리

이미지, 아이콘, 아바타 등의 시각적 에셋과 이를 담는 컴포넌트의 구조를 구분하여 분석한다.

예를 들어:

- Avatar: Component
- Avatar Image: 교체 가능한 이미지 에셋
- Avatar Shape: Variant Property
- Avatar Size: Variant Property
- Avatar Status: Variant Property

이와 같은 방식으로 컴포넌트 구조와 실제 콘텐츠를 분리하여 재사용성을 높인다.

이미지와 아이콘을 Instance로 교체할 수 있는 구조인지 판단하고, 기존 에셋을 유지하면서 컴포넌트화한다.

### 7-5. 특수 형태 컴포넌트 전용 분석 UI

분석 결과에서 일반 컴포넌트와 특수 형태 컴포넌트를 구분하여 표시한다.

특수 형태 카테고리:

- Image
- Icon
- Avatar
- Thumbnail
- Logo
- Other Visual Assets

각 카테고리별로 다음 정보를 제공한다.

- 인식된 요소 개수
- 동일 구조 그룹 개수
- Component 생성 예상 개수
- Component Set 생성 예상 개수
- Variant 생성 예상 개수
- 누락 Variant 개수
- 별도 에셋 관리가 필요한 요소

각 요소의 실제 디자인 미리보기를 제공하여 자동 분류 결과를 확인할 수 있어야 한다.

### 7-6. 핵심 개발 원칙

특수 형태 컴포넌트는 일반 컴포넌트의 하위 기능으로만 취급하지 않고 독립적인 분석 규칙을 가진 컴포넌트 유형으로 구현한다.

특히 다음을 중요하게 구현한다.

- 이미지 소스와 이미지 컨테이너 구조 구분
- 아이콘 그래픽과 아이콘 컨테이너 구조 구분
- 아바타 유형과 크기 및 상태 구분
- Mask 및 Clip 구조 보존
- 이미지 비율 및 표시 방식 보존
- 기존 에셋과 Instance Override 유지
- 특수 형태별 Component Set 및 Variant 자동 생성

최종적으로 일반 UI 컴포넌트와 특수 형태 컴포넌트를 통합 관리할 수 있는 자동 컴포넌트 생성 시스템을 구현한다.

## 8. Typography Style 자동 생성 및 Variable 바인딩

### 8-1. 개발 목적

Figma 프레임 및 컴포넌트에 사용된 모든 텍스트를 분석하여 Typography 속성을 추출하고, 동일한 속성 조합을 가진 텍스트를 그룹화하여 Figma Text Style로 자동 등록한다.

Text Style 생성 시 각 Typography 속성을 분석하여 Figma Variables와 자동 연결한다.

기본 원칙은 다음과 같다.

1. 동일한 Typography 속성을 가진 텍스트는 하나의 Text Style로 그룹화한다.
2. Text Style은 Figma Local Text Styles에 등록한다.
3. Text Style에 사용된 개별 속성은 지원 가능한 경우 Figma Variables와 연결한다.
4. `%` 단위로 정의된 속성은 Variable 바인딩 대상에서 제외한다.
5. 소수점이 포함된 숫자 값은 Variable 바인딩 대상에서 제외한다.
6. 정수 및 문자열 속성은 지원되는 Variable 타입에 맞춰 연결한다.
7. Variable 바인딩이 불가능한 속성은 기존 값을 유지한다.
8. Text Style 등록 및 Variable 연결 이후에도 기존 텍스트의 시각적 표현을 유지한다.

### 8-2. Typography 속성 추출

모든 TextNode를 탐색하고 다음 속성을 분석한다.

| 속성 | 분석 내용 |
|---|---|
| Font Family | 폰트 패밀리 |
| Font Style | Regular, Medium, Bold 등 |
| Font Weight | 폰트 굵기 |
| Font Size | 폰트 크기 |
| Line Height | 줄 높이 및 단위 |
| Letter Spacing | 자간 및 단위 |
| Paragraph Spacing | 문단 간격 |
| Paragraph Indent | 문단 들여쓰기 |
| Text Case | 대소문자 변환 |
| Text Decoration | 밑줄, 취소선 등 |
| Text Color | 텍스트 색상 |
| Leading Trim | 글꼴 상하 여백 처리 |
| Text Alignment | 수평 및 수직 정렬 |

Mixed Style이 적용된 텍스트도 분석 대상에 포함한다.

한 TextNode 내부에 서로 다른 Typography 속성이 적용되어 있다면 텍스트 구간별 속성을 추출하고, 동일한 스타일 조합을 구분하여 등록한다.

### 8-3. Text Style 자동 생성

추출된 Typography 속성을 기준으로 동일한 스타일을 그룹화한다.

동일한 Typography 속성 조합을 가진 텍스트는 중복 Style을 생성하지 않는다.

Text Style 명명 규칙은 다음과 같이 구성한다.

예시:

- Typography/Display/Large
- Typography/Display/Medium
- Typography/Heading/H1
- Typography/Heading/H2
- Typography/Body/Large
- Typography/Body/Medium
- Typography/Body/Small
- Typography/Caption/Default
- Typography/Label/Default

스타일 이름은 폰트 크기, 굵기, 행간 등의 속성을 기준으로 자동 생성할 수 있도록 한다.

기존 Figma Text Style이 존재하는 경우에는 속성을 비교하여 중복 생성을 방지하고 기존 Style을 재사용할 수 있도록 한다.

기존 스타일과 속성이 일부만 일치하는 경우에는 별도 Style로 생성하고 사용자가 확인할 수 있도록 한다.

### 8-4. Variable 자동 생성 및 연결

Text Style에 등록된 Typography 속성 중 Figma Variable 바인딩을 지원하는 속성을 대상으로 자동 Variable을 생성하고 연결한다.

**Variable 바인딩 기본 규칙**

| 속성 | Variable 타입 | 바인딩 조건 |
|---|---|---|
| Font Family | STRING | 문자열 값 |
| Font Style | STRING | 문자열 값 |
| Font Weight | FLOAT | 정수 값 |
| Font Size | FLOAT | 정수 값 |
| Line Height | FLOAT | 정수 + PIXELS |
| Letter Spacing | FLOAT | 정수 + PIXELS |
| Paragraph Spacing | FLOAT | 정수 값 |
| Paragraph Indent | FLOAT | 정수 값 |

다음 조건에 해당하면 Variable 바인딩을 하지 않는다.

- 단위가 PERCENT인 속성
- 숫자 값에 소수점이 포함된 속성
- AUTO 등 고정 숫자로 표현되지 않는 속성
- Figma Plugin API에서 Variable 바인딩을 지원하지 않는 속성
- 해당 Variable 타입과 속성의 데이터 타입이 일치하지 않는 경우

위 조건에 해당하는 속성은 기존 Text Style의 값으로 유지한다.

**중요:** `%` 단위는 숫자가 정수이더라도 바인딩하지 않는다. 소수점 제외 규칙은 단위와 별도로 적용한다.

### 8-5. Variable 명명 및 Collection 관리

Typography 관련 Variable은 별도의 Typography Variable Collection에 등록하거나 기존에 존재하는 Typography 관련 Collection을 재사용한다.

Variable 이름은 의미 기반으로 생성한다.

예시:

- font-family-primary
- font-family-brand
- font-weight-regular
- font-weight-medium
- font-weight-bold
- font-size-display-lg
- font-size-heading-h1
- font-size-heading-h2
- font-size-body-lg
- font-size-body-md
- line-height-heading
- line-height-body
- letter-spacing-heading
- letter-spacing-body
- paragraph-spacing-default
- paragraph-indent-default

단순히 숫자만으로 Variable 이름을 생성하지 않는다.

동일한 값이라도 용도가 다른 경우에는 의미에 따라 구분한다.

예를 들어 Font Size 16px이 여러 용도로 사용되더라도 Body와 Label의 역할이 다르면 별도 Semantic Variable로 관리할 수 있도록 한다.

기존에 동일한 이름과 타입 및 값을 가진 Variable이 존재한다면 새로 생성하지 않고 기존 Variable을 재사용한다.

기존 Variable과 값이 다르거나 타입이 호환되지 않으면 임의로 덮어쓰지 않고 사용자 확인을 요청한다.

### 8-6. Text Style과 Variable 연결 방식

Text Style은 Typography 속성의 조합을 정의하는 역할을 한다.

Variable은 각 속성의 값을 관리하는 역할을 한다.

따라서 다음과 같은 구조로 연결한다.

예시:

Text Style: Typography/Heading/H1

- Font Family → font-family-primary
- Font Style → font-weight-bold에 해당하는 폰트 스타일 변수
- Font Size → font-size-heading-h1
- Line Height → line-height-heading
- Letter Spacing → letter-spacing-heading

각 속성은 실제 Figma Plugin API의 지원 범위에 따라 바인딩한다.

Font Style과 Font Weight는 서로 다른 개념이므로 혼동하지 않는다. Font Style은 폰트의 스타일 이름을 의미하며 Font Weight는 숫자로 표현되는 굵기 값이다.

Variable 연결은 Text Style 자체에 적용하고, 해당 Text Style을 사용하는 TextNode에도 Style을 적용한다.

### 8-7. 기존 TextNode에 Style 적용

Text Style 생성 및 Variable 연결 이후 분석된 TextNode에 해당 Text Style을 적용한다.

처리 원칙:

- 기존 텍스트 내용 유지
- 기존 텍스트 색상 유지
- 기존 텍스트 정렬 유지
- 기존 Auto Layout 및 프레임 구조 유지
- 기존 텍스트 크기와 행간 유지
- Mixed Style 구간 보존
- 기존 Variable 바인딩이 존재하는 경우 충돌 여부 확인
- 동일한 Text Style이 이미 적용된 경우 중복 작업 방지

텍스트 전체에 하나의 스타일이 적용되어 있지 않고 일부 구간에만 다른 스타일이 적용되어 있다면 구간별로 Text Style을 적용한다.

Text Style 적용으로 인해 텍스트의 줄바꿈, 높이 또는 주변 레이아웃이 변경되는 경우에는 변경 사항을 감지하고 사용자에게 알려준다.

### 8-8. Typography 분석 및 등록 UI

플러그인에 Typography 전용 분석 화면을 추가한다.

분석 결과:

- 전체 TextNode 개수
- 고유 Typography 조합 개수
- 생성 예정 Text Style 개수
- 기존 Text Style 재사용 개수
- 생성 예정 Variable 개수
- 기존 Variable 재사용 개수
- Variable 바인딩 제외 개수
- Mixed Style 텍스트 개수
- 속성 충돌 및 확인 필요 항목

각 Typography 그룹별로 다음 정보를 표시한다.

- Style 이름
- Font Family
- Font Weight / Font Style
- Font Size
- Line Height
- Letter Spacing
- Paragraph Spacing
- Paragraph Indent
- Variable 연결 대상
- Variable 연결 제외 대상

각 속성에 대해 Variable 생성 및 연결 여부를 사용자가 확인할 수 있어야 한다.

### 8-9. 최종 실행 단계

다음 순서로 실행한다.

1. 전체 TextNode 탐색
2. Typography 속성 추출
3. Mixed Style 구간 분석
4. 동일 Typography 그룹화
5. Text Style 중복 검사
6. 신규 Text Style 생성
7. 기존 Variable 검색
8. 신규 Variable 생성
9. Text Style 속성별 Variable 바인딩
10. 기존 TextNode에 Text Style 적용
11. 결과 및 오류 검증

### 8-10. 핵심 개발 원칙

Typography 자동화는 단순히 텍스트를 Style로 등록하는 기능이 아니다.

**Text Style과 Variable이 연결된 재사용 가능한 Typography System을 구축하는 것이 목적이다.**

특히 `%` 단위와 소수점이 포함된 속성은 Variable 연결 대상에서 제외하고, 정수 및 문자열 속성은 지원되는 API와 Variable 타입을 확인한 후 자동 연결한다.

Figma Plugin API에서 실제 지원하는 속성과 메서드를 기준으로 구현하며, 지원하지 않는 기능을 임의로 구현했다고 가정하지 않는다.

## 보충 (2026-11-24, 같은 날) — Font Size

Font Size는 Figma Variable 바인딩 대상에 포함한다. Font Size 값이 정수인 경우 FLOAT 타입의 Variable을 생성하거나 기존 Variable을 재사용하여 Text Style의 fontSize 속성에 바인딩한다. 소수점이 포함된 Font Size는 Variable 연결 대상에서 제외하고 기존 값을 유지한다. 실제 Figma Plugin API의 지원 여부와 바인딩 성공 여부를 검증한 후 처리한다.
