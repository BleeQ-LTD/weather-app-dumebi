import fs from "node:fs";

const files = fs.readdirSync("./src");

console.log("Files in src:", files);