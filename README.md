# CrypticGen

CrypticGen is a four-agent songwriting studio set in the Cryptic Syndicate world. Give the agents a line, a scene, or a full brief, or leave the prompt blank and let them choose a starting tension. The studio produces original lyrics with performance cues, a separate Suno style prompt, and session notes. You can copy the Suno fields individually or download them together as text.

[Open the live studio](https://crypticgen.noisyfudge4.chatgpt.site/#track-studio)

## Run it locally

From the repository root, serve the `dist/` directory with Python 3 and open [localhost:4177](http://127.0.0.1:4177/) in a modern browser.

```sh
python -m http.server 4177 --bind 127.0.0.1 --directory dist
```

`dist/` is the editable source. The studio loads plain HTML, CSS, and JavaScript modules directly. Use localhost or HTTPS for authorization, key encryption, and clipboard access. Node.js is useful for syntax checks and mocked engine runs.

In the studio, **Connect OpenRouter** is where you supply a key and choose models. An agent inherits the default model unless it has an override. The built-in default is `openrouter/free`.

## Architecture and backend

Sites serves the static files. The browser runs the interface, coordinates the four turns, and sends HTTPS requests directly to OpenRouter using the visitor’s key. OpenRouter routes each turn to its selected model. The project has no application server or database. The browser saves the draft and finished tracks locally, and the user takes the lyrics and style text into Suno.

| File | Responsibility |
| --- | --- |
| [`dist/index.html`](dist/index.html) | Studio page, composer, output tabs, agent guide, and dialogs. |
| [`dist/studio.js`](dist/studio.js) | Input state, Auto and locks, run and cancel actions, progress, browser history, copy, and download. |
| [`dist/engine.js`](dist/engine.js) | Agent prompts and profiles, slider definitions, OpenRouter requests, turn order, and output validation. |
| [`dist/references.js`](dist/references.js) | Syndicate canon, unseeded story tensions, and selection of writing techniques. |
| [`dist/connection.js`](dist/connection.js) | Key entry and authorization, encrypted saving, model selection, and connection checks. |
| [`dist/studio.css`](dist/studio.css), [`dist/brand.tokens.css`](dist/brand.tokens.css), [`dist/assets/`](dist/assets/) | Studio layout, shared brand tokens, and artwork from the supplied brand reference. |
| [`.openai/hosting.json`](.openai/hosting.json) | Existing Sites project identity and the static directory it serves. |

## How a track is made

[`runTrack`](dist/engine.js) is the generation entry point. Each turn makes one OpenRouter chat completion with `response_format` set to `json_object`. The engine validates the reply and passes the usable result forward before starting the next turn.

1. **Paradoxic** (`paradoxic`) finds the central contradiction, title, concrete anchor image, and emotional arc. With **Let Paradoxic steer** enabled, he assigns the sliders left on Auto. Those values govern the real run and appear in **Session notes**.
2. **The Chrononaut Technician** (`chrononaut`) creates the Suno style draft, tempo and rhythmic feel, and bracketed arrangement cues.
3. **Brayne Snax** (`brayne_snax`) writes the original verses and hook from the brief and the production plan. He can draw on the selected writing techniques for rhyme, phrasing, and rhythmic turns.
4. **MR. E** (`mr_e`) prepares the final lyrics and style fields. He can change pacing, punctuation, and performance cues while preserving Brayne’s sung words and their order. If his lyric version exceeds the cap or changes the sung words, the engine keeps Brayne’s draft and fits in the Chrononaut’s cues where it can.

The four roles share one orchestrator. For continuity, each stage can receive its own short wake note from the most recent completed track. Paradoxic also sees the previous title and concept to help vary the next track. A failed turn stops the run and identifies the agent and model in the error.

### Controls and creative direction

- The prompt takes up to **5,000 characters** and reaches all four turns. A supplied brief governs the song’s subject and setting. A blank brief starts from one of six Syndicate tensions and skips the previous tension when that history is available.
- A numeric slider setting is a lock, including zero. With steering on, `null` means Auto. With steering off, untouched sliders use their defaults. Paradoxic’s resolved settings go into `creative_directive` for the other three turns. The resolved length also sets their `lyric_budget`.
- **Lyrics length** is a target from **1,700 to 5,000**, with a default of **3,300** and 100-character slider steps. The engine budgets some space for cues. Finished lyrics have a hard **5,000-character** cap including cues, spaces, and line breaks. The separate style field has a **1,000-character** cap.
- **Writing style** (`style_blend`) runs from the agents’ style at 0 to the user’s style at 100. At 0, Brayne gets no writing reference cards. Above 0, he gets two selected technique cards, with the dial controlling how strongly to apply them. The cards describe craft such as cadence and wordplay. The lyric language remains original.

`references.js` distills the supplied Syndicate lore and lyric-reference material into shared canon and writing cards. The character profiles inform the live system prompts in `engine.js`. `STAGES` in that file supplies the visible role labels, bios, and progress messages for **Meet the agents** and the progress rail. To grant an agent a new capability, trace the value from its prompt and validated reply to the point where the app or next agent uses it.

## OpenRouter and browser data

- **Keys** can be pasted or obtained through OpenRouter authorization with PKCE. A key stays in the current tab by default. **Save on this device** encrypts it with a passphrase before saving to local storage. A saved key must be unlocked in a new tab or after reload. The OAuth verifier and state live in same-tab session storage during the exchange.
- **Check connection** verifies the key and checks each distinct model assigned to the agents. `openrouter/free` and `:free` selections get a small JSON reply probe with zero price caps. Other selections get an endpoint lookup and, when available, a check against the account’s model list. `openrouter/auto` is checked against the model list because it selects a route at generation time. Full generations use the selected models and may spend credits on the visitor’s OpenRouter account.
- **History** and draft settings are scoped to the browser and site origin. `crypticgen.draft.v1` holds the prompt and controls, `crypticgen.track.v1.<id>` holds each completed session, and `crypticgen.openrouter-models.v1` holds model preferences. Localhost and the live site have separate storage. The text export contains the title, style, and lyrics.
- **Compatibility** matters when changing controls. Drafts from before the lyrics-length Auto switch can have `draft.lyricLength`. `studio.js` restores that as a lock when `controls.lyric_length` is absent. An explicit `null` in the newer field preserves Auto.

## Validate and deploy changes

Use the local studio for desktop and mobile checks. Run syntax checks on the JavaScript you change.

```sh
node --check dist/engine.js
node --check dist/references.js
node --check dist/connection.js
node --check dist/studio.js
git diff --check
```

For a generation change, call `runTrack` with a dummy key, a `models.default` value, and an injected `request` function that returns fixture replies for the four stage IDs. The stub receives `{ key, model, messages, signal, maxTokens, stage }`. Inspect the JSON context in `messages` to verify that manual locks, Paradoxic’s Auto choices, and the character budget reach the next turn. `onStage(id, state, detail)` exposes progress for a UI smoke test. Use mocked replies to exercise generation without spending OpenRouter credits.

The GitHub remote is [JadedLegend/CrypticGen](https://github.com/JadedLegend/CrypticGen). Sites has a separate source repository for deployments.

1. Follow the installed **Sites** skill. Read `.openai/hosting.json`, look up the existing project, and confirm its current audience.
2. Use the Sites source workflow to push the exact app source and package that commit’s `dist/` files. Keep the short-lived Sites credential and visitor OpenRouter keys out of source and logs.
3. Save the version for that commit and archive, deploy it using the project’s current audience, and verify the live site. A public Sites release uses `save_site_version` followed by `deploy_site_version`.
