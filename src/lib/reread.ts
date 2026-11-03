/* ============================================================
   reread.ts — 창 다시 들어옴 반영 스케줄러 (순수, figma·DOM 의존 없음)
   IA v3 §4.1 "다시 읽기 · 보류와 간격 (④)":
   - 포인터 다시 들어옴과 창 포커스 회복, 두 신호를 합쳐 400ms 뒤 한 번 반영한다.
   - 직전 반영 뒤 2초 안에 다시 들어오면 버리지 않고 2초가 차는 때로 1번 미룬다.
     그 사이 여러 번 들어와도 1번만 반영한다.
   - 보류 중(메뉴·팝업 열림, 포인터 눌림, 작업 실행 중, 직전 요청 미완료)이면 반영하지 않고
     미뤄 두었다가, 보류가 풀리면(release) 1번 반영한다.
   - 최소화 중에는 신호 자체를 받지 않는다(부르는 쪽이 거른다).
   ============================================================ */

export interface Clock {
  now(): number;
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface ReentryOptions {
  /** 두 신호를 합치는 시간(ms). 기본 400. */
  debounceMs?: number;
  /** 반영 사이 최소 간격(ms). 기본 2000. */
  minIntervalMs?: number;
}

export interface ReentryScheduler {
  /** 창에 다시 들어왔다(포인터 들어옴 · 창 포커스 회복). */
  signal(): void;
  /** 보류가 풀렸다 — 미뤄 둔 반영이 있으면 1번 반영한다. */
  release(): void;
  /** 대기 중인 반영을 모두 버린다(최소화할 때). */
  cancel(): void;
  /** 대기 중인 반영(합치기·간격·보류)이 있는가 — 검사용. */
  pending(): boolean;
}

export function createReentryScheduler(
  run: () => void,
  isHeld: () => boolean,
  clock: Clock,
  opts: ReentryOptions = {},
): ReentryScheduler {
  const debounceMs = opts.debounceMs ?? 400;
  const minIntervalMs = opts.minIntervalMs ?? 2000;
  let debounce: unknown = null;
  let interval: unknown = null;
  let held = false;
  let lastRun = -Infinity;

  const attempt = (): void => {
    if (isHeld()) {
      held = true;
      return;
    }
    const wait = lastRun + minIntervalMs - clock.now();
    if (wait > 0) {
      if (interval === null) {
        interval = clock.set(() => {
          interval = null;
          attempt();
        }, wait);
      }
      return;
    }
    held = false;
    lastRun = clock.now();
    run();
  };

  return {
    signal(): void {
      if (debounce !== null) clock.clear(debounce);
      debounce = clock.set(() => {
        debounce = null;
        attempt();
      }, debounceMs);
    },
    release(): void {
      if (!held || debounce !== null || interval !== null) return;
      attempt();
    },
    cancel(): void {
      if (debounce !== null) clock.clear(debounce);
      if (interval !== null) clock.clear(interval);
      debounce = null;
      interval = null;
      held = false;
    },
    pending(): boolean {
      return held || debounce !== null || interval !== null;
    },
  };
}

/** 선택 표시줄 문구 재료(§4.1) — 하위 수는 선택한 레이어 자신을 뺀 수. capped면 "+". */
export function selectionSummary(count: number, scanned: number, capped: boolean): { kind: 'none' | 'one' | 'many'; sub: string } {
  if (count <= 0) return { kind: 'none', sub: '' };
  const n = Math.max(0, scanned - count);
  return { kind: count === 1 ? 'one' : 'many', sub: `${n}${capped ? '+' : ''}` };
}
