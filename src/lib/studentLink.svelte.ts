import type { DataConnection, Peer } from 'peerjs';
import { account, findClass, noPassNow, onReload, onSave, openPasses, passStatus } from './account.svelte';
import { whenPassesOpen } from './door.svelte';
import { limitFor, lineOf } from './limits';
import { createPeer, keepAlive, studentLinkPrefix } from './peer';
import type { LineSpot, StudentLinkMessage, StudentView } from './types';

/**
 * The Student link, on the teacher's computer. Students open the link on
 * their own Chromebook or phone, and their browser connects straight to this
 * one (PeerJS over WebRTC, relayed through Cloudflare's TURN servers when a
 * network blocks direct connections; see peer.ts), the same way the kiosk
 * does. This computer sends them what the door screen shows about the class
 * on the kiosk, and sends it again whenever it changes. Nothing is stored
 * anywhere else. See docs/adr/0012.
 */

/** Each student's browser holds its own connection to this computer, so there is a limit. */
export const maxViewers = 40;
const viewersKey = 'hallway.student-link-viewers';

export const studentLink = $state({
  /**
   * off: there is no link yet. connecting: finding the matchmaking server.
   * live: this tab answers the link. taken: another tab of Happy Hallways on
   * this computer answers it.
   */
  status: 'off' as 'off' | 'connecting' | 'live' | 'taken',
  /** How many students are watching right now. */
  viewers: 0,
});

export function studentLinkUrl() {
  return account.studentLink ? `${location.origin}/student/${account.studentLink.id}` : '';
}

let peer: Peer | null = null;
/** The address this tab answers the link on, or is trying to. */
let claimed: string | null = null;
let retryTimer = 0;
let clockTimer = 0;
const viewers = new Set<DataConnection>();
/** What viewers were last sent, so a save that changes nothing they see sends nothing. */
let lastSent = '';

function send(connection: DataConnection, message: StudentLinkMessage) {
  if (connection.open) connection.send(message);
}

/** Tells a student why they can't watch, then hangs up once the message has had time to arrive. */
function turnAway(connection: DataConnection, message: StudentLinkMessage) {
  send(connection, message);
  setTimeout(() => connection.close(), 1000);
}

/** Turns away everyone watching, saying why. */
function turnAwayAll(message: StudentLinkMessage) {
  for (const viewer of viewers) turnAway(viewer, message);
  viewers.clear();
  countViewers();
}

/** Other tabs show the count too, though only one tab answers the link. */
function countViewers() {
  studentLink.viewers = viewers.size;
  try {
    localStorage.setItem(viewersKey, String(viewers.size));
  } catch {
    // Storage blocked: other tabs just won't see the count.
  }
}

/**
 * Starts, stops or moves the link to match what the teacher chose. Call it
 * after anything about the link changes; it leaves things alone otherwise.
 * While the link is closed, this computer still answers it, only to say so.
 */
export async function serveStudentLink() {
  const address = account.studentLink ? studentLinkPrefix + account.studentLink.id : null;
  if (address === claimed) {
    if (!account.studentLink?.open) turnAwayAll({ type: 'closed' });
    pushView();
    return;
  }
  // A new link, or none: whoever watched the old one is told it stopped working.
  turnAwayAll({ type: 'old-link' });
  const previous = peer;
  setTimeout(() => previous?.destroy(), 1000);
  peer = null;
  clearTimeout(retryTimer);
  clearInterval(clockTimer);
  claimed = address;
  if (!address) {
    studentLink.status = 'off';
    return;
  }
  studentLink.status = 'connecting';
  const created = await createPeer(address);
  if (claimed !== address) {
    created.destroy();
    return;
  }
  peer = created;
  created.on('open', () => (studentLink.status = 'live'));
  created.on('disconnected', () => (studentLink.status = 'connecting'));
  created.on('connection', welcome);
  created.on('error', (error) => {
    // Another tab answers the link already. It may also be a reloaded page's
    // old connection, which the server frees shortly, so look again later.
    if (error.type !== 'unavailable-id' || peer !== created) return;
    created.destroy();
    peer = null;
    studentLink.status = 'taken';
    studentLink.viewers = Number(localStorage.getItem(viewersKey)) || 0;
    retryTimer = window.setTimeout(() => {
      claimed = null;
      serveStudentLink();
    }, 30_000);
  });
  // No-Pass Times start and end by the clock, without anything being saved.
  clockTimer = window.setInterval(pushView, 15_000);
}

function welcome(connection: DataConnection) {
  connection.on('open', () => {
    if (!account.studentLink?.open) return turnAway(connection, { type: 'closed' });
    if (viewers.size >= maxViewers) return turnAway(connection, { type: 'full' });
    viewers.add(connection);
    countViewers();
    keepAlive(connection);
    send(connection, { type: 'view', view: studentView() });
  });
  // Students only say "still here" for now (see StudentMessage). Asking for a pass would be handled here.
  connection.on('close', () => {
    if (viewers.delete(connection)) countViewers();
  });
}

/** Sends viewers the latest, if anything they see has changed. */
let pushTimer = 0;
function pushView() {
  clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    if (!viewers.size) {
      lastSent = '';
      return;
    }
    const view = studentView();
    const json = JSON.stringify(view);
    if (json === lastSent) return;
    lastSent = json;
    for (const viewer of viewers) send(viewer, { type: 'view', view });
  }, 150);
}

onSave(serveStudentLink);
onReload(serveStudentLink);

if (typeof window !== 'undefined') {
  // Another tab answers the link, and tells this one how many are watching.
  window.addEventListener('storage', (event) => {
    if (event.key === viewersKey && studentLink.status === 'taken') studentLink.viewers = Number(event.newValue) || 0;
  });
  // Closing this tab ends every viewer's connection.
  window.addEventListener('pagehide', () => {
    if (studentLink.status === 'live') localStorage.setItem(viewersKey, '0');
  });
}

/**
 * What students see: the class on the kiosk, whether passes are open, who is
 * out and each Line, as the door screen shows them. This computer hears all
 * of it from the kiosk, or is the kiosk. Never how long anyone has been out,
 * and nothing about how a student's passes are treated.
 */
export function studentView(at = Date.now()): StudentView {
  const classId = account.activeClass?.id ?? null;
  const status = passStatus(at);
  const noPass = classId ? noPassNow(classId, at) : null;
  const out = classId ? openPasses(classId).sort((a, b) => a.outAt.localeCompare(b.outAt)) : [];
  const waiting = account.line.filter((spot) => spot.classId === classId);
  const lines =
    account.limitMode === 'class'
      ? [{ destination: null as string | null, spots: waiting }]
      : account.destinations.map((each) => ({
          destination: each.label as string | null,
          spots: waiting.filter((spot) => spot.destination === each.label),
        }));

  /** Whether a spot has opened for this student, as the door's "your turn" says. */
  function upNext(spot: LineSpot, ahead: number) {
    if (status === 'no-pass') return false;
    const limited = limitFor(account, spot.destination);
    if (!limited) return true;
    const taken = out.filter((pass) => !pass.alwaysGo && lineOf(account, pass.destination) === limited.line).length;
    return taken + ahead < limited.limit;
  }

  return {
    className: findClass(classId)?.name ?? null,
    status,
    ...(noPass ? { whenPassesOpen: whenPassesOpen(noPass) } : {}),
    out: out.map((pass) => ({ name: pass.studentName, destination: pass.destination })),
    lines: lines
      .filter((each) => each.spots.length)
      .map((each) => ({
        destination: each.destination,
        spots: each.spots.map((spot, index) => ({
          name: spot.studentName,
          destination: spot.destination,
          upNext: upNext(spot, index),
        })),
      })),
    destinations: account.destinations.map(({ label, color, icon }) => ({ label, color, icon })),
  };
}
