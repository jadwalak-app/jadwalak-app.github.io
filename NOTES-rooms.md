# rooms-wip (NOT live)
Rooms + Spy game ("مين الدخيل؟") for Jadwalak. Firebase project: jadwalak-rooms (Spark, no card). Security rules were published in the console (source copy not in this branch; see rules summary below).

Files: preview4.html (preview built on the OLDER live index, before email accounts), rooms.js, rooms.css, roomtest.js (headless 3-user test with Chrome CDP).

Tested headless: create room by code, join, feed, competitive white/red bar, full Spy round (3 players) to result.

Owed:
1. Rebuild preview from the CURRENT live index.html (it includes accounts.js, email accounts). Inject rooms.css/rooms.js plus the hooks: RoomsSync at the end of rHome, RoomsFeed in complete().
2. Switch rooms from anonymous auth to the email-account uid (rooms.js load()).
3. Mobile video + stills: home card, clue/vote/guess screens (game is below the fold, not captured).
4. Test the 8s voice clip with a real microphone (untested).
5. Publish only after Hamza writes "نزل".

Limits: host phone runs the game (stalls if host leaves); host can cheat via console (free plan, no Cloud Functions); stale members if a device clears data; free quotas 50k reads / 20k writes per day.

Rules summary: rooms get by code only, no list; members readable by members; feed/games/clues/votes/guess/reveal restricted to members; secrets doc readable only by its owner.
