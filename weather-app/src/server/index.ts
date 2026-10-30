import express from "express";

const app = express();
app.use(express.json());

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from Node.js!" });
});

app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});