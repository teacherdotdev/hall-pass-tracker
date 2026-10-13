<script lang="ts">
  import Modal from './Modal.svelte';
  import { account, renameStudent, setAlwaysGo, setExempt, setStudentPin } from './account.svelte';
  import { pinProblem } from './pins';
  import { displayName, maxPrefix } from './roster';
  import type { Class, Student } from './types';

  let { cls, student, onClose }: { cls: Class; student: Student; onClose: () => void } = $props();

  // The dialog edits a copy; nothing changes until Save.
  // svelte-ignore state_referenced_locally
  let firstName = $state(student.firstName);
  // svelte-ignore state_referenced_locally
  let lastPrefix = $state(student.lastPrefix);
  // svelte-ignore state_referenced_locally
  let exempt = $state(!!student.exempt);
  // svelte-ignore state_referenced_locally
  let alwaysGo = $state(!!student.alwaysGo);
  // svelte-ignore state_referenced_locally
  let pin = $state(student.pin ?? '');
  let error = $state('');

  /** The same rule the import enforces: no two students may look alike at the kiosk. */
  function save(event: SubmitEvent) {
    event.preventDefault();
    const first = firstName.trim();
    const prefix = lastPrefix.trim().slice(0, maxPrefix);
    if (!first) {
      error = 'A first name is needed.';
      return;
    }
    const name = displayName({ firstName: first, lastPrefix: prefix }).toLowerCase();
    const clash = cls.students.find(
      (other) => other.id !== student.id && other.status === 'current' && displayName(other).toLowerCase() === name,
    );
    if (clash) {
      error = `${displayName(clash)} is already in this class. Add a letter or use a nickname.`;
      return;
    }
    const newPin = pin.trim();
    if (cls.studentPins && newPin !== student.pin) {
      const others = cls.students.filter((other) => other.id !== student.id).map((other) => other.pin);
      error = pinProblem(newPin, others, account.pin);
      if (error) return;
      setStudentPin(cls.id, student.id, newPin);
    }
    renameStudent(cls.id, student.id, first, prefix);
    if (exempt !== !!student.exempt) setExempt(cls.id, student.id, exempt);
    if (alwaysGo !== !!student.alwaysGo) setAlwaysGo(cls.id, student.id, alwaysGo);
    onClose();
  }
</script>

<Modal onClose={onClose} labelledby="edit-title">
  <form class="dialog" onsubmit={save}>
    <h2 id="edit-title">Edit {displayName(student)}</h2>
    <label class="field">First name or nickname <input bind:value={firstName} /></label>
    <label class="field">
      Letters of the last name to show (up to {maxPrefix})
      <input bind:value={lastPrefix} maxlength={maxPrefix} />
    </label>
    {#if cls.studentPins}
      <label class="field">
        PIN for the kiosk (3 to 6 digits)
        <input bind:value={pin} inputmode="numeric" autocomplete="off" maxlength="6" />
      </label>
    {/if}
    <label class="check">
      <input type="checkbox" bind:checked={alwaysGo} />
      <span>
        Can always go (medical / IEP / 504)
        <span class="muted small">
          Nothing at the kiosk ever holds them back: no Pass Allowance, limit, line or no-pass time. They never take
          another student's spot. Every trip is still recorded and marked in History.
        </span>
      </span>
    </label>
    <!-- Can always go includes this, so it shows ticked while that is; their own choice here comes back if it's unticked. -->
    <label class="check">
      <input
        type="checkbox"
        checked={exempt || alwaysGo}
        disabled={alwaysGo}
        onchange={(event) => (exempt = event.currentTarget.checked)}
      />
      <span>
        Exempt from the Pass Allowance only
        <span class="muted small">
          {#if alwaysGo}
            Included, because they can always go.
          {:else}
            They never run out of passes, but still wait for a free spot and for no-pass time to end, like everyone
            else. Every trip is still recorded.
            {#if !account.passAllowance.enabled}The Pass Allowance is off in Pass Options right now.{/if}
          {/if}
        </span>
      </span>
    </label>
    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <div class="dialog-actions">
      <button type="button" class="btn" onclick={onClose}>Cancel</button>
      <button class="btn btn-primary">Save</button>
    </div>
  </form>
</Modal>

