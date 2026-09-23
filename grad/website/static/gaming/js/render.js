/*
*

* Agentic AI Klasker Frontier
* Path: grad/website/static/gaming/js/render.js
*
* Lightweight WebGL2 galaxy renderer.
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
projection: new Float32Array(16),
view: new Float32Array(16),
rotation: 0
};

var STAR_COUNT = 6000;
var GALAXY_RADIUS = 180;

var SYSTEM_POINT_SIZE = 5.0;
var SOL_POINT_SIZE = 9.0;

function createShader(type, source) {
var shader = gl.createShader(type);


gl.shaderSource(shader, source);
gl.compileShader(shader);

if (
  !gl.getShaderParameter(
    shader,
    gl.COMPILE_STATUS
  )
) {
  var message =
    gl.getShaderInfoLog(shader);

  gl.deleteShader(shader);

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

gl.linkProgram(program);

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

  gl.deleteProgram(program);

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
  (far + near) * range;

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
/*
* Each background star contains:
*
* x, y, z, brightness
*/


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
    Math.cos(spiral) *
    radius;

  var z =
    Math.sin(spiral) *
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

  data[offset] = x;
  data[offset + 1] = y;
  data[offset + 2] = z;

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
    isSol ? 1 : 0;
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
  "  float brightness = v_brightness * glow;",
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
  "  float brightness = v_brightness * glow;",
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

createGalaxyStars();
createSystemLayer();

gl.useProgram(
  renderer.program
);

gl.enable(
  gl.DEPTH_TEST
);

gl.depthFunc(
  gl.LEQUAL
);

gl.enable(
  gl.BLEND
);

gl.blendFunc(
  gl.SRC_ALPHA,
  gl.ONE
);

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

  renderer.view[0] = 1;
  renderer.view[1] = 0;
  renderer.view[2] = 0;
  renderer.view[3] = 0;

  renderer.view[4] = 0;
  renderer.view[5] = 1;
  renderer.view[6] = 0;
  renderer.view[7] = 0;

  renderer.view[8] = 0;
  renderer.view[9] = 0;
  renderer.view[10] = 1;
  renderer.view[11] = 0;

  renderer.view[12] = 0;
  renderer.view[13] = 0;
  renderer.view[14] = -75;
  renderer.view[15] = 1;

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


  renderer.rotation +=
    deltaTime * 0.025;

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

  renderer.view[2] =
    -sin;

  renderer.view[8] =
    sin;

  renderer.view[10] =
    cos;

  gl.clear(
    gl.COLOR_BUFFER_BIT |
    gl.DEPTH_BUFFER_BIT
  );

  /*
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

  gl.bindBuffer(
    gl.ARRAY_BUFFER,
    null
  );
};


/*

* Renderer initialisation must remain inside
* createRenderer(), where all helper functions exist.
  */

initialise();

return renderer;
}
