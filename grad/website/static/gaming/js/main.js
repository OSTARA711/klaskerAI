/*

* /grad/website/static/gaming/js/main.js
*
* Agentic AI Klasker Frontier
* WebGL2 game bootstrap.
*
* This file intentionally contains only the minimum required to:
* * obtain a WebGL2 context;
* * maintain a correctly sized drawing buffer;
* * handle device pixel ratio;
* * handle fullscreen resizing;
* * provide a clean animation loop;
* * expose the WebGL2 context to later game modules.
*
* No external libraries are required.
  */

(() => {

"use strict";

/*

* Canvas
  */

const canvas = document.getElementById("game-canvas");

if (!canvas) {
console.error("Klasker Frontier: game canvas not found.");
return;
}

/*

* WebGL2
  */

const gl = canvas.getContext("webgl2", {
alpha: false,
antialias: true,
depth: true,
stencil: false,
premultipliedAlpha: false,
preserveDrawingBuffer: false
});

if (!gl) {

```
const status = document.getElementById("game-loading");

if (status) {
  status.textContent =
    "WebGL2 is required to play Klasker Frontier.";
}

console.error(
  "Klasker Frontier: WebGL2 is not available."
);

return;
```

}

/*

* Game state
  */

const state = {
gl,
canvas,
width: 0,
height: 0,
pixelRatio: 1,
running: false,
previousTime: 0
};

/*

* Canvas sizing
*
* The CSS size and drawing-buffer size are deliberately kept
* separate. WebGL renders into the drawing buffer, whose
* resolution is adjusted for the device pixel ratio.
  */

const resize = () => {

```
const rect = canvas.getBoundingClientRect();

const pixelRatio = Math.min(
  window.devicePixelRatio || 1,
  2
);

const width = Math.max(
  1,
  Math.round(rect.width * pixelRatio)
);

const height = Math.max(
  1,
  Math.round(rect.height * pixelRatio)
);


if (
  canvas.width !== width ||
  canvas.height !== height
) {

  canvas.width = width;
  canvas.height = height;

}


state.width = width;
state.height = height;
state.pixelRatio = pixelRatio;


gl.viewport(
  0,
  0,
  width,
  height
);
```

};

/*

* Initial WebGL state
  */

gl.disable(gl.BLEND);
gl.enable(gl.DEPTH_TEST);

gl.depthFunc(gl.LEQUAL);

gl.clearColor(
0.0,
0.0,
0.0,
1.0
);

/*

* Resize handling
  */

window.addEventListener(
"resize",
resize,
{ passive: true }
);

document.addEventListener(
"fullscreenchange",
resize
);

/*

* WebGL context loss
*
* Browsers can lose a GPU context. For now we stop the
* simulation rather than attempting automatic resource
* reconstruction before the renderer exists.
  */

canvas.addEventListener(
"webglcontextlost",
(event) => {

```
  event.preventDefault();

  state.running = false;

  console.error(
    "Klasker Frontier: WebGL2 context lost."
  );

},
false
```

);

canvas.addEventListener(
"webglcontextrestored",
() => {

```
  console.warn(
    "Klasker Frontier: WebGL2 context restored."
  );

  state.running = true;
  state.previousTime = performance.now();

},
false
```

);

/*

* Frame rendering
*
* At this stage the frame contains only the black space
* background. The actual galaxy renderer will be introduced
* separately.
  */

const frame = (time) => {

```
if (!state.running) {
  return;
}


const deltaTime =
  Math.min(
    (time - state.previousTime) / 1000,
    0.1
  );


state.previousTime = time;


/*
 * Keep the value available for the simulation that will
 * be added later. Capping the timestep prevents a paused
 * or background tab from producing a huge simulation step.
 */

state.deltaTime = deltaTime;


gl.clear(
  gl.COLOR_BUFFER_BIT |
  gl.DEPTH_BUFFER_BIT
);


requestAnimationFrame(frame);
```

};

/*

* Initialise
  */

resize();

state.running = true;
state.previousTime = performance.now();

const loading = document.getElementById("game-loading");

if (loading) {
loading.hidden = true;
}

/*

* Expose the minimal runtime for the next modules.
*
* This is temporary during development. Later modules can
* receive the runtime directly without creating a global
* game engine object.
  */

window.KlaskerFrontier = {
canvas,
gl,
state,
resize
};

requestAnimationFrame(frame);

})();
