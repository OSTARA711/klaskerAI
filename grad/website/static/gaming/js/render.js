/*
*
* Agentic AI Klasker Frontier
* Path: grad/website/public/gaming/js/render.js
*
* Lightweight WebGL2 galaxy renderer.
*
* Visual layers:
* 1. Background stars.
* 2. Navigable star systems.
* 3. Planets belonging to those systems.
* 4. Player cannon bursts.
*
*/

export function createRenderer(
gl,
canvas,
galaxy
) {
"use strict";

var renderer = {
gl: gl,
canvas: canvas,
galaxy: galaxy || null,

program: null,
vertexBuffer: null,
starCount: 0,

systemBuffer: null,
systemCount: 0,
systemProgram: null,

planetBuffer: null,
planetCount: 0,
planetProgram: null,

cannonBuffer: null,
cannonProgram: null,

projection: new Float32Array(16),
view: new Float32Array(16),
rotation: 0,

cameraX: 0,
cameraY: 0,
cameraZ: 75,

cannonBurst: null,
previousFire: false
};

var STAR_COUNT = 6000;
var GALAXY_RADIUS = 180;

var SYSTEM_POINT_SIZE = 5.0;
var SOL_POINT_SIZE = 9.0;

var PLANET_POINT_SIZE = 4.0;
var IMPORTANT_PLANET_POINT_SIZE = 8.0;

var MOVEMENT_SPEED = 24.0;
var ROTATION_SPEED = 1.5;

var CANNON_DURATION = 0.16;
var CANNON_DISTANCE = 3.0;
var CANNON_SPREAD = 0.8;

function createShader(type, source) {
var shader =
gl.createShader(type);

gl.shaderSource(
shader,
source
);

gl.compileShader(
shader
);

if (
!gl.getShaderParameter(
shader,
gl.COMPILE_STATUS
)
) {
var message =
gl.getShaderInfoLog(
shader
);
gl.deleteShader(
shader
);

throw new Error(
"Klasker Frontier shader compilation failed: " +
message
);
}

return shader;
}

function createProgram(
vertexSource,
fragmentSource
) {
var vertexShader =
createShader(
gl.VERTEX_SHADER,
vertexSource
);

var fragmentShader =
createShader(
gl.FRAGMENT_SHADER,
fragmentSource
);

var program =
gl.createProgram();

gl.attachShader(
program,
vertexShader
);

gl.attachShader(
program,
fragmentShader
);

gl.linkProgram(
program
);

gl.deleteShader(
vertexShader
);

gl.deleteShader(
fragmentShader
);

if (
!gl.getProgramParameter(
program,
gl.LINK_STATUS
)
) {
var message =
gl.getProgramInfoLog(
program
);

gl.deleteProgram(
program
);

throw new Error(
"Klasker Frontier shader linking failed: " +
message
);
}

return program;
}

function createProjection(
fieldOfView,
aspect,
near,
far
) {
var f =
1 /
Math.tan(
fieldOfView / 2
);

var range =
1 /
(near - far);

renderer.projection[0] =
f / aspect;

renderer.projection[1] = 0;
renderer.projection[2] = 0;
renderer.projection[3] = 0;

renderer.projection[4] = 0;
renderer.projection[5] = f;
renderer.projection[6] = 0;
renderer.projection[7] = 0;

renderer.projection[8] = 0;
renderer.projection[9] = 0;

renderer.projection[10] =
(far + near) *
range;

renderer.projection[11] = -1;

renderer.projection[12] = 0;
renderer.projection[13] = 0;

renderer.projection[14] =
2 *
far *
near *
range;

renderer.projection[15] = 0;
}

function createGalaxyStars() {
var data =
new Float32Array(
STAR_COUNT * 4
);

for (
var i = 0;
i < STAR_COUNT;
i += 1
) {
var angle =
Math.random() *
Math.PI *
2;

var radius =
Math.sqrt(
Math.random()
) *
GALAXY_RADIUS;

var spiral =
angle +
radius * 0.035 +
(Math.random() - 0.5) *
0.35;

var thickness =
(Math.random() - 0.5) *
(4 + radius * 0.045);

var x =
Math.cos(
spiral
) *
radius;

var z =
Math.sin(
spiral
) *
radius;

var y =
thickness;

var centreFactor =
1 -
Math.min(
radius /
GALAXY_RADIUS,
1
);

var brightness =
0.35 +
Math.random() * 0.5 +
centreFactor * 0.25;

var offset =
i * 4;

data[offset] =
x;

data[offset + 1] =
y;

data[offset + 2] =
z;

data[offset + 3] =
Math.min(
brightness,
1
);
}

renderer.starCount =
STAR_COUNT;

renderer.vertexBuffer =
gl.createBuffer();

gl.bindBuffer(
gl.ARRAY_BUFFER,
renderer.vertexBuffer
);

gl.bufferData(
gl.ARRAY_BUFFER,
data,
gl.STATIC_DRAW
);

gl.bindBuffer(
gl.ARRAY_BUFFER,
null
);
}

function createSystemLayer() {
if (
!renderer.galaxy ||
!renderer.galaxy.systems
) {
return;
}

var systems =
renderer.galaxy.systems;

var data =
new Float32Array(
systems.length * 6
);

for (
var i = 0;
i < systems.length;
i += 1
) {
var system =
systems[i];

var offset =
i * 6;

var isSol =
system.id ===
"system-sol";

var brightness =
isSol
? 1.0
: system.discovered
? 0.82
: 0.52;

data[offset] =
system.position.x;

data[offset + 1] =
system.position.y;

data[offset + 2] =
system.position.z;

data[offset + 3] =
isSol
? SOL_POINT_SIZE
: SYSTEM_POINT_SIZE;

data[offset + 4] =
brightness;

data[offset + 5] =
isSol
? 1
: 0;
}

renderer.systemCount =
systems.length;

renderer.systemBuffer =
gl.createBuffer();

gl.bindBuffer(
gl.ARRAY_BUFFER,
renderer.systemBuffer
);

gl.bufferData(
gl.ARRAY_BUFFER,
data,
gl.STATIC_DRAW
);

gl.bindBuffer(
gl.ARRAY_BUFFER,
null
);
}

function getPlanetColour(type) {
if (
type === "rocky"
) {
return [
0.72,
0.74,
0.78
];
}

if (
type === "desert"
) {
return [
0.86,
0.62,
0.34
];
}

if (
type === "ocean"
) {
return [
0.28,
0.62,
1.0
];
}

if (
type === "ice"
) {
return [
0.72,
0.88,
1.0
];
}

if (
type === "gas_giant"
) {
return [
0.76,
0.58,
0.38
];
}

return [
0.8,
0.8,
0.8
];
}

function createPlanetLayer() {
if (
!renderer.galaxy ||
!renderer.galaxy.systems
) {
return;
}

var records = [];

for (
var systemIndex = 0;
systemIndex <
renderer.galaxy.systems.length;
systemIndex += 1
) {
var system =
renderer.galaxy.systems[
systemIndex
];

if (
!system.planets ||
system.planets.length === 0
) {
continue;
}

for (
var planetIndex = 0;
planetIndex <
system.planets.length;
planetIndex += 1
) {
var planet =
system.planets[
planetIndex
];

var orbit =
Number(
planet.orbit
);

if (
!Number.isFinite(
orbit
) ||
orbit <= 0
) {
orbit =
planetIndex + 1;
}

var orbitDistance =
orbit * 1.8;

var angle =
planetIndex *
1.37;

if (
system.id === "system-sol" &&
planet.id === "planet-earth"
) {
angle = 0;
}

if (
system.id === "system-sol" &&
planet.id === "planet-mars"
) {
angle =
Math.PI / 2;
}

var x =
system.position.x +
Math.cos(
angle
) *
orbitDistance;

var z =
system.position.z +
Math.sin(
angle
) *
orbitDistance;

var y =
system.position.y +
Math.sin(
angle * 0.5
) *
orbitDistance *
0.08;

var colour =
getPlanetColour(
planet.type
);

var isStartingPlanet =
system.id ===
"system-sol" &&
(
planet.id ===
"planet-earth" ||
planet.id ===
"planet-mars"
);

var size =
isStartingPlanet
? IMPORTANT_PLANET_POINT_SIZE
: PLANET_POINT_SIZE;

var brightness =
planet.discovered ||
isStartingPlanet
? 1.0
: 0.42;

records.push(
x,
y,
z,
size,
colour[0],
colour[1],
colour[2],
brightness
);
}
}

if (
records.length === 0
) {
return;
}

var data =
new Float32Array(
records
);

renderer.planetCount =
data.length / 8;

renderer.planetBuffer =
gl.createBuffer();

gl.bindBuffer(
gl.ARRAY_BUFFER,
renderer.planetBuffer
);

gl.bufferData(
gl.ARRAY_BUFFER,
data,
gl.STATIC_DRAW
);

gl.bindBuffer(
gl.ARRAY_BUFFER,
null
);
}

function createCannonLayer() {
var vertexSource = [
"#version 300 es",
"precision highp float;",
"",
"layout(location = 0) in vec3 a_position;",
"layout(location = 1) in vec3 a_colour;",
"",
"uniform mat4 u_projection;",
"uniform mat4 u_view;",
"uniform float u_size;",
"",
"out vec3 v_colour;",
"",
"void main() {",
"  gl_Position = u_projection * u_view * vec4(a_position, 1.0);",
"  gl_PointSize = u_size;",
"  v_colour = a_colour;",
"}"
].join("\n");

var fragmentSource = [
"#version 300 es",
"precision highp float;",
"",
"in vec3 v_colour;",
"out vec4 out_colour;",
"",
"void main() {",
"  vec2 point = gl_PointCoord - vec2(0.5);",
"  float distanceFromCentre = length(point);",
"",
"  float glow =",
"    1.0 - smoothstep(0.5, 0.0, distanceFromCentre);",
"",
"  if (glow <= 0.0) {",
"    discard;",
"  }",
"",
"  float flame =",
"    1.0 - smoothstep(0.46, 0.06, distanceFromCentre);",
"",
"  float core =",
"    1.0 - smoothstep(0.18, 0.0, distanceFromCentre);",
"",
"  vec3 flameColour =",
"    mix(",
"      vec3(1.0, 0.02, 0.0),",
"      vec3(1.0, 0.18, 0.0),",
"      flame * 0.35",
"    );",
"",
"  vec3 colour =",
"    mix(",
"      v_colour,",
"      flameColour,",
"      flame",
"    );",
"",
"  colour =",
"    mix(",
"      colour,",
"      vec3(1.0, 0.72, 0.18),",
"      core",
"    );",
"",
"  out_colour = vec4(",
"    colour,",
"    glow",
"  );",
"}"
].join("\n");

renderer.cannonProgram =
createProgram(
vertexSource,
fragmentSource
);

renderer.cannonBuffer =
gl.createBuffer();
}

function initialise() {
var vertexSource = [
"#version 300 es",
"precision highp float;",
"",
"layout(location = 0) in vec3 a_position;",
"layout(location = 1) in float a_brightness;",
"",
"uniform mat4 u_projection;",
"uniform mat4 u_view;",
"",
"out float v_brightness;",
"",
"void main() {",
"  gl_Position = u_projection * u_view * vec4(a_position, 1.0);",
"  gl_PointSize = 1.5 + a_brightness * 2.0;",
"  v_brightness = a_brightness;",
"}"
].join("\n");

var fragmentSource = [
"#version 300 es",
"precision highp float;",
"",
"in float v_brightness;",
"out vec4 out_colour;",
"",
"void main() {",
"  vec2 point = gl_PointCoord - vec2(0.5);",
"  float distanceFromCentre = length(point);",
"  float glow = 1.0 - smoothstep(0.0, 0.5, distanceFromCentre);",
"",
"  if (glow <= 0.0) {",
"    discard;",
"  }",
"",
"  float brightness =",
"    v_brightness * glow;",
"",
"  out_colour = vec4(",
"    brightness,",
"    brightness * 0.92,",
"    brightness * 0.82,",
"    brightness",
"  );",
"}"
].join("\n");

renderer.program =
createProgram(
vertexSource,
fragmentSource
);

var systemVertexSource = [
"#version 300 es",
"precision highp float;",
"",
"layout(location = 0) in vec3 a_position;",
"layout(location = 1) in float a_size;",
"layout(location = 2) in float a_brightness;",
"layout(location = 3) in float a_type;",
"",
"uniform mat4 u_projection;",
"uniform mat4 u_view;",
"",
"out float v_brightness;",
"out float v_type;",
"",
"void main() {",
"  gl_Position = u_projection * u_view * vec4(a_position, 1.0);",
"  gl_PointSize = a_size;",
"  v_brightness = a_brightness;",
"  v_type = a_type;",
"}"
].join("\n");

var systemFragmentSource = [
"#version 300 es",
"precision highp float;",
"",
"in float v_brightness;",
"in float v_type;",
"out vec4 out_colour;",
"",
"void main() {",
"  vec2 point = gl_PointCoord - vec2(0.5);",
"  float distanceFromCentre = length(point);",
"  float glow = 1.0 - smoothstep(0.0, 0.5, distanceFromCentre);",
"",
"  if (glow <= 0.0) {",
"    discard;",
"  }",
"",
"  float brightness =",
"    v_brightness * glow;",
"",
"  if (v_type > 0.5) {",
"    out_colour = vec4(",
"      brightness,",
"      brightness * 0.68,",
"      brightness * 0.24,",
"      brightness",
"    );",
"  } else {",
"    out_colour = vec4(",
"      brightness * 0.78,",
"      brightness * 0.86,",
"      brightness,",
"      brightness",
"    );",
"  }",
"}"
].join("\n");

renderer.systemProgram =
createProgram(
systemVertexSource,
systemFragmentSource
);

var planetVertexSource = [
"#version 300 es",
"precision highp float;",
"",
"layout(location = 0) in vec3 a_position;",
"layout(location = 1) in float a_size;",
"layout(location = 2) in vec3 a_colour;",
"layout(location = 3) in float a_brightness;",
"",
"uniform mat4 u_projection;",
"uniform mat4 u_view;",
"",
"out vec3 v_colour;",
"out float v_brightness;",
"",
"void main() {",
"  gl_Position = u_projection * u_view * vec4(a_position, 1.0);",
"  gl_PointSize = a_size;",
"  v_colour = a_colour;",
"  v_brightness = a_brightness;",
"}"
].join("\n");

var planetFragmentSource = [
"#version 300 es",
"precision highp float;",
"",
"in vec3 v_colour;",
"in float v_brightness;",
"out vec4 out_colour;",
"",
"void main() {",
"  vec2 point = gl_PointCoord - vec2(0.5);",
"  float distanceFromCentre = length(point);",
"  float edge = smoothstep(0.5, 0.38, distanceFromCentre);",
"",
"  if (edge <= 0.0) {",
"    discard;",
"  }",
"",
"  float centre =",
"    1.0 - distanceFromCentre * 1.35;",
"  centre =",
"    clamp(centre, 0.0, 1.0);",
"",
"  vec3 colour =",
"    v_colour *",
"    (0.65 + centre * 0.35) *",
"    v_brightness;",
"",
"  out_colour = vec4(",
"    colour,",
"    edge * v_brightness",
"  );",
"}"
].join("\n");

renderer.planetProgram =
createProgram(
planetVertexSource,
planetFragmentSource
);

createGalaxyStars();
createSystemLayer();
createPlanetLayer();
createCannonLayer();

gl.useProgram(
renderer.program
);

gl.enable(
gl.BLEND
);

gl.blendFunc(
gl.SRC_ALPHA,
gl.ONE
);

gl.disable(
gl.DEPTH_TEST
);

gl.depthMask(false);

gl.enable(
gl.PROGRAM_POINT_SIZE
);

renderer.resize();
}

renderer.resize =
function () {
var width =
Math.max(
1,
renderer.canvas.width
);

var height =
Math.max(
1,
renderer.canvas.height
);

var aspect =
width / height;

createProjection(
Math.PI / 3,
aspect,
0.1,
500
);

gl.viewport(
0,
0,
width,
height
);
};

renderer.render =
function (deltaTime) {
if (
!renderer.program ||
!renderer.vertexBuffer
) {
return;
}

var controls = null;

if (
window.KlaskerFrontier &&
window.KlaskerFrontier.state
) {
controls =
window.KlaskerFrontier.state.controls;
}

if (controls) {
if (controls.left) {
renderer.rotation +=
ROTATION_SPEED *
deltaTime;
}

if (controls.right) {
renderer.rotation -=
ROTATION_SPEED *
deltaTime;
}

var forward =
(controls.up ? 1 : 0) -
(controls.down ? 1 : 0);

if (
forward !== 0
) {
renderer.cameraX -=
Math.sin(
renderer.rotation
) *
MOVEMENT_SPEED *
deltaTime *
forward;

renderer.cameraZ +=
Math.cos(
renderer.rotation
) *
MOVEMENT_SPEED *
deltaTime *
forward;
}

if (
controls.fire &&
!renderer.previousFire
) {
var fireCos =
Math.cos(
renderer.rotation
);

var fireSin =
Math.sin(
renderer.rotation
);

var forwardX =
-fireSin;

var forwardZ =
-fireCos;

var rightX =
fireCos;

var rightZ =
-fireSin;

var cannonCentreX =
renderer.cameraX +
forwardX *
CANNON_DISTANCE;

var cannonCentreY =
renderer.cameraY -
0.45;

var cannonCentreZ =
renderer.cameraZ +
forwardZ *
CANNON_DISTANCE;

renderer.cannonBurst = {
x: cannonCentreX,
y: cannonCentreY,
z: cannonCentreZ,
rightX: rightX,
rightZ: rightZ,
timer: CANNON_DURATION
};
}

renderer.previousFire =
controls.fire;
}

if (
renderer.cannonBurst
) {
renderer.cannonBurst.timer =
Math.max(
0,
renderer.cannonBurst.timer -
deltaTime
);

if (
renderer.cannonBurst.timer <= 0
) {
renderer.cannonBurst =
null;
}
}

var cos =
Math.cos(
renderer.rotation
);

var sin =
Math.sin(
renderer.rotation
);

renderer.view[0] =
cos;

renderer.view[1] = 0;

renderer.view[2] =
-sin;

renderer.view[3] = 0;

renderer.view[4] = 0;

renderer.view[5] = 1;

renderer.view[6] = 0;

renderer.view[7] = 0;

renderer.view[8] =
sin;

renderer.view[9] = 0;

renderer.view[10] =
cos;

renderer.view[11] = 0;

renderer.view[12] =
-(
cos *
renderer.cameraX -
sin *
renderer.cameraZ
);

renderer.view[13] =
-renderer.cameraY;

renderer.view[14] =
-(
sin *
renderer.cameraX +
cos *
renderer.cameraZ
);

renderer.view[15] = 1;

gl.clear(
gl.COLOR_BUFFER_BIT
);

/*
*

* Background stars.
  */

gl.useProgram(
renderer.program
);

var projectionLocation =
gl.getUniformLocation(
renderer.program,
"u_projection"
);

var viewLocation =
gl.getUniformLocation(
renderer.program,
"u_view"
);

gl.uniformMatrix4fv(
projectionLocation,
false,
renderer.projection
);

gl.uniformMatrix4fv(
viewLocation,
false,
renderer.view
);

gl.bindBuffer(
gl.ARRAY_BUFFER,
renderer.vertexBuffer
);

gl.enableVertexAttribArray(
0
);

gl.vertexAttribPointer(
0,
3,
gl.FLOAT,
false,
16,
0
);

gl.enableVertexAttribArray(
1
);

gl.vertexAttribPointer(
1,
1,
gl.FLOAT,
false,
16,
12
);

gl.drawArrays(
gl.POINTS,
0,
renderer.starCount
);

/*
*

* Navigable systems.
  */

if (
renderer.systemProgram &&
renderer.systemBuffer &&
renderer.systemCount > 0
) {
gl.useProgram(
renderer.systemProgram
);

var systemProjectionLocation =
gl.getUniformLocation(
renderer.systemProgram,
"u_projection"
);

var systemViewLocation =
gl.getUniformLocation(
renderer.systemProgram,
"u_view"
);

gl.uniformMatrix4fv(
systemProjectionLocation,
false,
renderer.projection
);

gl.uniformMatrix4fv(
systemViewLocation,
false,
renderer.view
);

gl.bindBuffer(
gl.ARRAY_BUFFER,
renderer.systemBuffer
);

gl.enableVertexAttribArray(
0
);

gl.vertexAttribPointer(
0,
3,
gl.FLOAT,
false,
24,
0
);

gl.enableVertexAttribArray(
1
);

gl.vertexAttribPointer(
1,
1,
gl.FLOAT,
false,
24,
12
);

gl.enableVertexAttribArray(
2
);

gl.vertexAttribPointer(
2,
1,
gl.FLOAT,
false,
24,
16
);

gl.enableVertexAttribArray(
3
);

gl.vertexAttribPointer(
3,
1,
gl.FLOAT,
false,
24,
20
);

gl.drawArrays(
gl.POINTS,
0,
renderer.systemCount
);
}

/*
*

* Planets.
  */

if (
renderer.planetProgram &&
renderer.planetBuffer &&
renderer.planetCount > 0
) {
gl.useProgram(
renderer.planetProgram
);

var planetProjectionLocation =
gl.getUniformLocation(
renderer.planetProgram,
"u_projection"
);

var planetViewLocation =
gl.getUniformLocation(
renderer.planetProgram,
"u_view"
);

gl.uniformMatrix4fv(
planetProjectionLocation,
false,
renderer.projection
);

gl.uniformMatrix4fv(
planetViewLocation,
false,
renderer.view
);

gl.bindBuffer(
gl.ARRAY_BUFFER,
renderer.planetBuffer
);

gl.enableVertexAttribArray(
0
);

gl.vertexAttribPointer(
0,
3,
gl.FLOAT,
false,
32,
0
);

gl.enableVertexAttribArray(
1
);

gl.vertexAttribPointer(
1,
1,
gl.FLOAT,
false,
32,
12
);

gl.enableVertexAttribArray(
2
);

gl.vertexAttribPointer(
2,
3,
gl.FLOAT,
false,
32,
16
);

gl.enableVertexAttribArray(
3
);

gl.vertexAttribPointer(
3,
1,
gl.FLOAT,
false,
32,
28
);

gl.drawArrays(
gl.POINTS,
0,
renderer.planetCount
);
}

/*
*

* Cannon bursts.
*
* The burst position and firing direction are captured
* when Space is pressed. Turning afterwards therefore
* does not move or redirect an active cannon burst.
  */

if (
renderer.cannonBurst
) {
var intensity =
renderer.cannonBurst.timer /
CANNON_DURATION;

var cannonCentreX =
renderer.cannonBurst.x;

var cannonCentreY =
renderer.cannonBurst.y;

var cannonCentreZ =
renderer.cannonBurst.z;

var rightX =
renderer.cannonBurst.rightX;

var rightZ =
renderer.cannonBurst.rightZ;

var leftX =
cannonCentreX -
rightX *
CANNON_SPREAD;

var leftZ =
cannonCentreZ -
rightZ *
CANNON_SPREAD;

var rightCannonX =
cannonCentreX +
rightX *
CANNON_SPREAD;

var rightCannonZ =
cannonCentreZ +
rightZ *
CANNON_SPREAD;

var red =
1.0;

var green =
0.015;

var blue =
0.0;

var cannonData =
new Float32Array([
leftX,
cannonCentreY,
leftZ,
red,
green,
blue,

rightCannonX,
cannonCentreY,
rightCannonZ,
red,
green,
blue
]);

gl.useProgram(
renderer.cannonProgram
);

var cannonProjectionLocation =
gl.getUniformLocation(
renderer.cannonProgram,
"u_projection"
);

var cannonViewLocation =
gl.getUniformLocation(
renderer.cannonProgram,
"u_view"
);

var cannonSizeLocation =
gl.getUniformLocation(
renderer.cannonProgram,
"u_size"
);

gl.uniformMatrix4fv(
cannonProjectionLocation,
false,
renderer.projection
);

gl.uniformMatrix4fv(
cannonViewLocation,
false,
renderer.view
);

gl.uniform1f(
cannonSizeLocation,
12 +
intensity *
20
);

gl.bindBuffer(
gl.ARRAY_BUFFER,
renderer.cannonBuffer
);

gl.bufferData(
gl.ARRAY_BUFFER,
cannonData,
gl.DYNAMIC_DRAW
);

gl.enableVertexAttribArray(
0
);

gl.vertexAttribPointer(
0,
3,
gl.FLOAT,
false,
24,
0
);

gl.enableVertexAttribArray(
1
);

gl.vertexAttribPointer(
1,
3,
gl.FLOAT,
false,
24,
12
);

gl.drawArrays(
gl.POINTS,
0,
2
);
}

gl.bindBuffer(
gl.ARRAY_BUFFER,
null
);
};

initialise();

return renderer;
}
