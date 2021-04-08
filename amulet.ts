// deno-lint-ignore camelcase
import { Sha3_512 } from "https://deno.land/std@0.92.0/hash/_sha3/sha3.ts";
import { amuletPatterns, Pattern } from "./patterns.ts";

const AMULET_MAGIC_CHAR = "8";
const AMULET_MIN_SIGIL_SIZE = 4;

// deno-fmt-ignore
const AMULET_MASK = [
  0,  1,  2,  3,  4,
  5,  6,  7,  8,  9,
 10, 11, 12, 13, 14,
 15, 16, 17, 18, 19,
 20, 12, 22, 23, 24,
]

if (AMULET_MASK.length !== 25) {
  console.log("YOU HAVE A PROBLEM");
  Deno.exit();
}

// deno-fmt-ignore
const AMULET_VOCAB = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  ",", ":", "—", "'", "?", "!", " ", "\n",
]; // 33 chars currentlys

let amuletVocabRegexString = "[^";

AMULET_VOCAB.forEach((char) => {
  amuletVocabRegexString += char;
});

amuletVocabRegexString += "]";

const AMULET_DISALLOWED_CHAR_MATCH = new RegExp(amuletVocabRegexString, "g");

interface GridCoord {
  y: number;
  x: number;
}

interface FoundPattern {
  y: number;
  x: number;
  pattern: Pattern;
}

interface FoundSigil {
  size: number;
  coords: GridCoord[];
}

export class AmuletHash {
  normalizedPoem: string;
  hash: string;
  grid: string[][];
  sigils: FoundSigil[];
  patterns: FoundPattern[];

  // scratchpad for sigil-finding
  tempSigilSize: number;
  tempSigilCoords: GridCoord[];
  visitedCoords: string[]; // an array of string keys, sort of like a hash

  constructor(poem: string) {
    this.normalizedPoem = poem.toUpperCase().replace(
      AMULET_DISALLOWED_CHAR_MATCH,
      "",
    );

    // because our poems are often shorter than the SHA3-512 message size,
    // which is 72 bytes, we'll hash twice, giving the algorithm a richer input

    // first hash
    const firstHash = new Sha3_512().update(this.normalizedPoem)
      .toString("hex");

    // second hash, in which we feed the poem back in,
    // along with that first hash
    const secondHash = new Sha3_512().update(this.normalizedPoem + firstHash)
      .toString("hex");

    // extremely important step, intentionally cryptic
    this.hash = AMULET_MASK.map((index) => {
      return secondHash[index];
    }).join("");

    this.grid = [];
    for (let y = 0; y < 5; y++) {
      this.grid.push([]);
    }

    this.sigils = [];
    this.patterns = [];

    this.tempSigilSize = 0;
    this.tempSigilCoords = [];
    this.visitedCoords = [];

    this.scanForSigils();
    this.scanForPatterns();
  }

  checkCoord(coord: GridCoord) {
    if (coord.y < 0 || coord.y > 4 || coord.x < 0 || coord.x > 4) {
      return;
    }

    const cellKey = [coord.y, coord.x].toString();
    if (this.visitedCoords.includes(cellKey)) {
      return;
    } else {
      this.visitedCoords.push(cellKey);
    }

    if (this.grid[coord.y][coord.x] == AMULET_MAGIC_CHAR) {
      this.tempSigilSize++;
      this.tempSigilCoords.push(coord);
      this.checkCoord({ y: coord.y - 1, x: coord.x });
      this.checkCoord({ y: coord.y + 1, x: coord.x });
      this.checkCoord({ y: coord.y, x: coord.x - 1 });
      this.checkCoord({ y: coord.y, x: coord.x + 1 });
    }
  }

  scanForSigils() {
    const amuletCharCoords: GridCoord[] = [];

    // translate to grid, mark amulet char coords at the same time
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const char = this.hash[(y * 5) + x];
        this.grid[y][x] = char;
        if (char == AMULET_MAGIC_CHAR) {
          amuletCharCoords.push({ y: y, x: x });
        }
      }
    }

    // now hunt for sigils starting at each marked amulet char coord
    amuletCharCoords.forEach((coord) => {
      // first: reset, because we are starting a new hunt
      this.tempSigilSize = 0;
      this.tempSigilCoords = [];
      // recursively search, starting at amulet char coord y, x
      this.checkCoord(coord);

      if (this.tempSigilSize > AMULET_MIN_SIGIL_SIZE) {
        this.sigils.push({
          size: this.tempSigilSize,
          coords: [...this.tempSigilCoords], // copy, don't reference
        });
      }
    });
  }

  checkPatternAtOffset(
    patternGrid: string[][],
    y: number,
    x: number,
    char: string,
  ) {
    const patternHeight = patternGrid.length;
    const patternWidth = patternGrid[0].length;
    if (x + patternWidth >= 5) return false;
    if (y + patternHeight >= 5) return false;

    for (let py = 0; py < patternHeight; py++) {
      for (let px = 0; px < patternWidth; px++) {
        if (patternGrid[py][px] == "8") {
          if (this.grid[y + py][x + px] !== char) {
            // BZZZT
            return false;
          }
        }
      }
    }

    return true;
  }

  scanForPatterns(char = "8") {
    amuletPatterns.forEach((pattern) => {
      const patternHeight = pattern.grid.length;
      const patternWidth = pattern.grid[0].length;

      const marginY = 5 - patternHeight;
      const marginX = 5 - patternWidth;

      for (let y = 0; y < marginY; y++) {
        for (let x = 0; x < marginX; x++) {
          const hasPattern = this.checkPatternAtOffset(
            pattern.grid,
            y,
            x,
            char,
          );
          if (hasPattern) {
            this.patterns.push({ y: y, x: x, pattern: pattern });
          }
        }
      }
    });
  }

  asSquareString(): string {
    let squareString = "";
    for (let i = 0; i < this.hash.length; i += 5) {
      squareString += this.hash.slice(i, i + 5) + "\n";
    }
    return squareString;
  }
}
