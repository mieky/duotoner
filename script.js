(function() {
  var throttle = function(type, name, obj) {
    obj = obj || window;
    var running = false;
    var func = function() {
      if (running) {
        return;
      }
      running = true;
      requestAnimationFrame(function() {
        obj.dispatchEvent(new CustomEvent(name));
        running = false;
      });
    };
    obj.addEventListener(type, func);
  };
  throttle('resize', 'optimizedResize');
})();

document.addEventListener('DOMContentLoaded', function() {
  const rgbToHsl = (r, g, b) => {
    (r /= 255), (g /= 255), (b /= 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h;
    let s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [h, s, l];
  };

  /**
     * Expects the image data, the number of pixels (width * height) and
     * the two colors. The first is for the highlights and the second for
     * the shadows.
     *
     * @param {ImageData} imageData The image data that came out of
     * the context of the canvas
     * @param {Number} pixelCount The number of pixels (width * height)
     * @param {Array} color1 The highlights color in rgb [0, 100, 244]
     * @param {Array} color2 The shadows color in rgb [0, 100, 244] 
     * @return {Array} The array containing all the new pixel data
     */
  function convertToDueTone(imageData, pixelCount, color1, color2) {
    var pixels = imageData.data;
    var pixelArray = [];
    var gradientArray = [];

    // Creates a gradient of 255 colors between color1 and color2
    for (var d = 0; d < 255; d += 1) {
      var ratio = d / 255;
      var l = ratio;
      var rA = Math.floor(color1[0] * l + color2[0] * (1 - l));
      var gA = Math.floor(color1[1] * l + color2[1] * (1 - l));
      var bA = Math.floor(color1[2] * l + color2[2] * (1 - l));
      gradientArray.push([rA, gA, bA]);
    }

    for (
      var i = 0, offset, r, g, b, a, srcHSL, convertedHSL;
      i < pixelCount;
      i++
    ) {
      offset = i * 4;
      // Gets every color and the alpha channel (r, g, b, a)
      r = pixels[offset + 0];
      g = pixels[offset + 1];
      b = pixels[offset + 2];
      a = pixels[offset + 3];

      // Gets the avg
      var avg = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      // Gets the hue, saturation and luminosity
      var hsl = rgbToHsl(avg, avg, avg);
      // The luminosity from 0 to 255
      var luminosity = Math.max(0, Math.min(254, Math.floor(hsl[2] * 254)));

      // Swap every color with the equivalent from the gradient array
      r = gradientArray[luminosity][0];
      g = gradientArray[luminosity][1];
      b = gradientArray[luminosity][2];

      pixelArray.push(r);
      pixelArray.push(g);
      pixelArray.push(b);
      pixelArray.push(a);
    }

    return pixelArray;
  }

  const image = document.getElementById('source');
  const input = document.querySelector('#file');
  input.addEventListener('change', function(e) {
    var reader = new FileReader();
    reader.onload = e => {
      image.src = e.target.result;
    };
    reader.readAsDataURL(this.files[0]);
  });

  const colors = {
    pink: {
      light: [225, 219, 218],
      dark: [253, 87, 73]
    },
    purple: {
      light: [255, 239, 211],
      dark: [70, 45, 152]
    }
  };

  const hexToRgb = hex => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ]
      : null;
  };

  const getColors = () => {
    const checkedColor = document.querySelector('input:checked');
    const color = checkedColor ? checkedColor.getAttribute('value') : 'purple';
    if (color === 'custom') {
      const dark = hexToRgb(document.querySelector('#custom-dark').value);
      const light = hexToRgb(document.querySelector('#custom-light').value);
      return {
        light,
        dark
      };
    } else {
      return colors[color];
    }
  };

  const convertColors = () => {
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    context.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
    const tempCanvasData = context.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );
    const pixelCount = tempCanvas.width * tempCanvas.height;

    const selectedColors = getColors();

    const dueToneData = convertToDueTone(
      tempCanvasData,
      pixelCount,
      selectedColors.light,
      selectedColors.dark
    );

    const imageData = new ImageData(
      new Uint8ClampedArray(dueToneData),
      tempCanvas.width,
      tempCanvas.height
    );

    const target = document.querySelector('#duotone');
    const targetCtx = target.getContext('2d');
    target.setAttribute(
      'style',
      'width:' + image.width / 2 + 'px; height:' + image.height / 2 + 'px'
    );
    target.width = image.width;
    target.height = image.height;
    targetCtx.putImageData(
      imageData,
      0,
      0,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    setScale();
  };

  image.addEventListener('load', () => {
    convertColors();
  });

  const colorPicker = document.querySelector('.color-picker');
  const colorRadios = document.querySelectorAll('.color');
  for (let i = 0; i < colorRadios.length; i++) {
    colorRadios[i].addEventListener('click', event => {
      if (event.target.value === 'custom') {
        colorPicker.classList.remove('hidden');
      } else {
        colorPicker.classList.add('hidden');
      }
      convertColors();
    });
  }

  const customColorPickers = document.querySelectorAll('.custom-color-picker');
  for (let i = 0; i < customColorPickers.length; i++) {
    customColorPickers[i].addEventListener('change', convertColors);
  }

  const setScale = () => {
    const MAX_WIDTH = window.innerWidth - 16;
    const container = document.querySelector('#duotone-container');
    if (image.width > MAX_WIDTH) {
      let scale = MAX_WIDTH / (image.width / 2);
      container.setAttribute('style', `transform: scale(${scale})`);
    }
  };

  window.addEventListener('optimizedResize', setScale);
});
