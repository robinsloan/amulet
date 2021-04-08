const TRIPLE = `
888
`;

const QUAD = `
8888
`;

const SWORD = `
 8
888
 8
`;

const SHIELD = `
88
88
`;

const STAFF = `
88
 8
 8
`;

const MIRROR = `
888
8 8
888
`;

const PATTERNS: { [name: string] : string } = {
  triple: TRIPLE,
  quad: QUAD,
  sword: SWORD,
  shield: SHIELD,
  staff: STAFF,
  mirror: MIRROR,
};

export interface Pattern {
  name: string,
  grid: string[][],
}

function mirror(grid: string[][]): string[][] {
  const height = grid.length;
  const width = grid[0].length;

  const mirroredGrid: string[][] = [];
  for (let y = 0; y < height; y++) {
    mirroredGrid.push([]);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mirroredGrid[y][x] = grid[y][width - 1 - x]; // not width-x
    }
  }

  return mirroredGrid;
}

function rotate(grid: string[][]): string[][] {
  // a bit cryptic, but better than the for-loop nonsense required otherwise
  // https://stackoverflow.com/questions/15170942/how-to-rotate-a-matrix-in-an-array-in-javascript
  const rotatedGrid = grid[0].map((val, index) =>
    grid.map((row) => row[index]).reverse()
  );

  return rotatedGrid;
}

function makeGridFrom(pattern: string): string[][] {
  // this slice is brittle, but I AM IN CONTROL:
  const lines = pattern.slice(1, -1).split("\n");
  const height = lines.length;
  let width = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > width) width = lines[i].length;
  }

  // pad all lines to width
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length < width) {
      lines[i] += " ".repeat(width - lines[i].length);
    }
  }

  const sourcePattern = lines.join("");

  // prepare grid of [y, x]
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    grid.push([]);
  }

  // translate pattern to grid
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y][x] = sourcePattern[(y * width) + x];
    }
  }

  return grid;
}

const addedPatternKeys: string[] = [];

function addToPatternsIfUnique(name: string, grid: string[][]) {
  const gridKey = grid.toString();
  if (addedPatternKeys.includes(gridKey)) {
    return;
  } else {
    amuletPatterns.push({name: name, grid: [...grid]}); // add a copy of the grid
    addedPatternKeys.push(gridKey);
  }
}

export const amuletPatterns: Pattern[] = [];

for (const patternName of Object.keys(PATTERNS)) {
  const stringPattern: string = PATTERNS[patternName];
  const grid = makeGridFrom(stringPattern);
  addToPatternsIfUnique(patternName, grid);
  let rotated = grid;
  for (let i = 0; i < 3; i++) { // rotate thrice
    rotated = rotate(rotated);
    addToPatternsIfUnique(patternName, rotated);
  }
}