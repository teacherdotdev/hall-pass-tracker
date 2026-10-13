<script lang="ts">
  import Icon from './Icon.svelte';
  import Modal from './Modal.svelte';

  /**
   * The kiosk asks a student for their PIN after they tap their name, on big
   * keys a child can hit. The digits never show, only dots. A wrong PIN just
   * clears for another try; the teacher's own PIN also works, for a student who
   * forgot theirs. See docs/adr/0013.
   */
  let {
    name,
    check,
    onPass,
    onCancel,
  }: {
    name: string;
    /** Whether what was typed lets this student through. */
    check: (entered: string) => boolean;
    onPass: () => void;
    onCancel: () => void;
  } = $props();

  /** Room for the teacher's PIN, which may be longer than a student's. */
  const longest = 8;
  let entered = $state('');
  let wrong = $state(false);

  function press(digit: string) {
    wrong = false;
    if (entered.length < longest) entered += digit;
  }

  function erase() {
    entered = entered.slice(0, -1);
  }

  function submit() {
    if (entered.length < 3) return;
    if (check(entered)) {
      onPass();
      return;
    }
    entered = '';
    wrong = true;
  }

  /** A keyboard works too, for a laptop acting as the kiosk. */
  function type(event: KeyboardEvent) {
    if (/^\d$/.test(event.key)) press(event.key);
    else if (event.key === 'Backspace') erase();
    else if (event.key === 'Enter') submit();
    else return;
    event.preventDefault();
  }
</script>

<svelte:window onkeydown={type} />

<Modal overlay="overlay" labelledby="pin-pad-title" onClose={onCancel}>
  <div class="pad-sheet">
    <p class="eyebrow">Type your PIN</p>
    <h2 id="pin-pad-title">{name}</h2>
    <div class="dots" class:wrong aria-live="polite" aria-label="{entered.length} digits typed">
      {#each { length: Math.max(4, entered.length) } as _, index (index)}
        <span class="dot" class:filled={index < entered.length}></span>
      {/each}
    </div>
    {#if wrong}
      <p class="wrong-text" role="alert">That PIN isn't right. Try again.</p>
    {:else}
      <p class="hint">Forgot it? Your teacher can type theirs.</p>
    {/if}
    <div class="keys">
      {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit (digit)}
        <button class="key" onclick={() => press(digit)}>{digit}</button>
      {/each}
      <button class="key quiet" aria-label="Delete" onclick={erase} disabled={!entered}><Icon name="arrow-left" size={28} /></button>
      <button class="key" onclick={() => press('0')}>0</button>
      <button class="key go" onclick={submit} disabled={entered.length < 3}>Go</button>
    </div>
    <button class="cancel" onclick={onCancel}>Cancel</button>
  </div>
</Modal>

<style>
  .pad-sheet {
    display: grid;
    justify-items: center;
    gap: 14px;
    width: min(400px, 100%);
    max-height: 100%;
    overflow-y: auto;
    padding: clamp(18px, 4vw, 28px);
    border: 1px solid var(--border);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 16px 48px rgb(42 34 22 / 18%);
    text-align: center;
  }

  .eyebrow {
    color: var(--accent);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h2 {
    font-size: 28px;
  }

  .dots {
    display: flex;
    gap: 14px;
    min-height: 22px;
    align-items: center;
  }

  .dot {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-strong);
    border-radius: 50%;
  }

  .dot.filled {
    border-color: var(--accent);
    background: var(--accent);
  }

  .dots.wrong {
    animation: shake 0.35s;
  }

  @keyframes shake {
    25% {
      transform: translateX(-8px);
    }
    75% {
      transform: translateX(8px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dots.wrong {
      animation: none;
    }
  }

  .wrong-text {
    color: var(--danger);
    font-size: 17px;
    font-weight: 800;
  }

  .hint {
    color: var(--muted);
    font-size: 15px;
  }

  .keys {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
  }

  .key {
    display: grid;
    place-items: center;
    min-height: clamp(60px, 11vh, 76px);
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface-sunk);
    color: var(--text);
    font-size: 30px;
    font-weight: 800;
    cursor: pointer;
    touch-action: manipulation;
  }

  .key:active {
    background: var(--accent-wash);
  }

  .key.quiet {
    background: #fff;
    color: var(--muted);
  }

  .key.go {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
    font-size: 24px;
  }

  .key:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .cancel {
    border: 0;
    background: none;
    color: var(--muted);
    font-size: 16px;
    font-weight: 700;
    padding: 8px 16px;
    cursor: pointer;
  }
</style>
