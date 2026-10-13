<script lang="ts">
  import { page } from '$app/state';
  import type { DataConnection, Peer } from 'peerjs';
  import { onMount } from 'svelte';
  import BrandMark from '#lib/BrandMark.svelte';
  import DestinationIcon from '#lib/DestinationIcon.svelte';
  import Icon from '#lib/Icon.svelte';
  import { createPeer, keepAlive, studentLinkPrefix } from '#lib/peer.ts';
  import type { StudentLinkMessage, StudentView } from '#lib/types.ts';

  /**
   * The Student link, on a student's own Chromebook or phone: who is out, the
   * Line, and whether passes are open, straight from the teacher's computer.
   * It can only look. See docs/adr/0012.
   */
  type Reach = 'connecting' | 'live' | 'unreachable' | 'closed' | 'full' | 'old-link';
  let reach = $state<Reach>('connecting');
  let view = $state<StudentView | null>(null);

  /** How long to wait before trying the teacher's computer again, by what happened last time. */
  const retrySeconds: Partial<Record<Reach, number>> = { unreachable: 10, closed: 20, full: 30 };

  onMount(() => {
    const address = studentLinkPrefix + page.params.id;
    let peer: Peer | null = null;
    let connection: DataConnection | null = null;
    let retryTimer = 0;
    let giveUpTimer = 0;

    function tryAgainLater() {
      clearTimeout(retryTimer);
      const seconds = retrySeconds[reach];
      if (seconds) retryTimer = window.setTimeout(dial, seconds * 1000);
    }

    function stopWatching(why: Reach) {
      reach = why;
      view = null;
      tryAgainLater();
    }

    function dial() {
      // While the matchmaking server is out of reach, createPeer keeps trying, and dials once it answers.
      if (!peer || peer.destroyed || peer.disconnected) return;
      clearTimeout(giveUpTimer);
      const previous = connection;
      connection = null;
      previous?.close();
      const attempt = peer.connect(address, { reliable: true });
      connection = attempt;
      giveUpTimer = window.setTimeout(() => {
        if (!attempt.open) attempt.close();
        if (connection === attempt) stopWatching('unreachable');
      }, 20_000);
      attempt.on('open', () => {
        clearTimeout(giveUpTimer);
        keepAlive(attempt);
      });
      attempt.on('data', (data) => {
        const message = data as StudentLinkMessage;
        if (message.type === 'view') {
          view = message.view;
          reach = 'live';
        }
        if (message.type === 'closed' || message.type === 'full' || message.type === 'old-link') stopWatching(message.type);
      });
      attempt.on('close', () => {
        if (connection !== attempt) return;
        connection = null;
        if (reach === 'live' || reach === 'connecting') stopWatching('unreachable');
      });
    }

    createPeer().then((created) => {
      peer = created;
      created.on('open', dial);
      created.on('error', (error) => {
        // Nobody answers at that address: the teacher's computer is off, or Happy Hallways is closed on it.
        if (error.type === 'peer-unavailable' || error.type === 'network' || error.type === 'server-error') {
          clearTimeout(giveUpTimer);
          stopWatching('unreachable');
        }
      });
    });

    return () => {
      clearTimeout(retryTimer);
      clearTimeout(giveUpTimer);
      peer?.destroy();
    };
  });

  const list = $derived(view?.destinations ?? []);
  const statusText = $derived(
    view
      ? {
          open: 'Passes are open',
          'no-pass': 'No passes right now',
          between: 'Between classes',
          'no-class': 'No class right now',
        }[view.status]
      : '',
  );
</script>

<svelte:head>
  <title>{view?.className ? `${view.className} · ` : ''}Happy Hallways</title>
  <!-- Each class's link is private to its students, not for search results. -->
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="student">
  <header class="brand-row">
    <BrandMark size={26} />
    <span>Happy Hallways</span>
  </header>

  {#if reach === 'live' && view}
    <main class="live" aria-live="polite">
      <div class="title">
        <h1>{view.className ?? 'No class right now'}</h1>
        <p class="status {view.status}" role="status">
          <Icon name={view.status === 'open' ? 'door' : view.status === 'no-pass' ? 'ban' : 'pause'} size={22} />
          <span><strong>{statusText}</strong>{#if view.whenPassesOpen} {view.whenPassesOpen}{/if}</span>
        </p>
      </div>

      {#if view.className}
        <section aria-labelledby="out-title">
          <h2 id="out-title">Out of class <span class="count">{view.out.length}</span></h2>
          {#if view.out.length}
            <ul class="people">
              {#each view.out as each, index (index)}
                <li>
                  <DestinationIcon label={each.destination} {list} size={30} />
                  <strong>{each.name}</strong>
                  <span class="where">{each.destination}</span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="empty-note">Everyone's in class.</p>
          {/if}
        </section>

        {#each view.lines as line (line.destination)}
          <section aria-label={line.destination ? `The line for ${line.destination}` : 'The line'}>
            <h2>
              {#if line.destination}<DestinationIcon label={line.destination} {list} size={26} />{line.destination} line{:else}Line{/if}
              <span class="count">{line.spots.length}</span>
            </h2>
            <ol class="people">
              {#each line.spots as spot, index (index)}
                <li class:next={spot.upNext}>
                  <span class="place">{index + 1}</span>
                  <strong>{spot.name}</strong>
                  <!-- In the Class Line, each student shows where they're going. -->
                  {#if !line.destination}<span class="where"><DestinationIcon label={spot.destination} {list} size={22} />{spot.destination}</span>{/if}
                  {#if spot.upNext}<span class="turn">Up next</span>{/if}
                </li>
              {/each}
            </ol>
          </section>
        {/each}
      {/if}

      <p class="foot">This page updates by itself. To sign out, use the kiosk by the door.</p>
    </main>
  {:else}
    <main class="message" role="status">
      {#if reach === 'connecting'}
        <span class="icon-ring"><Icon name="link" size={30} /></span>
        <h1>Connecting to your teacher's computer…</h1>
      {:else if reach === 'unreachable'}
        <span class="icon-ring warn"><Icon name="laptop" size={30} /></span>
        <h1>Can't reach your teacher's computer</h1>
        <p>
          Happy Hallways has to be open on it for this page to work. We'll keep trying. If your teacher gave you a new
          link, use that one instead.
        </p>
      {:else if reach === 'closed'}
        <span class="icon-ring"><Icon name="lock" size={30} /></span>
        <h1>The student link is closed</h1>
        <p>Your teacher has turned it off for now. This page will come back by itself when it opens again.</p>
      {:else if reach === 'full'}
        <span class="icon-ring warn"><Icon name="users" size={30} /></span>
        <h1>Too many people are viewing</h1>
        <p>Try again in a minute. This page will keep trying by itself.</p>
      {:else}
        <span class="icon-ring warn"><Icon name="link" size={30} /></span>
        <h1>This link doesn't work any more</h1>
        <p>Your teacher made a new student link. Ask them where to find it.</p>
      {/if}
    </main>
  {/if}
</div>

<style>
  /* Read on a Chromebook or a phone: big, friendly and plain. */
  .student {
    min-height: 100vh;
    max-width: 720px;
    margin: 0 auto;
    padding: 20px 16px 40px;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 22px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 800;
  }

  .live {
    display: grid;
    gap: 22px;
  }

  .title {
    display: grid;
    gap: 12px;
  }

  h1 {
    font-size: clamp(26px, 6vw, 36px);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface-sunk);
    color: var(--muted);
    font-size: 18px;
    line-height: 1.3;
  }

  .status.open {
    border-color: #c7dccd;
    background: var(--accent-wash);
    color: var(--accent);
  }

  .status.no-pass {
    border-color: #ecd3ac;
    background: var(--warn-wash);
    color: var(--warn);
  }

  section {
    display: grid;
    gap: 10px;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
  }

  .count {
    display: grid;
    place-items: center;
    min-width: 28px;
    height: 28px;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--surface-sunk);
    border: 1px solid var(--border);
    font-size: 14px;
  }

  .people {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .people li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    font-size: 18px;
  }

  .where {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 16px;
    font-weight: 700;
  }

  .place {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #e1ecf8;
    color: #2361a6;
    font-size: 14px;
    font-weight: 800;
  }

  .people li.next {
    border-color: #c7dccd;
    background: var(--accent-wash);
  }

  .turn {
    margin-left: auto;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 800;
  }

  .empty-note,
  .foot {
    color: var(--muted);
    font-size: 16px;
  }

  .foot {
    margin-top: 6px;
    font-size: 14px;
  }

  .message {
    display: grid;
    justify-items: center;
    gap: 14px;
    margin-top: 12vh;
    text-align: center;
  }

  .message h1 {
    font-size: clamp(24px, 5.5vw, 32px);
  }

  .message p {
    max-width: 44ch;
    color: var(--muted);
    font-size: 17px;
  }

  .icon-ring {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--accent-wash);
    color: var(--accent);
  }

  .icon-ring.warn {
    background: var(--warn-wash);
    color: var(--warn);
  }
</style>
