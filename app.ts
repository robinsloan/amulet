import { AmuletHash } from "./amulet.ts";

// deno run --allow-read app.ts

const jsonPoems = Deno.readTextFileSync("test-poems.json");
const poems: string[] = JSON.parse(jsonPoems);

let amuletCount = 0;
const amulets: AmuletHash[] = [];

poems.forEach((poem: string) => {
  const amulet = new AmuletHash(poem);

  if (amulet.sigils.length > 0) {
    amulets.push(amulet);
    amuletCount++;
  }
});

console.log(`From ${poems.length} poems, found ${amuletCount} amulets.`);
console.log("Here's one:");
const randomIndex = Math.floor(Math.random() * (amulets.length - 1));
console.log(amulets[randomIndex]);
