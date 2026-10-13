<script lang="ts">
  import { account, setStudentLink } from '#lib/account.svelte.ts';
  import ConfirmDialog from '#lib/ConfirmDialog.svelte';
  import Icon from '#lib/Icon.svelte';
  import { maxViewers, studentLink } from '#lib/studentLink.svelte.ts';
  import StudentLinkCopy from '#lib/StudentLinkCopy.svelte';

  /** The Student link: students watch the line from their own device. See docs/adr/0012. */
  const open = $derived(!!account.studentLink?.open);
  let confirmNewLink = $state(false);

  const viewing = $derived(
    studentLink.viewers === 0
      ? 'Nobody is viewing right now'
      : `${studentLink.viewers} ${studentLink.viewers === 1 ? 'student' : 'students'} viewing right now`,
  );
</script>

<div class="page">
  <header class="page-head">
    <div>
      <p class="eyebrow">Student link</p>
      <h1>Let students check the line from their seats</h1>
      <p class="muted">
        Post a link in Google Classroom. On their own Chromebook or phone, students see who's out, who's waiting in
        line, and whether passes are open. They can only look: signing out still happens at the kiosk.
      </p>
    </div>
  </header>

  <div class="notice-bar" role="note">
    <Icon name="alert-triangle" />
    The link works only while Happy Hallways is open on this computer. If you close it, or this computer sleeps,
    students see that they can't reach you.
  </div>

  <section class="card">
    <div class="card-head">
      <div>
        <p class="eyebrow">{open ? 'Open' : 'Closed'}</p>
        <h2>{open ? 'Students can view the line' : 'The student link is closed'}</h2>
        <p class="muted small">
          {open
            ? 'Anyone with the link can see the short names of students who are out or in line.'
            : 'Nobody can view the line until you open it.'}
        </p>
      </div>
      {#if open}
        <button class="btn" onclick={() => setStudentLink(false)}><Icon name="lock" size={16} />Close student link</button>
      {:else}
        <button class="btn btn-primary" onclick={() => setStudentLink(true)}>
          <Icon name="link" size={16} />Open student link
        </button>
      {/if}
    </div>

    {#if open}
      <StudentLinkCopy />
      <p class="viewers" role="status">
        <span class="status-dot" class:live={studentLink.viewers > 0} aria-hidden="true"></span>
        {#if studentLink.status === 'connecting'}
          Connecting…
        {:else}
          {viewing}
        {/if}
        <span class="muted small">(up to {maxViewers} at once)</span>
      </p>
      {#if studentLink.status === 'taken'}
        <p class="muted small">Another Happy Hallways tab on this computer is sharing the link. Keep it open.</p>
      {/if}
      <div class="row">
        <button class="btn btn-quiet" onclick={() => (confirmNewLink = true)}>
          <Icon name="history" size={16} />Get a new link
        </button>
      </div>
    {/if}
  </section>

  <section class="card">
    <h2>What students see</h2>
    <ul class="sees">
      <li><Icon name="check" size={16} />The class on the kiosk, and whether passes are open or it's a no-pass time</li>
      <li><Icon name="check" size={16} />Who's out and where they went, by the short name the kiosk shows</li>
      <li><Icon name="check" size={16} />Each line, in order, and who's up next</li>
      <li class="never">
        <Icon name="x" size={16} />Never how long anyone has been out, your PIN, or anything you've set for a student
      </li>
    </ul>
  </section>
</div>

{#if confirmNewLink}
  <ConfirmDialog
    title="Get a new student link?"
    message="The old link stops working straight away. Post the new one wherever students found the old one."
    confirmLabel="Get a new link"
    onConfirm={() => {
      setStudentLink(true, true);
      confirmNewLink = false;
    }}
    onCancel={() => (confirmNewLink = false)}
  />
{/if}

<style>
  .viewers {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
  }

  .sees {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 14.5px;
  }

  .sees li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .sees :global(.ui-icon) {
    margin-top: 3px;
    color: var(--accent);
  }

  .sees .never :global(.ui-icon) {
    color: var(--danger);
  }
</style>
