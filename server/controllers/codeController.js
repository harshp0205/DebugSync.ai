// server/controllers/codeController.js
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

function runCode(req, res) {
  const { code, language } = req.body;
  if (language === "javascript") {
    const tempFile = path.join(__dirname, "../tempCode.js");
    fs.writeFileSync(tempFile, code);
    exec(`node "${tempFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
      fs.unlinkSync(tempFile);
      res.json({
        stdout,
        stderr,
        error: err ? err.message : null,
      });
    });
  } else if (language === "cpp" || language === "c++") {
    const tempFile = path.join(__dirname, "../tempCode.cpp");
    const execFile = path.join(__dirname, "../tempCode.exe");
    fs.writeFileSync(tempFile, code);
    exec(`g++ "${tempFile}" -o "${execFile}"`, { timeout: 5000 }, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) {
        fs.unlinkSync(tempFile);
        return res.json({
          stdout: compileStdout,
          stderr: compileStderr,
          error: compileErr.message,
        });
      }
      exec(`"${execFile}"`, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
        fs.unlinkSync(tempFile);
        fs.unlinkSync(execFile);
        res.json({
          stdout: runStdout,
          stderr: runStderr,
          error: runErr ? runErr.message : null,
        });
      });
    });
  } else {
    return res.status(400).json({ error: "Only JavaScript and C++ are supported in this demo." });
  }
}

module.exports = { runCode };
