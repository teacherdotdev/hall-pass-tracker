# A teacher chooses one Class Limit or a limit per destination

This amends ADR 0007. Since every destination got its own Pass Limit, about
fourteen teachers have told us their school's rule is "one student out of the
room at a time, whatever the destination", with the Nurse and the Counselor
left out of it. Limits on each destination cannot say that: a Restroom and a
Water Fountain each limited to one still let two students out. Other teachers
still want the Restroom at one and the Water Fountain at three. So the teacher
now chooses, in Pass Options, how limits work: each destination has its own
Pass Limit and Line, as before, or there is one Class Limit — how many students
may be out at once — with one Class Line shared by every destination that
counts toward it. Each destination can be left out of the Class Limit, so the
Nurse never waits. Students still pick a destination, and it is still recorded.
We chose a switch between two whole ways of working over mixing them (some
destinations sharing a limit, others with their own) because no teacher asked
for the mix, and one rule per classroom is easier to explain at the door.

## Consequences

- Both ways' settings are kept: the limit on each destination stays stored
  while the Class Limit is on, and whether a destination counts toward the
  Class Limit stays stored while it is off. Switching back loses nothing.
- Everyone who had saved before this keeps a limit on each destination, so
  nothing changes at the door until the teacher chooses otherwise.
- "Counts toward the class limit" is a separate setting from "Counts toward
  the Pass Allowance". A trip can be free of the line but still use up a pass,
  or the other way round.
- A Line Skip now means going past whichever limit was reached: a destination's
  own, or the Class Limit.
- A kiosk still on the version before this, until it refreshes, is sent the
  Class Limit as each counting destination's own limit (and no limit for the
  others). It holds the Nurse back no more than before, but lets one student
  out to each destination rather than one in all. A kiosk from before ADR 0007
  is sent the Class Limit as its one limit on everyone out.
- Switching ways leaves the Line as it is. A student whose destination no
  longer has a limit is Up Next at once; the rest keep their order.
