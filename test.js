require("dotenv").config();
const { Client } = require("pg");

console.log("DIRECT_URL:", process.env.DIRECT_URL);

const c = new Client({ connectionString: process.env.DIRECT_URL });

console.log("Connecting...");
c.connect()
  .then(() => {
    console.log("Connected!");
    c.end();
  })
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
