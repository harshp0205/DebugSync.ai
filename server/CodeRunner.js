const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/run", (req, res) => {
  const { code, language } = req.body;
  if (language !== "javascript") {
    return res.status(400).json({ error: "Only JavaScript is supported in this demo." });
  }
  // Write code to a temp file and execute it
  const fs = require("fs");
  const path = require("path");
  const tempFile = path.join(__dirname, "tempCode.js");
  fs.writeFileSync(tempFile, code);

  exec(`node "${tempFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
    fs.unlinkSync(tempFile);
    res.json({
      stdout,
      stderr,
      error: err ? err.message : null,
    });
  });
});

app.listen(5050, () => console.log("Code runner listening on port 5050"));