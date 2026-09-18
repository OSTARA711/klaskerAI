// Path: gaming/bkcore/hexgl/HexGL.js

'use strict';
'v1.0.1';

var bkcore = bkcore || {};
bkcore.hexgl = bkcore.hexgl || {};

bkcore.hexgl.HexGL = function(opts)
{
	var self = this;

	this.document = opts.document || document;

	this.a = window.location.href;

	this.active = true;
	this.displayHUD = opts.hud == undefined ? true : opts.hud;

	/*
	 * Always render at the native browser viewport resolution.
	 *
	 * The original LOW quality mode divided both dimensions by two.
	 * That produced a visibly poor image and is no longer used.
	 *
	 * Resolution is therefore independent of the legacy quality setting.
	 */
	this.width = window.innerWidth;
	this.height = window.innerHeight;

	this.difficulty = opts.difficulty == undefined ? 0 : opts.difficulty;
	this.player = opts.player == undefined ? "Anonym" : opts.player;

	this.track = bkcore.hexgl.tracks[
		opts.track == undefined ? 'Cityscape' : opts.track
	];

	this.mode = opts.mode == undefined ? 'timeattack' : opts.mode;

	this.controlType = opts.controlType == undefined ? 1 : opts.controlType;

	/*
	 * Keep the legacy quality value available to the track/material code,
	 * but do not allow it to reduce render resolution or enable the old
	 * expensive VERY HIGH renderer path.
	 *
	 * The game uses the visually useful MID rendering path as its baseline.
	 */
	this.quality = 1;

	this.settings = null;
	this.renderer = null;
	this.manager = null;
	this.lib = null;
	this.materials = {};
	this.components = {};

	this.extras = {
		vignetteColor: new THREE.Color(0x458ab1),
		bloom: null,
		fxaa: null
	};

	this.containers = {};
	this.containers.main =
		opts.container == undefined ? document.body : opts.container;

	this.containers.overlay =
		opts.overlay == undefined ? document.body : opts.overlay;

	this.gameover =
		opts.gameover == undefined ? null : opts.gameover;

	this.godmode =
		opts.godmode == undefined ? false : opts.godmode;

	this.hud = null;
	this.gameplay = null;

	this.composers = {
		game: null
	};

	this.initRenderer();

	function onKeyPress(event)
	{
		if(event.keyCode == 27)
		{
			self.reset();
		}
	}

	this.document.addEventListener('keydown', onKeyPress, false);
}

bkcore.hexgl.HexGL.prototype.start = function()
{
	this.manager.setCurrent("game");

	var self = this;

	function raf()
	{
		if(self.active)
			requestAnimationFrame(raf);

		self.update();
	}

	raf();

	this.initGameplay();
}

bkcore.hexgl.HexGL.prototype.reset = function()
{
	this.manager.get('game').objects.lowFPS = 0;
	this.gameplay.start();

	bkcore.Audio.stop('bg');
	bkcore.Audio.stop('wind');
	bkcore.Audio.volume('wind', 0.35);
	bkcore.Audio.play('bg');
	bkcore.Audio.play('wind');
}

bkcore.hexgl.HexGL.prototype.restart = function()
{
	try
	{
		this.document.getElementById('finish').style.display = 'none';
	}
	catch(e)
	{
	}

	this.reset();
}

bkcore.hexgl.HexGL.prototype.update = function()
{
	if(!this.active)
		return;

	if(this.gameplay != null)
		this.gameplay.update();

	this.manager.renderCurrent();
}

bkcore.hexgl.HexGL.prototype.init = function()
{
	this.initHUD();

	this.track.buildMaterials(this.quality);
	this.track.buildScenes(this, this.quality);

	this.initGameComposer();
}

bkcore.hexgl.HexGL.prototype.load = function(opts)
{
	this.track.load(opts, this.quality);
}

bkcore.hexgl.HexGL.prototype.initGameplay = function()
{
	var self = this;

	this.gameplay = new bkcore.hexgl.Gameplay({
		mode: this.mode,
		hud: this.hud,
		shipControls: this.components.shipControls,
		cameraControls: this.components.cameraChase,
		analyser: this.track.analyser,
		pixelRatio: this.track.pixelRatio,
		track: this.track,

		onFinish: function()
		{
			self.components.shipControls.terminate();
			self.displayScore(this.finishTime, this.lapTimes);
		}
	});

	this.gameplay.start();

	bkcore.Audio.play('bg');
	bkcore.Audio.play('wind');
	bkcore.Audio.volume('wind', 0.35);
}

bkcore.hexgl.HexGL.prototype.displayScore = function(f, l)
{
	this.active = false;

	var tf = bkcore.Timer.msToTimeString(f);
	var tl = [
		bkcore.Timer.msToTimeString(l[0]),
		bkcore.Timer.msToTimeString(l[1]),
		bkcore.Timer.msToTimeString(l[2])
	];

	if(this.gameover !== null)
	{
		this.gameover.style.display = "block";
		this.gameover.children[0].innerHTML =
			tf.m + "'" + tf.s + "''" + tf.ms;

		this.containers.main.parentElement.style.display = "none";
		return;
	}

	var t = this.track;
	var dc = this.document.getElementById("finish");
	var ds = this.document.getElementById("finish-state");
	var dh = this.document.getElementById("finish-hallmsg");
	var dr = this.document.getElementById("finish-msg");
	var dt = this.document.getElementById("finish-result");
	var dl1 = this.document.getElementById("finish-lap1");
	var dl2 = this.document.getElementById("finish-lap2");
	var dl3 = this.document.getElementById("finish-lap3");
	var dd = this.document.getElementById("finish-diff");
	var st = this.document.getElementById("finish-twitter");
	var sf = this.document.getElementById("finish-fb");
	var sl = this.document.getElementById("lowfps-msg");
	var d = this.difficulty == 0 ? 'casual' : 'hard';
	var ts = this.hud.timeSeparators;

	if(this.gameplay.result == this.gameplay.results.FINISH)
	{
		ds != undefined && (ds.innerHTML = "Finished!");

		if(typeof(Storage) !== "undefined")
		{
			if(localStorage['score-' + t + '-' + d] == undefined ||
				localStorage['score-' + t + '-' + d] > f)
			{
				dr != undefined && (dr.innerHTML = "New local record!");
				localStorage['score-' + t + '-' + d] = f;

				localStorage['race-' + t + '-replay'] =
					JSON.Stringify(this.gameplay.raceData.export());
			}
			else
			{
				dr != undefined && (dr.innerHTML = "Well done!");
			}
		}

		var p =
			bkcore.hexgl.Ladder.global[t][d]
			[bkcore.hexgl.Ladder.global[t][d].length - 2];

		if(p != undefined && p['score'] > f)
		{
			dh != undefined &&
				(dh.innerHTML = "You made it to the HOF!");
		}
		else
		{
			dh != undefined &&
				(dh.innerHTML = "Hall Of Fame");
		}

		dt != undefined &&
			(dt.innerHTML = tf.m + ts[1] + tf.s + ts[2] + tf.ms);

		dl1 != undefined &&
			(dl1.innerHTML =
				tl[0]["m"] != undefined
					? tl[0].m + ts[1] + tl[0].s + ts[2] + tl[0].ms
					: "-");

		dl2 != undefined &&
			(dl2.innerHTML =
				tl[1]["m"] != undefined
					? tl[1].m + ts[1] + tl[1].s + ts[2] + tl[1].ms
					: "-");

		dl3 != undefined &&
			(dl3.innerHTML =
				tl[2]["m"] != undefined
					? tl[2].m + ts[1] + tl[2].s + ts[2] + tl[2].ms
					: "-");
	}
	else
	{
		ds != undefined && (ds.innerHTML = "Destroyed!");
		dr != undefined && (dr.innerHTML = "Maybe next time!");
		dh != undefined && (dh.innerHTML = "Hall Of Fame");
		dt != undefined && (dt.innerHTML = "None");
		dl1 != undefined && (dl1.innerHTML = "None");
		dl2 != undefined && (dl2.innerHTML = "None");
		dl3 != undefined && (dl3.innerHTML = "None");
	}

	dd != undefined && (dd.innerHTML = d);

	st != undefined &&
		(st.href =
			'http://twitter.com/share?text=' +
			encodeURIComponent(
				'I just scored ' +
				dt.innerHTML +
				' in Cityscape (' +
				d +
				') on #HexGL! Come try it and beat my record on '
			));

	sf != undefined &&
		(sf.href =
			'http://www.facebook.com/sharer.php?s=100' +
			'&p[title]=' +
			encodeURIComponent(
				'I just scored ' +
				dt.innerHTML +
				' in Cityscape (' +
				d +
				') on HexGL!'
			) +
			'&p[summary]=' +
			encodeURIComponent(
				'HexGL is a futuristic racing game built by Thibaut Despoulain (BKcore) using HTML5, Javascript and WebGL. Come challenge your friends on this fast-paced 3D game!'
			) +
			'&p[url]=' +
			encodeURIComponent('http://hexgl.bkcore.com') +
			'&p[images][0]=' +
			encodeURIComponent('http://hexgl.bkcore.com/image.png'));

	bkcore.hexgl.Ladder.displayLadder(
		'finish-ladder',
		t,
		d,
		8
	);

	if(this.manager.get('game').objects.lowFPS >= 999)
	{
		sl != undefined &&
			(sl.innerHTML =
				'Note: Your framerate was pretty low, you should try a lesser graphic setting!');
	}
	else
	{
		sl != undefined && (sl.innerHTML = '');
	}

	dc.style.display = 'block';
}

bkcore.hexgl.HexGL.prototype.initRenderer = function()
{
	var renderer = new THREE.WebGLRenderer({
		antialias: false,
		clearColor: 0x000000
	});

	/*
	 * Deliberately avoid the original VERY HIGH renderer features:
	 *
	 * - physically based shading
	 * - gamma processing
	 * - shadow maps
	 * - soft shadows
	 *
	 * They increase GPU work without increasing render resolution.
	 * Native viewport resolution is the visual priority.
	 */

	renderer.autoClear = false;
	renderer.sortObjects = false;

	renderer.setSize(
		this.width,
		this.height
	);

	renderer.domElement.style.position = "relative";

	this.containers.main.appendChild(renderer.domElement);

	this.canvas = renderer.domElement;
	this.renderer = renderer;
	this.manager = new bkcore.threejs.RenderManager(renderer);
}

bkcore.hexgl.HexGL.prototype.initHUD = function()
{
	if(!this.displayHUD)
		return;

	this.hud = new bkcore.hexgl.HUD({
		width: this.width,
		height: this.height,
		font: "BebasNeueRegular",
		bg: this.track.lib.get("images", "hud.bg"),
		speed: this.track.lib.get("images", "hud.speed"),
		shield: this.track.lib.get("images", "hud.shield")
	});

	this.containers.overlay.appendChild(this.hud.canvas);
}

bkcore.hexgl.HexGL.prototype.initGameComposer = function()
{
	var renderTargetParameters = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBFormat,
		stencilBuffer: false
	};

	var renderTarget = new THREE.WebGLRenderTarget(
		this.width,
		this.height,
		renderTargetParameters
	);

	var renderSky = new THREE.RenderPass(
		this.manager.get("sky").scene,
		this.manager.get("sky").camera
	);

	var renderModel = new THREE.RenderPass(
		this.manager.get("game").scene,
		this.manager.get("game").camera
	);

	renderModel.clear = false;

	this.composers.game = new THREE.EffectComposer(
		this.renderer,
		renderTarget
	);

	this.composers.game.addPass(renderSky);
	this.composers.game.addPass(renderModel);

	/*
	 * FXAA is intentionally disabled.
	 *
	 * The game already renders at native viewport resolution, so an
	 * additional anti-aliasing shader would add another full-screen pass.
	 */

	/*
	 * Bloom is intentionally disabled.
	 *
	 * It requires additional render work and does not increase spatial
	 * resolution.
	 */

	/*
	 * Retain the Hex vignette because it is part of the game's visual
	 * presentation and costs only one final shader pass.
	 */
	var effectHex = new THREE.ShaderPass(
		bkcore.threejs.Shaders["hexvignette"]
	);

	effectHex.uniforms['size'].value =
		512.0 * (this.width / 1633);

	effectHex.uniforms['rx'].value = this.width;
	effectHex.uniforms['ry'].value = this.height;

	effectHex.uniforms['tHex'].texture =
		this.track.lib.get("textures", "hex");

	effectHex.uniforms['color'].value =
		this.extras.vignetteColor;

	effectHex.renderToScreen = true;

	this.composers.game.addPass(effectHex);
}

bkcore.hexgl.HexGL.prototype.createMesh = function(
	parent,
	geometry,
	x,
	y,
	z,
	mat
)
{
	/*
	 * Tangent generation is disabled.
	 *
	 * The hardwired renderer no longer uses the tangent-dependent
	 * rendering path, so there is no reason to pay the CPU-side
	 * geometry processing cost during scene construction.
	 */

	var mesh = new THREE.Mesh(
		geometry,
		mat
	);

	mesh.position.set(
		x,
		y,
		z
	);

	parent.add(mesh);

	/*
	 * Shadow rendering is deliberately disabled globally, so meshes do
	 * not need shadow-map flags.
	 */

	return mesh;
}

bkcore.hexgl.HexGL.prototype.tweakShipControls = function()
{
	var c = this.components.shipControls;

	if(this.difficulty == 1)
	{
		c.airResist = 0.035;
		c.airDrift = 0.07;
		c.thrust = 0.035;
		c.airBrake = 0.04;
		c.maxSpeed = 9.6;
		c.boosterSpeed = c.maxSpeed * 0.35;
		c.boosterDecay = 0.007;
		c.angularSpeed = 0.0140;
		c.airAngularSpeed = 0.0165;
		c.rollAngle = 0.6;
		c.shieldDamage = 0.03;
		c.collisionSpeedDecrease = 0.8;
		c.collisionSpeedDecreaseCoef = 0.5;
		c.rollLerp = 0.1;
		c.driftLerp = 0.4;
		c.angularLerp = 0.4;
	}
	else if(this.difficulty == 0)
	{
		c.airResist = 0.02;
		c.airDrift = 0.06;
		c.thrust = 0.02;
		c.airBrake = 0.025;
		c.maxSpeed = 7.0;
		c.boosterSpeed = c.maxSpeed * 0.5;
		c.boosterDecay = 0.007;
		c.angularSpeed = 0.0125;
		c.airAngularSpeed = 0.0135;
		c.rollAngle = 0.6;
		c.shieldDamage = 0.06;
		c.collisionSpeedDecrease = 0.8;
		c.collisionSpeedDecreaseCoef = 0.5;
		c.rollLerp = 0.07;
		c.driftLerp = 0.3;
		c.angularLerp = 0.4;
	}

	if(this.godmode)
		c.shieldDamage = 0.0;
}
