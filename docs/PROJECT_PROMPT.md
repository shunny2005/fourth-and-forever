# Project Prompt

This is the canonical product brief for this repository, saved verbatim from the owner on 2026-10-02. Treat it as the project-specific requirements when deciding what to build and how to prioritize.

---

You are an autonomous senior game-development team. Build a COMPLETE, FREE, PLAYABLE American-football franchise game from scratch in one pass.

The high-level concept is:

**“Retro football gameplay + genuinely deep franchise management.”**

The game should have the immediate accessibility and short-game appeal of games like Retro Bowl, but it must be an ORIGINAL game—not a clone. Create original visuals, UI, names, branding, mechanics, code, and assets.

The key difference is depth. I want the player to feel like they are actually running an NFL-style franchise over many seasons: scouting prospects, drafting players, developing young talent, managing contracts and the salary cap, trading, dealing with injuries, constructing a roster, hiring coaches, navigating free agency, and then actually playing football games with the team they built.

Do not build a tiny prototype or a menu mockup. Build the most complete polished version feasible in one autonomous run.

## 1. CORE GAME LOOP

The franchise loop should be:

OFFSEASON
→ retirements
→ coaching changes
→ roster decisions
→ free agency
→ scouting
→ combine/prospect evaluation
→ draft
→ undrafted players
→ training camp
→ roster cuts

REGULAR SEASON
→ weekly preparation
→ injuries/recovery
→ depth-chart decisions
→ games
→ player development
→ trades
→ standings/stat tracking

POSTSEASON
→ playoffs
→ championship
→ awards
→ progression/regression
→ retirements
→ next offseason

A franchise should be capable of continuing for decades.

The game should continuously generate new players and prospects so that eventually the entire original league is replaced by procedurally generated players.

## 2. LEAGUE

Create a fictional 32-team professional football league structured similarly to a real American professional league:

- 2 conferences
- 4 divisions per conference
- 4 teams per division
- full regular season
- bye weeks
- division standings
- conference standings
- playoff seeding
- wild cards
- playoffs
- championship game

Every franchise needs:

- city
- original team name
- abbreviation
- team colors
- logo/visual identity
- stadium
- roster
- coaching staff
- historical records

Allow the user to select any franchise.

CPU teams must operate under the same roster-building rules as the user.

## 3. REAL ROSTER DEPTH

Do NOT make the roster consist of six star players.

Create meaningful positional rosters including:

QB
RB
FB
WR
TE
LT
LG
C
RG
RT

EDGE
DT
LB
CB
S

K
P

Use realistic depth charts while simplifying only where necessary for fun.

Players should have:

- first/last name
- age
- position
- height
- weight
- experience
- college
- draft year
- draft round
- draft selection
- contract
- cap hit
- overall ability
- potential
- hidden development information
- archetype
- traits
- morale
- health
- fatigue
- injury history
- career statistics
- season statistics
- awards
- transaction history

Avoid making Overall the only thing that matters.

## 4. ATTRIBUTES

Use position-specific attributes.

Examples:

QB:
- arm strength
- short accuracy
- medium accuracy
- deep accuracy
- decision making
- pocket awareness
- mobility
- throw on run

RB:
- speed
- acceleration
- agility
- vision
- power
- receiving
- pass protection
- ball security

WR:
- speed
- acceleration
- route running
- catching
- contested catching
- release
- awareness

OL:
- pass blocking
- run blocking
- strength
- awareness
- athleticism

Defenders:
- tackling
- coverage
- pass rush
- block shedding
- pursuit
- awareness
- speed
- strength

Physical attributes should generally decline differently from mental/technical attributes as players age.

## 5. PLAYER ARCHETYPES

Players should feel different even when similarly rated.

Examples:

QB:
- pocket passer
- gunslinger
- improviser
- dual threat
- game manager

RB:
- power back
- elusive back
- receiving back
- balanced back

WR:
- deep threat
- route technician
- possession receiver
- contested-catch receiver
- slot receiver

EDGE:
- speed rusher
- power rusher
- run defender

CB:
- press corner
- man specialist
- zone specialist
- ball hawk

Generate meaningful strengths and weaknesses around archetypes.

## 6. POTENTIAL AND DEVELOPMENT

Potential should NOT simply be displayed as an exact number.

Internally track true potential/development ability.

Show uncertain scouting estimates such as:

A
B
C
D

or:

Elite
High
Average
Limited

These estimates can be wrong.

Development should depend on:

- age
- potential
- playing time
- performance
- coaching
- injuries
- training
- work ethic/personality
- randomness

Include:

- breakout players
- late bloomers
- draft busts
- rapid decline
- unexpected stars
- veterans who remain effective longer than expected

Do not make progression deterministic.

## 7. REAL DRAFT SYSTEM

The draft is one of the most important systems.

Create a full multi-round draft with hundreds of generated prospects.

Prospects should come from fictional colleges.

Each prospect has incomplete information.

Before the draft, teams receive:

- scouting reports
- college production
- physical measurements
- combine results
- positional rankings
- projected draft range
- strengths
- weaknesses
- scheme fit
- interviews/personality information

But scouting MUST be imperfect.

A prospect displayed as:

“Projected: Round 1”

could actually have third-round talent.

Likewise, an overlooked prospect could become elite.

Include:

- draft board
- positional rankings
- big board
- scouting points/resources
- combine
- individual scouting
- private workouts/interviews
- mock drafts
- team needs
- CPU draft logic
- draft trades
- future picks
- compensatory-style picks if feasible

During the draft show:

PICK 1
Team selects...

and allow the user to:

DRAFT
TRADE PICK
VIEW BOARD
VIEW TEAM NEEDS

CPU teams should draft intelligently according to:

- talent
- positional value
- team need
- scheme
- roster age
- available players
- quarterback situation

CPU teams should occasionally surprise the user.

## 8. DRAFT CLASSES

Every draft class should feel different.

Examples:

- legendary QB class
- weak QB class
- deep WR class
- elite defensive class
- top-heavy draft
- unusually deep draft
- weak overall class

Generate occasional generational prospects, but make them rare.

Late-round stars should also be rare but possible.

## 9. CONTRACTS AND SALARY CAP

Implement an understandable but meaningful salary-cap system.

Contracts include:

- years
- annual salary
- guaranteed money if feasible
- cap hit
- signing bonus if feasible

Players evaluate offers according to:

- money
- team quality
- expected role
- location/team preference if modeled
- loyalty
- coaching
- chance to contend

Allow:

- extensions
- releases
- trades
- free-agent signings
- franchise-tag-like mechanism if useful
- rookie contracts

Do not let the user hoard every superstar.

Good teams eventually face difficult decisions.

## 10. FREE AGENCY

Free agency should contain players from across the league.

Include bidding competition.

Players can:

- accept another team's offer
- ask for more money
- prefer a contender
- prefer playing time
- take a short prove-it contract

CPU teams must participate realistically.

## 11. TRADES

Implement a real trade interface.

Allow:

- players
- current picks
- future picks

CPU evaluates:

- age
- contract
- position
- rating
- potential
- positional value
- team need
- draft-pick value
- contention window

Prevent obvious exploitation.

Include a trade block and CPU-generated trade offers.

## 12. TEAM BUILDING

Roster construction should create real strategic choices.

Examples:

Do I pay my elite QB $50M+ equivalent?

Do I trade an aging star before his value collapses?

Do I draft a QB behind my veteran?

Do I spend first-round capital on an offensive tackle?

Can I win with a cheap quarterback and elite defense?

Should I rebuild?

Should I trade future picks for a championship run?

Make multiple strategies viable.

## 13. COACHING

Include:

- head coach
- offensive coordinator
- defensive coordinator

Coaches have attributes such as:

- development
- offense
- defense
- play calling
- player relationships
- scouting

Coaches should affect player development and team performance.

Coaching styles should influence schemes.

## 14. SCHEMES

Examples:

OFFENSE:
- West Coast
- Spread
- Vertical
- Power Run
- Zone Run
- Play Action

DEFENSE:
- 4-3
- 3-4
- Nickel
- aggressive blitz
- coverage-focused

Player archetypes should interact with scheme fit.

Do not make scheme fit overwhelmingly powerful, but make it meaningful.

## 15. PLAYABLE FOOTBALL

Games MUST actually be playable.

Aim for quick, satisfying games around 5–10 minutes.

Use an original retro/pixel-inspired visual style.

The field should be readable immediately.

Controls should be extremely simple.

OFFENSE:

Allow the player to control:

- QB movement
- passing
- receiver selection
- rushing
- scrambling

Potential control concept:

WASD / arrows = move
click/tap receiver = pass
hold/release = throw strength or trajectory
space = sprint/dive/special action

Choose whatever control system feels best after implementation.

Passing should involve:

- routes
- timing
- coverage
- QB accuracy
- pressure
- receiver ability
- interceptions
- incompletions
- contested catches

Running should involve:

- blocking
- gaps
- acceleration
- tackles
- broken tackles
- jukes/cuts if feasible

Do not require the player to manually control 11 players.

## 16. DEFENSE

If feasible, allow playable defense.

The user can control one defender while AI handles everyone else.

Include:

- tackling
- coverage
- interceptions
- sacks
- blitzes
- defensive play calls

If fully playable defense significantly reduces overall game quality, provide a strong simulated-defense option and focus gameplay polish on offense.

## 17. PLAYBOOK

Include formations and plays.

Examples:

RUN:
- inside zone
- outside zone
- power
- draw
- counter

PASS:
- slants
- curls
- mesh
- four verticals
- flood
- screens
- play action

Do not require hundreds of plays.

A smaller set of meaningfully different plays is preferable.

## 18. SIMULATION ENGINE

Every game must also be simulatable.

The simulation engine should consider:

- player quality
- positional matchups
- quarterback play
- offensive line
- pass rush
- secondary
- coaching
- scheme
- injuries
- fatigue
- home advantage
- randomness

Generate believable:

- scores
- box scores
- individual statistics
- drives
- turnovers
- sacks
- touchdowns

Avoid purely rating-based deterministic outcomes.

Bad teams should sometimes beat great teams.

## 19. STATISTICS

Track:

QB:
- attempts
- completions
- yards
- touchdowns
- interceptions
- sacks
- passer efficiency

Rushing:
- attempts
- yards
- touchdowns
- yards/carry

Receiving:
- targets
- catches
- yards
- touchdowns

Defense:
- tackles
- sacks
- interceptions
- forced fumbles

Team:
- points
- yards
- turnovers
- offensive/defensive rankings

Store:

- game
- season
- career

statistics.

## 20. LEAGUE HISTORY

This is critical for long franchises.

Keep persistent history including:

- champions
- championship appearances
- MVPs
- offensive/defensive awards
- rookies of the year
- statistical leaders
- records
- draft history
- team season records

Create record books for:

- career passing yards
- passing TDs
- rushing yards
- receiving yards
- sacks
- interceptions
- single-season records

Players should eventually be able to enter a Hall of Fame.

## 21. PLAYER PAGES

Clicking a player should show a polished card/page containing:

NAME
POSITION
AGE
TEAM

attributes
archetype
contract
development estimate
morale
injury status

CURRENT SEASON

CAREER STATS

CAREER HISTORY

AWARDS

TRANSACTIONS

DRAFT:
Round 3, Pick 78 — [Team]

The goal is to make generated players memorable.

## 22. INJURIES

Include injuries with:

- type
- severity
- expected recovery
- recurrence probability if appropriate

Examples:

ankle sprain
hamstring strain
concussion
ACL tear
shoulder injury

Injury risk depends on:

- position
- workload
- durability
- previous injuries
- randomness

Do not make injuries excessively frequent.

## 23. FATIGUE

Track short-term fatigue during games and longer-term workload where useful.

RBs receiving huge workloads should fatigue.

Backup players should therefore matter.

## 24. MORALE AND PERSONALITY

Give players lightweight personalities.

Examples:

- team-first
- ambitious
- loyal
- volatile
- hardworking
- laid-back
- competitive

Personality can influence:

- contract demands
- development
- morale
- free agency
- trade requests

Avoid turning this into tedious micromanagement.

## 25. NEWS SYSTEM

Generate a league news feed.

Examples:

BREAKING:
Chicago trades veteran QB Marcus Reed to Portland.

DRAFT:
Seattle selects QB Devin Carter with the #2 pick.

INJURY:
Star WR Malik Brooks expected to miss 5 weeks.

MILESTONE:
RB Andre Lewis surpasses 10,000 career rushing yards.

RECORD:
QB Caleb Monroe sets the single-season passing touchdown record.

News makes the generated league feel alive.

## 26. AI GENERAL MANAGERS

Every CPU team needs persistent roster-building logic.

Teams should recognize whether they are:

- rebuilding
- developing
- contending
- championship contender

A rebuilding team should:

- value picks
- trade aging veterans
- play young players

A contender should:

- value immediate upgrades
- potentially trade future picks
- sign useful veterans

Teams should not behave identically.

Give GMs hidden tendencies such as:

- aggressive trader
- draft-focused
- conservative
- star hunter
- analytics-oriented
- win-now

## 27. DIFFICULTY

Difficulty should primarily improve CPU decision-making rather than blatantly cheating.

Potential settings:

CASUAL
PRO
EXPERT

Higher difficulties can:

- scout better
- draft better
- negotiate better
- exploit roster weaknesses better
- play better football

Do not simply give CPU players enormous attribute boosts.

## 28. USER EXPERIENCE

The interface should be extremely easy to navigate despite the simulation depth.

Main franchise dashboard:

NEXT GAME

[Opponent]

Team Record

PLAY
SIMULATE

Then navigation:

TEAM
LEAGUE
SCHEDULE
STANDINGS
STATS
ROSTER
FRONT OFFICE
SCOUTING

During offseason automatically surface the relevant action:

FREE AGENCY

NEXT: DRAFT

The user should never wonder what they are supposed to do next.

## 29. VISUAL DESIGN

Use an original cohesive retro sports aesthetic.

Think:

- pixel-inspired graphics
- modern clean menus
- readable typography
- satisfying transitions
- team colors
- small player portraits
- stadium atmosphere
- weather effects if feasible

Do not use copyrighted team logos, player likenesses, or Retro Bowl assets.

Everything must be original.

## 30. AUDIO

If feasible, generate/use legal original/simple audio for:

- crowd
- tackles
- catches
- whistles
- touchdowns
- menu interactions

Provide mute controls.

Do not depend on copyrighted music or audio.

## 31. SAVE SYSTEM

Implement robust persistent saving.

Support multiple franchise save slots.

Save:

- entire league
- rosters
- contracts
- draft picks
- prospects
- schedules
- stats
- history
- records
- settings
- current week

Autosave after important actions.

The user should be able to close the game and resume.

## 32. GAME SPEED

Allow:

PLAY GAME
SIM GAME
SIM WEEK
SIM TO NEXT EVENT

During offseason:

ADVANCE

should automatically process CPU decisions and stop at important user decisions.

## 33. OPTIONAL ADVANCED SYSTEMS

After the core game works, add whichever of these provide the most value:

- weather
- home-field advantage
- rivalry games
- player holdouts
- trade requests
- contract restructuring
- practice squads
- waiver wire
- compensatory picks
- coordinators becoming head coaches
- coach hiring/firing
- owner expectations
- dynamic salary cap
- scouting staff
- draft-day presentation
- Hall of Fame
- league records
- expansion/custom teams
- custom league settings

Do NOT sacrifice core stability for these.

## 34. TECHNICAL REQUIREMENTS

Choose a stack that allows the game to be run completely FREE by the user.

Prefer a browser-based implementation unless another architecture clearly improves the game.

Requirements:

- no paid APIs
- no subscriptions
- no proprietary backend required
- no required account
- no server required for single-player
- local persistence
- responsive performance
- desktop browser support
- mobile-friendly if feasible

A strong default is:

TypeScript
React
Canvas or Phaser
local persistence

But choose the architecture yourself.

Keep simulation logic separated from rendering/UI.

Suggested architecture:

/game
    gameplay engine
    physics
    AI

/simulation
    games
    players
    development
    injuries
    statistics

/franchise
    contracts
    trades
    draft
    scouting
    free agency

/league
    teams
    schedule
    standings
    playoffs
    history

/ui

/data

/tests

The simulation should not depend on the UI.

## 35. PROCEDURAL GENERATION

Create deterministic seeded generation.

Generate:

- players
- names
- colleges
- draft classes
- ratings
- appearances
- personalities

Use diverse but plausible names.

A seed should reproduce the same initial universe.

## 36. BALANCING

Create realistic rating distributions.

Do not create leagues full of 90+ players.

Example conceptual distribution:

90–99 = elite
80–89 = strong starter
70–79 = starter
60–69 = rotational/depth
<60 = replacement-level/developmental

But tune the actual numbers through testing.

Ratings should be position-relative where appropriate.

## 37. AUTOMATED TESTING

Before considering the project finished, automatically test important franchise invariants.

Examples:

- season completes without crashing
- playoffs produce exactly one champion
- draft completes
- every pick belongs to a valid team
- CPU teams maintain legal rosters
- salary cap calculations remain valid
- free agency works
- trades transfer assets correctly
- players age
- players retire
- new draft classes generate
- statistics accumulate correctly
- save/load preserves state
- 20+ seasons can simulate without corruption

Run long simulations.

Simulate at least 20 seasons automatically and inspect for:

- rating inflation
- broken salary economy
- teams with impossible rosters
- quarterbacks disappearing
- draft classes becoming malformed
- unrealistic scoring
- stat inflation
- excessive undefeated teams
- permanent dynasties caused by broken AI
- cap deadlocks
- crashes

Fix major issues discovered.

## 38. POLISH PASS

Once everything works, perform a dedicated polish pass.

Look for:

- ugly layouts
- overflowing text
- confusing navigation
- missing feedback
- boring animations
- unclear buttons
- poor mobile scaling
- inconsistent spacing
- unrealistic generated data
- repetitive names
- bad AI decisions
- simulation exploits

Fix them rather than simply documenting them.

## 39. PRIORITY ORDER

When forced to choose, prioritize:

1. Working game
2. Playable football
3. Draft
4. Roster/team building
5. Multi-season franchise
6. CPU team-building AI
7. Contracts/free agency/trades
8. Player development
9. Stats/history
10. Visual polish
11. Advanced features

A smaller system that actually works is preferable to a huge broken placeholder system.

However, do not use this as an excuse to produce a minimal MVP. Implement as much depth as the environment reasonably permits.

## 40. AUTONOMOUS DEVELOPMENT DIRECTIVE

You are authorized to:

- create all files
- install free dependencies
- choose architecture
- create original assets
- refactor aggressively
- run tests
- run the game
- inspect errors
- fix bugs
- rebalance systems
- redesign poor UI
- add systems you believe materially improve the game

Do not repeatedly stop to ask me implementation questions.

Make sensible decisions yourself.

When something does not work:

1. investigate it,
2. identify the root cause,
3. fix it,
4. test again.

Do not leave TODO placeholders for core features.

Do not create buttons that do nothing.

Do not fake systems through static UI.

## 41. DEFINITION OF DONE

The project is finished when I can launch it and:

1. Choose a franchise.
2. See a complete roster.
3. Set my depth chart.
4. Play or simulate football games.
5. Complete a season.
6. Reach the playoffs.
7. Complete an offseason.
8. Scout a generated draft class.
9. Conduct a real multi-round draft.
10. Trade players and draft picks.
11. Sign free agents.
12. Manage contracts and the salary cap.
13. Watch young players develop.
14. Watch veterans decline and retire.
15. See CPU teams rebuild and contend.
16. Track statistics and records.
17. Continue for many seasons.
18. Save the franchise.
19. Close the game.
20. Reload it and continue exactly where I left off.

The final experience should make me want to say:

**“One more week.”**

and during the offseason:

**“One more draft.”**

Build the actual game now.

Do not merely give me an implementation plan.

Do not stop after scaffolding.

Do not return a design document instead of the product.

Start by establishing the architecture and immediately implement the playable vertical slice. Then continue autonomously through franchise depth, simulation, testing, balancing, and polish until the best complete version feasible in this run is working.

At completion, provide:

- exact run instructions
- concise architecture explanation
- implemented feature list
- controls
- testing performed
- any genuinely non-core limitations remaining

Most importantly: leave behind a runnable game, not a proposal.
