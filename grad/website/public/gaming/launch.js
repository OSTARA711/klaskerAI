// Path: ~/klaskerAI/grad/website/static/gaming/launch.js

(function () {
  'use strict';

  /**
   * HexGL launcher
   *
   * Modernised from the original CoffeeScript-generated launcher.
   * The original HexGL DOM IDs, startup sequence, configuration options,
   * asset paths and bkcore interfaces are deliberately preserved.
   */

  function getElement(id) {
    return document.getElementById(id);
  }

  function init(controlType, quality, hud, godmode) {
    var hexGL = new bkcore.hexgl.HexGL({
      document: document,
      width: window.innerWidth,
      height: window.innerHeight,
      container: getElement('main'),
      overlay: getElement('overlay'),
      gameover: getElement('step-5'),
      quality: quality,
      difficulty: 0,
      hud: hud === 1,
      controlType: controlType,
      godmode: godmode,
      track: 'Cityscape'
    });

    window.hexGL = hexGL;

    var progressbar = getElement('progressbar');

    hexGL.load({
      onLoad: function () {
        console.log('LOADED.');

        hexGL.init();

        getElement('step-3').style.display = 'none';
        getElement('step-4').style.display = 'block';

        hexGL.start();
      },

      onError: function (resource) {
        console.error('Error loading ' + resource + '.');
      },

      onProgress: function (progress, type, name) {
        console.log(
          'LOADED ' +
          type +
          ' : ' +
          name +
          ' ( ' +
          progress.loaded +
          ' / ' +
          progress.total +
          ' ).'
        );

        if (progressbar && progress.total > 0) {
          progressbar.style.width =
            (progress.loaded / progress.total * 100) + '%';
        }
      }
    });
  }

  var getURLParameter = bkcore.Utils.getURLParameter;

  var defaultControls = bkcore.Utils.isTouchDevice() ? 1 : 0;

  /*
   * Launcher settings:
   *
   * controlType:
   *   0 = keyboard
   *   1 = touch
   *   2 = Leap Motion Controller
   *   3 = gamepad
   *
   * quality:
   *   0 = low
   *   1 = mid
   *   2 = high
   *   3 = very high
   *
   * hud:
   *   0 = off
   *   1 = on
   *
   * godmode:
   *   0 = off
   *   1 = on
   */

  var settings = [
    {
      name: 'controlType',
      labels: [
        'KEYBOARD',
        'TOUCH',
        'LEAP MOTION CONTROLLER',
        'GAMEPAD'
      ],
      defaultValue: defaultControls,
      value: defaultControls,
      label: 'Controls: '
    },
    {
      name: 'quality',
      labels: [
        'LOW',
        'MID',
        'HIGH',
        'VERY HIGH'
      ],
      defaultValue: 3,
      value: 3,
      label: 'Quality: '
    },
    {
      name: 'hud',
      labels: [
        'OFF',
        'ON'
      ],
      defaultValue: 1,
      value: 1,
      label: 'HUD: '
    },
    {
      name: 'godmode',
      labels: [
        'OFF',
        'ON'
      ],
      defaultValue: 0,
      value: 0,
      label: 'Godmode: '
    }
  ];

  function initialiseSetting(setting) {
    var parameter = getURLParameter(setting.name);

    if (parameter !== null && parameter !== undefined) {
      var numericParameter = Number(parameter);

      if (
        Number.isInteger(numericParameter) &&
        numericParameter >= 0 &&
        numericParameter < setting.labels.length
      ) {
        setting.value = numericParameter;
      }
    }

    var element = getElement('s-' + setting.name);

    if (!element) {
      return;
    }

    function updateLabel() {
      element.innerHTML =
        setting.label + setting.labels[setting.value];
    }

    updateLabel();

    element.onclick = function () {
      setting.value =
        (setting.value + 1) % setting.labels.length;

      updateLabel();
    };
  }

  settings.forEach(initialiseSetting);

  var startButton = getElement('start');
  var settingsButton = getElement('step-2');
  var gameOverButton = getElement('step-5');
  var creditsButton = getElement('s-credits');
  var creditsPanel = getElement('credits');

  if (settingsButton) {
    settingsButton.onclick = function () {
      settingsButton.style.display = 'none';
      getElement('step-3').style.display = 'block';

      init(
        settings[0].value,
        settings[1].value,
        settings[2].value,
        settings[3].value
      );
    };
  }

  if (gameOverButton) {
    gameOverButton.onclick = function () {
      window.location.reload();
    };
  }

  if (creditsButton && creditsPanel) {
    creditsButton.onclick = function () {
      getElement('step-1').style.display = 'none';
      creditsPanel.style.display = 'block';
    };

    creditsPanel.onclick = function () {
      getElement('step-1').style.display = 'block';
      creditsPanel.style.display = 'none';
    };
  }

  function hasWebGL() {
    var canvas = document.createElement('canvas');

    try {
      return Boolean(
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      );
    } catch (error) {
      return false;
    }
  }

  if (!hasWebGL()) {
    if (startButton) {
      startButton.innerHTML = 'WebGL is not supported!';

      startButton.onclick = function () {
        window.location.href = 'http://get.webgl.org/';
      };
    }
  } else if (startButton) {
    startButton.onclick = function () {
      getElement('step-1').style.display = 'none';
      settingsButton.style.display = 'block';

      settingsButton.style.backgroundImage =
        'url(css/help-' + settings[0].value + '.png)';
    };
  }

})();
