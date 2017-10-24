document.addEventListener('DOMContentLoaded', function() {
  var rgbToHsl = function(r, g, b) {
    (r /= 255), (g /= 255), (b /= 255);
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    var h,
      s,
      l = (max + min) / 2;

    if (max == min) {
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

  var image = document.getElementById('source');
  var input = document.querySelector('#file');
  input.addEventListener('change', function(e) {
    var reader = new FileReader();
    reader.onload = function(e) {
      image.src = e.target.result;
    };
    reader.readAsDataURL(this.files[0]);
  });

  // Get the source image
  image.addEventListener('load', function() {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    // Set's the width of the canvas to be the same as the width of the image
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw to the canvas the image
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Get the image data out by using the context of the canvas
    var canvasData = context.getImageData(0, 0, canvas.width, canvas.height);

    // We get the number of pixels that make the image
    var pixelCount = canvas.width * canvas.height;

    // RED
    var dueToneData = convertToDueTone(
      canvasData,
      pixelCount,
      [240, 14, 46],
      [25, 37, 80]
    );

    var imageData = new ImageData(
      new Uint8ClampedArray(dueToneData),
      canvas.width,
      canvas.height
    );

    var target = document.querySelector('#duotone');
    target.setAttribute(
      'style',
      'width:' + image.width + 'px;height:' + image.height + 'px'
    );
    target.width = image.width;
    target.height = image.height;
    var targetCtx = target.getContext('2d');
    targetCtx.putImageData(imageData, 0, 0, 0, 0, canvas.width, canvas.height);
  });
});
