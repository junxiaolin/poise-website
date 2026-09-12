# POISE public project page

**Learning In-Hand Object Reaching to General 6D Poses**

Junxiao Lin, Tianyue Wu, Jie Yin, Jia Pan, Kaifeng Zhang, and Weiming Zhi.

The University of Sydney · Sharpa · The University of Hong Kong.

Project website: <https://junxiaolin.github.io/poise-website/>.
This repository contains the project website and browser demos, not the planned
training-code release. The named [paper PDF](assets/papers/poise.pdf) is available
from the homepage; the Code button is disabled and marked **Coming soon** until
the training-code release is public.

When updating `assets/papers/poise.pdf`, build the named manuscript with
`\anonymousfalse` and verify that it includes the author byline and links to
`https://junxiaolin.github.io/poise-website/`. Do not upload an anonymous review PDF or
change the review manuscript's default mode merely to build this public copy.

Static project page and browser-based interactive demo, hosted by GitHub Pages
from the `main` branch at the repository root. No build service is required.

## Deployment

In this repository's **Settings → Pages**, select **Deploy from a branch**,
branch **main**, folder **/ (root)**. Keep `.nojekyll` at the site root.
All demo, video, and model assets are served from this repository with relative
paths, including when the site is hosted under `/poise-website/`.

Before publishing updates, run `python3 tools/check_site.py`. For a local
subdirectory test, serve a temporary parent directory containing a `poise-website`
symlink to this checkout and open `/poise-website/` in the browser.

## Interactive demo

- Project page: <https://junxiaolin.github.io/poise-website/#interactive-demo>
- Full-page demo: <https://junxiaolin.github.io/poise-website/demo.html>
- HexPrism deep link: <https://junxiaolin.github.io/poise-website/demo.html?object=hexprism40>

The homepage creates the iframe **only after Start demo is clicked**. The full-page
entry starts immediately. Both use the same versioned, same-origin static artifact
under `policy-demo/`. Object selection reloads only the iframe. Ordinary visits
default to Hammer. Click inside the simulation before using keyboard controls.

Physics runs with MuJoCo WASM and policy inference with ONNX Runtime Web in a
Web Worker. All runtime dependencies are served by this site: no remote GPU,
WebSocket, localhost bridge, CDN scripts, camera or robot SDK access is needed.
ONNX uses one WASM thread, so the demo does not depend on COOP/COEP headers that
GitHub Pages cannot configure. A modern browser with WebGL2/WebAssembly is needed;
desktop Chrome or Edge with a keyboard is recommended. Mobile devices can use
the on-screen target/reset buttons, but fine-control shortcuts need a keyboard.

### Current release

`policy-demo/r-2c8930975c67ceeb/`

- Hammer: Curriculum Swing10 `model_89800.pt` exported to ONNX.
- HexPrism: Diverse FixedPalmUp `model_32600.pt` exported to ONNX.
- Domain randomization disabled. Ordinary drops auto-reset.
- UI, fine-control filters, R/F samplers and initial grasps are unchanged from
  the audited browser release. This is approximate MuJoCo physics, not a live
  IsaacLab backend or an equivalent quantitative benchmark.
- About 40.7 MB for the complete two-object release; only the selected object's
  assets load, with shared runtime assets reusable from the browser cache.

Each release contains a SHA-256 file manifest in `release.json`, model identity
in its policy contracts, and third-party notices in `THIRD-PARTY.md` / `licenses/`.
Runtime ONNX weights and meshes are downloadable, as required for client-side
execution. No training checkpoints, full grasp banks, sessions or robot SDK are
included. Third-party notices do not grant a blanket license to project assets.

### Updating

Export/build the audited **public** browser release in the development repository,
then run its `tools/sync_sharpa_demo_to_project_site.py` with `--release` pointing
to that artifact and `--site` pointing to this checkout. The tool validates every
file hash, copies **only** manifest-listed files and updates the `data-policy-src`
in both entry pages. It never commits or pushes automatically. Review the changes,
test both entries with an ordinary static server, then commit and push to `main`.

Keep old version directories while previous HTML might still be cached. Do not
replace runtime files inside an existing release: a new artifact gets a new
version directory, avoiding cached worker/model mismatches. `.nojekyll` must remain
at the site root. GitHub Pages ignores `_headers`; this demo does not require it.

GitHub Pages reachability and download speed depend on the visitor's network.
There are no additional external script/CDN dependencies, but reliable access
from every network or region is not guaranteed.
