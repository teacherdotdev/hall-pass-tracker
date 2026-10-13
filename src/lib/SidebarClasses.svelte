<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import { account, moveClass } from './account.svelte';
  import Icon from './Icon.svelte';

  /**
   * The teacher's classes in the sidebar, in the order they choose. That order
   * is the order classes appear everywhere else too.
   *
   * To put a class somewhere else, the teacher can:
   * - with a mouse, drag its row from anywhere;
   * - with a finger, drag its grip (a finger anywhere else still scrolls);
   * - with the keyboard, focus its grip and press the up or down arrow.
   */

  const path = $derived(page.url.pathname);

  /** A row only counts as dragged once it has moved this far, so a shaky click still opens the class. */
  const dragDistance = 5;

  /** The class being pressed, whether it has started moving, and where it would land if let go now. */
  let drag = $state<{ id: string; pointerId: number; startY: number; moved: boolean; dropAt: number } | null>(null);
  /** Set as a drag ends, so the click that follows it doesn't open the class. */
  let justDragged = false;
  /** Read out by screen readers after a class moves. */
  let announcement = $state('');
  let list = $state<HTMLElement>();

  function indexOf(id: string) {
    return account.classes.findIndex((cls) => cls.id === id);
  }

  function press(event: PointerEvent, id: string) {
    if (event.button !== 0) return;
    const onGrip = (event.target as Element).closest('.grip');
    if (event.pointerType !== 'mouse' && !onGrip) return;
    drag = { id, pointerId: event.pointerId, startY: event.clientY, moved: false, dropAt: indexOf(id) };
  }

  function follow(event: PointerEvent) {
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < dragDistance) return;
    drag.moved = true;
    drag.dropAt = dropIndexAt(event.clientY);
  }

  /** Where a class let go at this height lands: just above the first row whose middle is below it. */
  function dropIndexAt(y: number) {
    const rows = [...(list?.querySelectorAll('.class-row') ?? [])];
    const below = rows.findIndex((row) => {
      const box = row.getBoundingClientRect();
      return y < box.top + box.height / 2;
    });
    return below === -1 ? rows.length : below;
  }

  function letGo(event: PointerEvent) {
    if (drag?.pointerId !== event.pointerId) return;
    const { id, moved, dropAt } = drag;
    drag = null;
    if (!moved) return;
    justDragged = true;
    setTimeout(() => (justDragged = false));
    // Taking the class out first shifts everything below it up by one.
    const from = indexOf(id);
    moveTo(id, dropAt > from ? dropAt - 1 : dropAt);
  }

  function cancel(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) drag = null;
  }

  function skipClickAfterDrag(event: MouseEvent) {
    if (!justDragged) return;
    event.preventDefault();
    event.stopPropagation();
  }

  async function moveWithKeys(event: KeyboardEvent, id: string) {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    const to = indexOf(id) + step;
    if (to < 0 || to >= account.classes.length) return;
    moveTo(id, to);
    // The row was moved in the page; keep the keyboard on its grip so the next press keeps going.
    await tick();
    list?.querySelector<HTMLElement>(`[data-grip="${id}"]`)?.focus();
  }

  function moveTo(id: string, to: number) {
    if (to === indexOf(id)) return;
    moveClass(id, to);
    const name = account.classes[to]?.name;
    announcement = `${name} moved to position ${to + 1} of ${account.classes.length}.`;
  }

  /** The line showing where the dragged class will land. None where it would land back in its own place. */
  function dropLine(index: number): 'before' | 'after' | null {
    if (!drag?.moved) return null;
    const from = indexOf(drag.id);
    if (drag.dropAt === from || drag.dropAt === from + 1) return null;
    if (drag.dropAt === index) return 'before';
    if (drag.dropAt === account.classes.length && index === account.classes.length - 1) return 'after';
    return null;
  }
</script>

<svelte:window onpointermove={follow} onpointerup={letGo} onpointercancel={cancel} />

<div class="class-list" class:dragging={drag?.moved} bind:this={list}>
  {#each account.classes as cls, index (cls.id)}
    <!-- Dragging is for the mouse and touch; the grip below is the keyboard's way to move a class. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="class-row"
      class:lifted={drag?.moved && drag.id === cls.id}
      class:drop-before={dropLine(index) === 'before'}
      class:drop-after={dropLine(index) === 'after'}
      onpointerdown={(event) => press(event, cls.id)}
      onclickcapture={skipClickAfterDrag}
    >
      <a
        class="nav-link"
        class:active={path.startsWith(`/classes/${cls.id}`)}
        href="/classes/{cls.id}"
        draggable="false">{cls.name}</a
      >
      {#if account.classes.length > 1}
        <button
          type="button"
          class="grip"
          data-grip={cls.id}
          aria-label="Move {cls.name}"
          aria-describedby="class-move-hint"
          aria-keyshortcuts="ArrowUp ArrowDown"
          title="Drag to change the order"
          onkeydown={(event) => moveWithKeys(event, cls.id)}
        >
          <Icon name="grip" size={15} />
        </button>
      {/if}
    </div>
  {/each}
</div>
<span id="class-move-hint" class="sr-only">Press the up or down arrow key to change the order of your classes.</span>
<p class="sr-only" aria-live="polite">{announcement}</p>

<style>
  .class-list {
    display: grid;
    gap: 1px;
  }

  .class-row {
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .class-row .nav-link {
    padding-right: 32px;
  }

  .grip {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: grid;
    place-items: center;
    width: 28px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--faint);
    opacity: 0.55;
    cursor: grab;
    /* Lets a finger drag the grip instead of scrolling the page. */
    touch-action: none;
  }

  .class-row:hover .grip,
  .grip:focus-visible {
    opacity: 1;
    color: var(--muted);
  }

  /* Fingers need a bigger target, and can't hover to find it. */
  @media (pointer: coarse) {
    .grip {
      width: 40px;
      opacity: 1;
    }

    .class-row .nav-link {
      padding-right: 44px;
    }
  }

  .class-list.dragging,
  .class-list.dragging :global(*) {
    cursor: grabbing;
  }

  .class-row.lifted {
    opacity: 0.45;
  }

  .drop-before::before,
  .drop-after::after {
    content: '';
    position: absolute;
    left: 4px;
    right: 4px;
    height: 3px;
    border-radius: 3px;
    background: var(--accent);
    pointer-events: none;
  }

  .drop-before::before {
    top: -2px;
  }

  .drop-after::after {
    bottom: -2px;
  }
</style>
