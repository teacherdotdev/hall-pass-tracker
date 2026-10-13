# Hallway Security Model

Hallway is a local-first prototype. There is no server holding student data:
each teacher's classes, rosters and passes live in their own browser's local
storage. See `docs/adr/0005-local-first-with-the-kiosk-in-charge-of-the-door.md`.

## What is stored, and where

- **Student names** are a first name plus the fewest letters of the last name
  needed to tell students apart (at most three). The rest is discarded when the
  roster is pasted (`docs/adr/0001`).
- **On the teacher's laptop:** everything, in local storage, unencrypted.
  Anyone who can use that browser profile can read it. The backup file is
  ordinary JSON and should be kept like any other class record.
- **Student PINs** (only for classes that turn them on) are short numbers made
  up by Hallway or the teacher, never school ID numbers (`docs/adr/0013`).
  They are kept with the roster and are in the backup file, but never in the
  History CSV.
- **On a paired kiosk:** each class's display names, destinations and Pass
  Limit, the teacher's PIN, the student PINs of classes that ask for them, and
  passes that are open or not yet handed to the laptop. It never holds the full
  history.
- **On a student's device, through the Student link:** while the teacher has
  it open, the name of the class on the kiosk, the display names and
  destinations of students who are out or in line, and whether passes are
  open. Nothing is saved there; it's shown while the page is open. See below.

## The connection between kiosk and laptop

- Hallway's matchmaking server (`peer.happyhallways.com`, also reachable as
  `peer.teacher.dev`; a standard PeerJS server)
  introduces the two devices. It sees their randomly generated addresses but
  stores nothing and never receives pass data.
- Pass data travels over WebRTC's encrypted channel, directly between the
  devices where the network allows. Where it doesn't, it is relayed through
  Cloudflare's TURN servers (`turn.cloudflare.com`, also offered as
  `turn.happyhallways.com` and `turn.teacher.dev`), which pass the encrypted
  data along without being able to read it. The browser gets relay logins
  from `/api/turn` that expire after 12 hours; the Cloudflare token that
  creates them stays on the server. Anyone can ask `/api/turn` for logins, so
  someone could use the relay at our expense; a Cloudflare usage alert would catch
  that. Google's public STUN server helps each device learn its own network
  address; it sees no pass data.
- When pairing fails, the teacher can copy a connection report to send to
  support. It holds the browser, app version, connection states and error
  messages, but no student data, network addresses or relay logins.
- The 6-digit pairing code is a temporary address. It works once and expires
  after 10 minutes. A code could, rarely, be guessed by someone else in those
  minutes, and their device would become the kiosk. Pairing again replaces it.
- After pairing, the kiosk proves itself with a long random secret. The laptop
  ignores connections without the current kiosk's secret, except that a
  replaced kiosk may hand over passes it still holds, once.

## The Student link

- Students' browsers connect to the teacher's computer the same way the kiosk
  does: introduced by the matchmaking server, then over WebRTC's encrypted
  channel, directly or through the TURN relay. The kiosk is never involved.
- The link's address holds a long random id. **Anyone who has the link can
  see what it shows** while it is open, so it is meant for the class's own
  students, in a place only they can see (such as Google Classroom). A
  student can pass it on; "Get a new link" makes the old one stop working at
  once, and "Close student link" turns everyone away.
- It shows only what the door screen already shows the whole room: the class
  on the kiosk, display names and destinations of students who are out or in
  line, and whether passes are open. Never how long anyone has been out, the
  PIN, the rest of the roster, history, or whether a student is exempt or can
  always go.
- It is view-only: the teacher's computer ignores anything a student's device
  sends except "still here". At most 40 devices can watch at once; the rest
  are told to try again later.
- The connections are served by the teacher's open browser tab. Closing it, or
  the computer sleeping, ends them.

## What the PIN does and doesn't do

The teacher PIN locks the Hallway interface on the kiosk (switching class,
unpairing, leaving kiosk mode). It is stored in plain text in local storage on
both devices, so it does not stop a technically capable person with access to
the device's browser tools. For real classroom use, run the kiosk device in its
operating system's managed kiosk or guided-access mode.

Student PINs are the same: they stop a classmate tapping someone else's name,
not a determined attacker. There is no lockout after wrong tries, and the
teacher PIN also works for any student who forgot theirs. No student PIN may
equal the teacher PIN, so a student's own PIN never opens the teacher menu.

## Kiosk screen

The kiosk shows who is out and where they went, never how long they've been
gone or whether they are overdue (`docs/adr/0003`). When the Pass Limit is
reached it says how many are out, never who.
