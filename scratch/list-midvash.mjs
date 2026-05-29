const url = "https://api.github.com/repos/midvash/bible-data/contents/versions/pl/bg/books?ref=main";
const res = await fetch(url);
const files = await res.json();
console.log(files.map((f) => f.name.replace(".json", "")).join("\n"));
