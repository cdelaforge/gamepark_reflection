# Reflection - Game Park

Adaptation of Reflection for [Game Park](https://game-park.com/): a puzzle game for 1 to 6 players by Christophe Delaforge,
based on an original idea by Jean-François Mainguet. Place items on a randomly generated grid so that the path of each
laser matches the clues on the edge; the fastest player wins.

Rules: [French](app/public/rules-fr.pdf), [English](app/public/rules-en.pdf).

## Documentation

**Game Park framework documentation: [gamepark.github.io](https://gamepark.github.io)**

## Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/)

## Quick Start

```bash
yarn install
yarn dev
```

The game opens at http://localhost:3000.

### Console commands (browser)

```javascript
game.new(2)               // New game (2 players)
game.monkeyOpponents(true) // Opponents play automatically
game.undo()               // Undo last move
```

## Scripts

| Command          | Purpose                                                                          |
|------------------|----------------------------------------------------------------------------------|
| `yarn test`      | Tests of the rules and the app                                                   |
| `yarn lint`      | ESLint on the rules and the app                                                  |
| `yarn rules-pdf` | Prints `app/public/rules-<lang>.pdf` from `app/rules/rules.html` (Chrome or Edge) |
| `yarn publish`   | Publishes the rules package `@gamepark/reflection` on npm                        |
| `yarn deploy`    | Builds and uploads the app                                                       |

The rules PDFs take their texts from `app/public/translation/<lang>.json` and `app/rules/texts.json`. Outside the usual
Windows paths, set `CHROME` to the browser executable.

## Deployment

Rules are deployed by the Game Park team.

To deploy the React app, install [rclone](https://rclone.org/) then configure, with the keys provided by Game Park:

```
rclone config
> n
name> reflection
Storage> s3
provider> Other
env_auth> false
access_key_id> [your key - do not commit!]
secret_access_key> [your secret - do not commit!]
region> [empty]
endpoint> cellar-c2.services.clever-cloud.com
location_constraint> [empty]
acl> public-read
Edit advanced config> n
```

Then deploy with:

```bash
yarn deploy
```
