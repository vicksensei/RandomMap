class TerrainGenerator {
  constructor() {
    this.mapWidth = 200;
    this.mapHeight = 200;
    this.scale = 50;

    this.octaves = 3;
    this.persistence = 0.5;
    this.lacunarity = 2.5;
    this.seed = 0;
    this.offset = { x: 0, y: 0 };

    this.baseContinentThreshold = 0.1;
    this.continentThreshold = 0.1;

    this.mapTexture = null;
    this.seaLevel = 0;
  }
  GenerateNoiseMap() {
    let noiseMap = new Array(this.mapWidth);
    for (let i = 0; i < this.mapWidth; i++) {
      noiseMap[i] = new Float32Array(this.mapHeight); // use Float32Array instead of Array
    }

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        let amplitude = 1;
        let frequency = 1;
        let noiseHeight = 0;

        for (let i = 0; i < this.octaves; i++) {
          let sampleX = ((x + this.offset.x) / this.scale) * frequency;
          let sampleY = ((y + this.offset.y) / this.scale) * frequency;

          let perlinValue = this.perlinNoise(
            this.seed + sampleX,
            this.seed + sampleY
          );
          noiseHeight += perlinValue * amplitude;
          amplitude *= this.persistence;
          frequency *= this.lacunarity;
        }

        noiseMap[x][y] = noiseHeight;
      }
    }
    // console.log("noiseMap :>> ", noiseMap);
    return noiseMap;
  }

  GetColor(value) {
    if (value < this.continentThreshold - 0.2) {
      // Deep Ocean color (dark blue)
      return { r: 0.1, g: 0.2, b: 0.4 };
    } else if (value < this.continentThreshold) {
      // Ocean color (blue)
      return { r: 0.2, g: 0.4, b: 0.8 };
    } else if (value < this.continentThreshold + 0.05) {
      // Low land color (white)
      return { r: 0.894, g: 0.835, b: 0.643 };
    } else if (value < this.continentThreshold + 0.3) {
      // Medium land color (green)
      return { r: 0.2, g: 0.8, b: 0.2 };
    } else {
      // High land color (brown)
      return { r: 0.6, g: 0.4, b: 0.2 };
    }
  }
  GenerateContinentMap() {
    let noiseMap = this.GenerateNoiseMap();

    this.mapTexture = new Array(this.mapWidth);
    for (let x = 0; x < this.mapWidth; x++) {
      this.mapTexture[x] = new Array(this.mapHeight);
      for (let y = 0; y < this.mapHeight; y++) {
        let color = this.GetColor(noiseMap[x][y]);
        this.mapTexture[x][y] = color;
      }
    }

    // Get the canvas element by ID
    let canvas = document.getElementById("canvas");
    canvas.width = this.mapWidth;
    canvas.height = this.mapHeight;
    let ctx = canvas.getContext("2d");
    let imageData = ctx.createImageData(this.mapWidth, this.mapHeight);

    // Convert the map texture to a flat array of RGBA values
    let flatMapTexture = [];
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        flatMapTexture.push(this.mapTexture[x][y].r * 255);
        flatMapTexture.push(this.mapTexture[x][y].g * 255);
        flatMapTexture.push(this.mapTexture[x][y].b * 255);
        flatMapTexture.push(255);
      }
    }

    // Copy the flat map texture to the image data
    for (let i = 0; i < flatMapTexture.length; i++) {
      imageData.data[i] = flatMapTexture[i];
    }

    // Draw the image data to the canvas
    ctx.putImageData(imageData, 0, 0);
  }

  RandomSeed() {
    this.seed = Math.floor(Math.random() * 100000);
    this.GenerateContinentMap();
  }
  updateSeaLevel(level) {
    this.seaLevel = level;
    this.continentThreshold = this.baseContinentThreshold + this.seaLevel / 100;

    this.GenerateContinentMap();
  }
  start() {
    this.GenerateContinentMap();
  }
  perlinNoise(x, y) {
    // Convert x and y to integers
    let xi = Math.floor(x);
    let yi = Math.floor(y);

    // Get the fractional part of x and y
    let xf = x - xi;
    let yf = y - yi;

    // Interpolate between the noise values at the corners of the integer lattice
    let n00 = this.dot2D(this.grad2D(xi, yi), xf, yf);
    let n10 = this.dot2D(this.grad2D(xi + 1, yi), xf - 1, yf);
    let n01 = this.dot2D(this.grad2D(xi, yi + 1), xf, yf - 1);
    let n11 = this.dot2D(this.grad2D(xi + 1, yi + 1), xf - 1, yf - 1);
    let u = this.fade(xf);
    let v = this.fade(yf);
    let nx0 = this.lerp(n00, n10, u);
    let nx1 = this.lerp(n01, n11, u);
    let nxy = this.lerp(nx0, nx1, v);

    return nxy;
  }

  dot2D(g, x, y) {
    return g[0] * x + g[1] * y;
  }
  grad2D(x, y) {
    let hash = ((x * 46335) ^ y) * 16713;
    hash = (hash >> 13) ^ hash;
    let grads = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    return grads[hash % grads.length];
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return (1 - t) * a + t * b;
  }
}

const terrainGenerator = new TerrainGenerator();
terrainGenerator.start();
var seedElement = document.getElementById("seedElement");
function ClickRandom() {
  terrainGenerator.RandomSeed();
  seedElement.value = terrainGenerator.seed;
}

var slider = document.getElementById("SeaLevel");
var sliderDisp = document.getElementById("SeaLevelDisp");
function ChangeSeaLevel() {
  terrainGenerator.updateSeaLevel(slider.value);
  sliderDisp.innerHTML = slider.value;
}
function Regenerate() {
  terrainGenerator.seed = seedElement.value;
  terrainGenerator.GenerateContinentMap();
}
