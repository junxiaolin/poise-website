/* The project page loads no simulation assets until the visitor clicks Start.
 * Only a relative, versioned browser artifact is embedded; no remote backend.
 */
(() => {
  const host = document.querySelector("[data-policy-src]");
  if (!host) return;
  function launch() {
    if (host.querySelector("iframe")) return;
    const url = new URL(host.dataset.policySrc, document.baseURI);
    const object = new URLSearchParams(location.search).get("object");
    if (object === "hexprism40" || object === "hexhammer") url.searchParams.set("object", object);
    const frame = document.createElement("iframe");
    frame.title = "POISE interactive policy simulation";
    frame.src = url.href;
    frame.allow = "fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "no-referrer";
    frame.addEventListener("load", () => {
      // Same-origin focus lets keyboard controls work after clicking Start.
      // Selection reloads only this iframe, preserving the surrounding page.
      frame.contentWindow?.focus();
    });
    host.replaceChildren(frame);
    host.classList.add("is-running");
  }
  if (host.hasAttribute("data-policy-autostart")) launch();
  else host.querySelector("[data-policy-launch]")?.addEventListener("click", launch);
})();
