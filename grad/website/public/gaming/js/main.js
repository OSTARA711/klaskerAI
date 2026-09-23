/*
*

* Agentic AI Klasker Frontier
* Path: grad/website/static/gaming/js/main.js
*
* Agentic AI space strategy and trade game.
*

*/

import { createGalaxy } from "./galaxy.js";
import { createRenderer } from "./render.js";

(function () {
"use strict";

var canvas =
document.getElementById("game-canvas");

var gameShell =
document.getElementById("game-shell");

var loading =
document.getElementById("game-loading");

var enterFullscreen =
document.getElementById("enter-fullscreen");

var exitFullscreen =
document.getElementById("exit-fullscreen");

if (!canvas) {
return;
}

var gl =
canvas.getContext(
"webgl2",
{
alpha: false,
antialias: true,
depth: true,
stencil: false,
premultipliedAlpha: false,
preserveDrawingBuffer: false
}
);

if (!gl) {
if (loading) {
loading.textContent =
"WebGL2 is required to play Klasker Frontier.";
}


return;


}

/*

* Create the game galaxy once.
*
* The galaxy belongs to the game state rather than to the
* renderer. WebGL context recovery therefore reuses the same
* galaxy instead of generating a different universe.
  */

var galaxy;

try {
galaxy = createGalaxy();
} catch (error) {
console.error(
"Klasker Frontier galaxy initialisation failed:",
error
);


if (loading) {
  loading.hidden = false;
  loading.textContent =
    "Unable to initialise the galaxy data.";
}

return;


}

var state = {
gl: gl,
canvas: canvas,
galaxy: galaxy,
width: 0,
height: 0,
pixelRatio: 1,
running: false,
previousTime: 0,
deltaTime: 0
};

var renderer;

function resize() {
var rect =
canvas.getBoundingClientRect();


state.pixelRatio =
  Math.min(
    window.devicePixelRatio || 1,
    2
  );

state.width =
  Math.max(
    1,
    Math.round(
      rect.width *
      state.pixelRatio
    )
  );

state.height =
  Math.max(
    1,
    Math.round(
      rect.height *
      state.pixelRatio
    )
  );

if (
  canvas.width !== state.width ||
  canvas.height !== state.height
) {
  canvas.width = state.width;
  canvas.height = state.height;
}

gl.viewport(
  0,
  0,
  state.width,
  state.height
);

if (renderer) {
  renderer.resize();
}


}

function enterGameFullscreen() {
if (!gameShell) {
return;
}


if (
  document.fullscreenElement ===
  gameShell
) {
  return;
}

if (gameShell.requestFullscreen) {
  gameShell
    .requestFullscreen()
    .catch(function (error) {
      console.error(
        "Klasker Frontier fullscreen request failed:",
        error
      );
    });
}


}

function exitGameFullscreen() {
if (!document.fullscreenElement) {
return;
}


if (document.exitFullscreen) {
  document
    .exitFullscreen()
    .catch(function (error) {
      console.error(
        "Klasker Frontier fullscreen exit failed:",
        error
      );
    });
}


}

function updateFullscreenControls() {
var fullscreen =
document.fullscreenElement ===
gameShell;


if (enterFullscreen) {
  enterFullscreen.hidden =
    fullscreen;
}

if (exitFullscreen) {
  exitFullscreen.hidden = true;
}

if (gameShell) {
  gameShell.classList.toggle(
    "is-fullscreen",
    fullscreen
  );
}

resize();


}

if (enterFullscreen) {
enterFullscreen.addEventListener(
"click",
function (event) {
event.preventDefault();
enterGameFullscreen();
}
);
}

if (exitFullscreen) {
exitFullscreen.addEventListener(
"click",
function (event) {
event.preventDefault();
exitGameFullscreen();
}
);
}

document.addEventListener(
"fullscreenchange",
updateFullscreenControls
);

window.addEventListener(
"resize",
resize
);

canvas.addEventListener(
"webglcontextlost",
function (event) {
event.preventDefault();


  state.running = false;

  if (loading) {
    loading.hidden = false;
    loading.textContent =
      "WebGL context lost. Waiting for recovery...";
  }
}


);

canvas.addEventListener(
"webglcontextrestored",
function () {
try {
renderer =
createRenderer(
gl,
canvas,
galaxy
);


    resize();

    state.running = true;
    state.previousTime =
      performance.now();

    if (loading) {
      loading.hidden = true;
    }

    window.KlaskerFrontier.renderer =
      renderer;

    requestAnimationFrame(frame);
  } catch (error) {
    console.error(
      "Klasker Frontier renderer recovery failed:",
      error
    );

    if (loading) {
      loading.hidden = false;
      loading.textContent =
        "Unable to restore the galaxy renderer.";
    }
  }
}


);

gl.disable(gl.BLEND);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);

gl.clearColor(
0,
0,
0,
1
);

try {
renderer =
createRenderer(
gl,
canvas,
galaxy
);
} catch (error) {
console.error(
"Klasker Frontier renderer initialisation failed:",
error
);


if (loading) {
  loading.hidden = false;
  loading.textContent =
    "Unable to initialise the galaxy renderer: " +
    error.message;
}


}

resize();
updateFullscreenControls();

state.running = true;
state.previousTime =
performance.now();

function frame(time) {
if (!state.running) {
return;
}


if (!state.previousTime) {
  state.previousTime = time;
}

state.deltaTime =
  Math.min(
    (time - state.previousTime) /
      1000,
    0.1
  );

state.previousTime = time;

renderer.render(
  state.deltaTime
);

if (loading) {
  loading.hidden = true;
}

requestAnimationFrame(frame);


}

window.KlaskerFrontier = {
canvas: canvas,
gl: gl,
state: state,
galaxy: galaxy,
renderer: renderer,
resize: resize,
enterFullscreen:
enterGameFullscreen,
exitFullscreen:
exitGameFullscreen
};

requestAnimationFrame(frame);
}());
