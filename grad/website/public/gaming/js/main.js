/*
*
* Agentic AI Klasker Frontier
* Path: grad/website/static/gaming/js/main.js
*
* Agentic AI space strategy and trade game.
*
*/

(function () {
"use strict";

var canvas = document.getElementById("game-canvas");
var gameShell = document.getElementById("game-shell");
var loading = document.getElementById("game-loading");
var enterFullscreen = document.getElementById("enter-fullscreen");
var exitFullscreen = document.getElementById("exit-fullscreen");

if (!canvas) {
return;
}

var gl = canvas.getContext("webgl2", {
alpha: false,
antialias: true,
depth: true,
stencil: false,
premultipliedAlpha: false,
preserveDrawingBuffer: false
});

if (!gl) {
if (loading) {
loading.textContent = "WebGL2 is required to play Klasker Frontier.";
}
return;
}

var state = {
gl: gl,
canvas: canvas,
width: 0,
height: 0,
pixelRatio: 1,
running: false,
previousTime: 0,
deltaTime: 0
};

function resize() {
var rect = canvas.getBoundingClientRect();


state.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
state.width = Math.max(1, Math.round(rect.width * state.pixelRatio));
state.height = Math.max(1, Math.round(rect.height * state.pixelRatio));

if (
  canvas.width !== state.width ||
  canvas.height !== state.height
) {
  canvas.width = state.width;
  canvas.height = state.height;
}

gl.viewport(0, 0, state.width, state.height);


}

function enterGameFullscreen() {
if (!gameShell) {
return;
}


if (document.fullscreenElement === gameShell) {
  return;
}

if (gameShell.requestFullscreen) {
  gameShell.requestFullscreen().catch(function (error) {
    console.error("Klasker Frontier fullscreen request failed:", error);
  });
}


}

function exitGameFullscreen() {
if (!document.fullscreenElement) {
return;
}


if (document.exitFullscreen) {
  document.exitFullscreen().catch(function (error) {
    console.error("Klasker Frontier fullscreen exit failed:", error);
  });
}


}

function updateFullscreenControls() {
  var fullscreen = document.fullscreenElement === gameShell;

  if (enterFullscreen) {
    enterFullscreen.hidden = fullscreen;
  }

  if (exitFullscreen) {
    exitFullscreen.hidden = true;
  }

  if (gameShell) {
    gameShell.classList.toggle("is-fullscreen", fullscreen);
  }

  resize();
}

}

if (enterFullscreen) {
enterFullscreen.addEventListener("click", function (event) {
event.preventDefault();
enterGameFullscreen();
});
}

if (exitFullscreen) {
exitFullscreen.addEventListener("click", function (event) {
event.preventDefault();
exitGameFullscreen();
});
}

document.addEventListener("fullscreenchange", updateFullscreenControls);

window.addEventListener("resize", resize);

canvas.addEventListener("webglcontextlost", function (event) {
event.preventDefault();
state.running = false;


if (loading) {
  loading.hidden = false;
  loading.textContent = "WebGL context lost. Waiting for recovery...";
}


});

canvas.addEventListener("webglcontextrestored", function () {
state.running = true;
state.previousTime = performance.now();


if (loading) {
  loading.hidden = true;
}


});

gl.disable(gl.BLEND);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);

gl.clearColor(0, 0, 0, 1);

resize();
updateFullscreenControls();

state.running = true;

if (loading) {
loading.hidden = true;
}

function frame(time) {
if (!state.running) {
return;
}


if (!state.previousTime) {
  state.previousTime = time;
}

state.deltaTime = Math.min(
  (time - state.previousTime) / 1000,
  0.1
);

state.previousTime = time;

gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

requestAnimationFrame(frame);


}

window.KlaskerFrontier = {
canvas: canvas,
gl: gl,
state: state,
resize: resize,
enterFullscreen: enterGameFullscreen,
exitFullscreen: exitGameFullscreen
};

requestAnimationFrame(frame);
}());
