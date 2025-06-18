// server/routes/codeRoutes.js
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Route for running code
router.post('/run', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'No language specified' });
    }
    
    console.log(`Executing ${language} code`);
    
    // Create a temporary directory for code execution
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-'));
    
    // Set up execution parameters based on language
    let fileName, execCommand, fileExtension;
    
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        fileExtension = 'js';
        execCommand = 'node';
        break;
      case 'python':
      case 'py':
        fileExtension = 'py';
        execCommand = 'python3';
        break;
      case 'java':
        fileExtension = 'java';
        execCommand = 'java';
        break;
      case 'c':
        fileExtension = 'c';
        execCommand = 'gcc -o';
        break;
      case 'cpp':
      case 'c++':
        fileExtension = 'cpp';
        execCommand = 'g++ -o';
        break;
      default:
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }
    
    fileName = `code.${fileExtension}`;
    const filePath = path.join(tempDir, fileName);
    
    // Write code to temp file
    await fs.writeFile(filePath, code);
    
    // Execute the code
    exec(`cd ${tempDir} && ${execCommand} ${fileName}`, {
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer for output
    }, (error, stdout, stderr) => {
      // Cleanup temp directory
      fs.rm(tempDir, { recursive: true, force: true })
        .catch(err => console.error('Error cleaning up temp directory:', err));
      
      if (error) {
        console.error(`Execution error: ${error.message}`);
        return res.status(400).json({
          error: 'Execution failed',
          stderr: stderr,
          details: error.message
        });
      }
      
      res.json({
        result: stdout,
        error: stderr
      });
    });
  } catch (err) {
    console.error('Error in /run endpoint:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
