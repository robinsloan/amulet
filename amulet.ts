// deno-lint-ignore camelcase
import { Sha3_512 } from "https://deno.land/std@0.92.0/hash/_sha3/sha3.ts";
import { Pattern, amuletPatterns } from "./patterns.ts";

const hash: string = new Sha3_512().update("foo").toString("hex");

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
  ",", ":", "—", "'", "?", " ", "\n",
]; // 33 chars currentlys

let amuletVocabRegexString = "[^";

AMULET_VOCAB.forEach((char) => {
  amuletVocabRegexString += char;
});

amuletVocabRegexString += "]";

const AMULET_DISALLOWED_CHAR_MATCH = new RegExp(amuletVocabRegexString, "g");

interface FoundPattern {
  y: number;
  x: number;
  pattern: Pattern;
}

interface FoundSigil {
  size: number;
  coords: number[][]; // array of [y, x]
}

export class AmuletHash {
  normalizedPoem: string;
  hash: string;
  grid: string[][];
  sigils: FoundSigil[];
  patterns: FoundPattern[];

  // scratchpad for sigil-finding
  tempSigilSize: number;
  tempSigilCoords: number[][]; // array of [y, x]
  visitedCoords: string[]; // an array of string keys, sort of like a hash

  constructor(poem: string) {
    this.normalizedPoem = poem.toUpperCase().replace(
      AMULET_DISALLOWED_CHAR_MATCH,
      "",
    );

    // maybe do "input expansion" here to streeetch poem to cover all the input bits
    // like input it several times in sequence? or something fancier?
    const fullHash = new Sha3_512().update(this.normalizedPoem)
      .toString("hex")

    this.hash = AMULET_MASK.map((index) => {
      return fullHash[index];
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

  checkCoord(y: number, x: number) {
    if (y < 0 || y > 4 || x < 0 || x > 4) {
      return;
    }

    const cellKey = [y, x].toString();
    if (this.visitedCoords.includes(cellKey)) {
      return;
    } else {
      this.visitedCoords.push(cellKey);
    }

    if (this.grid[y][x] == AMULET_MAGIC_CHAR) {
      this.tempSigilSize++;
      this.tempSigilCoords.push([y, x]);
      this.checkCoord(y - 1, x);
      this.checkCoord(y + 1, x);
      this.checkCoord(y, x - 1);
      this.checkCoord(y, x + 1);
    }
  }

  scanForSigils() {
    const amuletCharCoords = [];

    // translate to grid, mark amulet char coords at the same time
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const char = this.hash[(y * 5) + x];
        this.grid[y][x] = char;
        if (char == AMULET_MAGIC_CHAR) {
          amuletCharCoords.push([y, x]);
        }
      }
    }

    // now hunt for sigils starting at each amulet char coord
    amuletCharCoords.forEach((coord) => {
      // reset; we are starting a new hunt
      this.tempSigilSize = 0;
      this.tempSigilCoords = [];
      this.checkCoord(coord[0], coord[1]); // begin at amulet char coord y, x

      if (this.tempSigilSize > AMULET_MIN_SIGIL_SIZE) {
        this.sigils.push({
          size: this.tempSigilSize,
          coords: [...this.tempSigilCoords], // copy, don't reference
        });
      }
    });
  }

  checkPatternAtOffset(
    pattern: string[][],
    char: string,
    y: number,
    x: number,
  ) {
    const patternHeight = pattern.length;
    const patternWidth = pattern[0].length;
    if (x + patternWidth >= 5) return;
    if (y + patternHeight >= 5) return;

    for (let py = 0; py < patternHeight; py++) {
      for (let px = 0; px < patternWidth; px++) {
        if (pattern[py][px] == "8") {
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
          const hasPattern = this.checkPatternAtOffset(pattern.grid, char, y, x);
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