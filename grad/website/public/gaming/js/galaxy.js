/*
 *
 * Agentic AI Klasker Frontier
 * Path: grad/website/static/gaming/js/galaxy.js
 *
 * Deterministic galaxy data and star-system generation.
 *
 */

"use strict";

var GALAXY_RADIUS = 180;
var SYSTEM_COUNT = 240;

var STAR_TYPES = [
  "red_dwarf",
  "orange_dwarf",
  "yellow_dwarf",
  "white_dwarf",
  "blue_star",
  "giant"
];

var PLANET_TYPES = [
  "rocky",
  "desert",
  "ocean",
  "ice",
  "gas_giant"
];

var SYSTEM_PREFIXES = [
  "Astra",
  "Vega",
  "Nova",
  "Orion",
  "Cygnus",
  "Lyra",
  "Draco",
  "Helios",
  "Altair",
  "Sirius",
  "Arcturus",
  "Deneb"
];

var SYSTEM_SUFFIXES = [
  "Prime",
  "Reach",
  "Haven",
  "Station",
  "Point",
  "Gate",
  "Rise",
  "Fall",
  "Frontier",
  "Crossing",
  "Delta",
  "Outpost"
];

/*
 * Small deterministic pseudo-random generator.
 *
 * The galaxy must be reproducible. The same seed therefore
 * produces the same systems and positions on every load.
 */

function createRandom(seed) {
  var value = seed >>> 0;

  return function () {
    value += 0x6D2B79F5;

    var result = value;

    result = Math.imul(
      result ^ (result >>> 15),
      result | 1
    );

    result ^= result + Math.imul(
      result ^ (result >>> 7),
      result | 61
    );

    return (
      (result ^ (result >>> 14)) >>> 0
    ) / 4294967296;
  };
}

function choose(random, values) {
  return values[
    Math.floor(random() * values.length)
  ];
}

function createSystemName(random, index) {
  var prefix = choose(random, SYSTEM_PREFIXES);
  var suffix = choose(random, SYSTEM_SUFFIXES);

  return (
    prefix +
    " " +
    suffix +
    " " +
    String(index).padStart(3, "0")
  );
}

function createPlanets(random) {
  var planets = [];
  var count = 1 + Math.floor(random() * 7);

  for (var i = 0; i < count; i += 1) {
    var type = choose(random, PLANET_TYPES);

    planets.push({
      id: "planet-" + i,
      name: "Planet " + String.fromCharCode(98 + i),
      type: type,
      orbit: i + 1,
      habitable: (
        type === "rocky" ||
        type === "ocean"
      ) && random() > 0.55,
      discovered: false
    });
  }

  return planets;
}

function createPosition(random) {
  var angle = random() * Math.PI * 2;

  /*
   * sqrt() gives a more natural distribution across
   * the galactic disc than a linear radius.
   */

  var radius =
    Math.sqrt(random()) *
    GALAXY_RADIUS;

  /*
   * Add spiral structure to the system distribution.
   */

  var spiral =
    angle +
    radius * 0.035 +
    (random() - 0.5) * 0.35;

  var thickness =
    (random() - 0.5) *
    (4 + radius * 0.045);

  return {
    x: Math.cos(spiral) * radius,
    y: thickness,
    z: Math.sin(spiral) * radius
  };
}

function createSystem(random, index) {
  var position = createPosition(random);

  return {
    id: "system-" + String(index).padStart(3, "0"),

    name: createSystemName(
      random,
      index
    ),

    starType: choose(
      random,
      STAR_TYPES
    ),

    position: position,

    planets: createPlanets(random),

    discovered: false,

    visited: false,

    colony: false,

    resources: {
      minerals: Math.floor(
        random() * 100
      ),

      energy: Math.floor(
        random() * 100
      ),

      food: Math.floor(
        random() * 100
      ),

      water: Math.floor(
        random() * 100
      )
    }
  };
}

function createSolSystem() {
  return {
    id: "system-sol",

    name: "Sol",

    starType: "yellow_dwarf",

    position: {
      x: 0,
      y: 0,
      z: 0
    },

    planets: [
      {
        id: "earth",
        name: "Earth",
        type: "rocky",
        orbit: 3,
        habitable: true,
        discovered: true
      },

      {
        id: "mars",
        name: "Mars",
        type: "rocky",
        orbit: 4,
        habitable: false,
        discovered: true
      },

      {
        id: "jupiter",
        name: "Jupiter",
        type: "gas_giant",
        orbit: 5,
        habitable: false,
        discovered: true
      },

      {
        id: "saturn",
        name: "Saturn",
        type: "gas_giant",
        orbit: 6,
        habitable: false,
        discovered: true
      }
    ],

    discovered: true,

    visited: true,

    colony: true,

    resources: {
      minerals: 100,
      energy: 100,
      food: 100,
      water: 100
    }
  };
}

export function createGalaxy(seed) {
  var random = createRandom(
    seed === undefined ? 19730418 : seed
  );

  var systems = [];

  /*
   * Sol is always the origin of the galaxy.
   * This gives the player a stable starting point.
   */

  systems.push(
    createSolSystem()
  );

  for (
    var i = 1;
    i < SYSTEM_COUNT;
    i += 1
  ) {
    systems.push(
      createSystem(
        random,
        i
      )
    );
  }

  return {
    seed: seed === undefined
      ? 19730418
      : seed,

    radius: GALAXY_RADIUS,

    systems: systems,

    playerSystemId: "system-sol",

    discoveredSystems: [
      "system-sol"
    ]
  };
}

export function getSystemById(
  galaxy,
  systemId
) {
  if (!galaxy || !galaxy.systems) {
    return null;
  }

  for (
    var i = 0;
    i < galaxy.systems.length;
    i += 1
  ) {
    if (
      galaxy.systems[i].id === systemId
    ) {
      return galaxy.systems[i];
    }
  }

  return null;
}

export function findNearestSystem(
  galaxy,
  position,
  maximumDistance
) {
  if (
    !galaxy ||
    !galaxy.systems ||
    !position
  ) {
    return null;
  }

  var nearest = null;
  var nearestDistanceSquared =
    maximumDistance === undefined
      ? Infinity
      : maximumDistance * maximumDistance;

  for (
    var i = 0;
    i < galaxy.systems.length;
    i += 1
  ) {
    var system = galaxy.systems[i];

    var dx =
      system.position.x -
      position.x;

    var dy =
      system.position.y -
      position.y;

    var dz =
      system.position.z -
      position.z;

    var distanceSquared =
      dx * dx +
      dy * dy +
      dz * dz;

    if (
      distanceSquared <
      nearestDistanceSquared
    ) {
      nearest = system;
      nearestDistanceSquared =
        distanceSquared;
    }
  }

  return nearest;
}

export function discoverSystem(
  galaxy,
  systemId
) {
  var system = getSystemById(
    galaxy,
    systemId
  );

  if (!system) {
    return false;
  }

  system.discovered = true;

  if (
    galaxy.discoveredSystems.indexOf(
      systemId
    ) === -1
  ) {
    galaxy.discoveredSystems.push(
      systemId
    );
  }

  return true;
}
