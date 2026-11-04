import express from 'express';
import mongoose from 'mongoose';
import { exec } from 'child_process';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Schema
const SubmissionSchema = new mongoose.Schema({
    language: String,
    code: String,
    output: String,
    status: String,
    timestamp: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', SubmissionSchema);

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Note: Changed from app.post('/api/execute' to router.post('/execute'
router.post('/execute', async (req, res) => {
    // 1. Extract 'input' from the frontend request
    const { language, code, input } = req.body;
    if (!code) return res.status(400).json({ error: "Empty code submission" });

    const jobId = uuidv4();
    let filename, execCommand, errorRegex;
    let isCompiled = false;

    // 2. Create and write to a temporary input file
    const inputPath = path.join(tempDir, `${jobId}.in`);
    fs.writeFileSync(inputPath, input || ""); // Write input, or empty string if none

    if (language === 'javascript') {
        filename = `${jobId}.js`;
        // 3. Feed the input file into the execution using < 
        execCommand = `node ${path.join(tempDir, filename)} < "${inputPath}"`;
        errorRegex = new RegExp(`${jobId}\\.js:(\\d+)`);
    } else if (language === 'python') {
        filename = `${jobId}.py`;
        const pyCommand = process.platform === 'win32' ? 'python' : 'python3'; 
        execCommand = `${pyCommand} ${path.join(tempDir, filename)} < "${inputPath}"`;
        errorRegex = /line (\d+)/i;
    } else if (language === 'cpp') {
        filename = `${jobId}.cpp`;
        isCompiled = true;
        const outName = process.platform === 'win32' ? `${jobId}.exe` : `${jobId}.out`;
        const outPath = path.join(tempDir, outName);
        execCommand = `g++ ${path.join(tempDir, filename)} -o "${outPath}" && "${outPath}" < "${inputPath}"`;
        errorRegex = new RegExp(`${jobId}\\.cpp:(\\d+)`);
    } else if (language === 'c') {
        filename = `${jobId}.c`;
        isCompiled = true;
        const outName = process.platform === 'win32' ? `${jobId}.exe` : `${jobId}.out`;
        const outPath = path.join(tempDir, outName);
        execCommand = `gcc ${path.join(tempDir, filename)} -o "${outPath}" && "${outPath}" < "${inputPath}"`;
        errorRegex = new RegExp(`${jobId}\\.c:(\\d+)`);
    } else {
        return res.status(400).json({ error: "Unsupported language" });
    }

    const filepath = path.join(tempDir, filename);
    fs.writeFileSync(filepath, code);

    exec(execCommand, async (error, stdout, stderr) => {
        let finalOutput = stdout;
        let status = 'Success';

        if (error || stderr) {
            status = 'Error';
            const errorText = stderr || error.message;
            const match = errorText.match(errorRegex);
            const lineNumber = match ? match[1] : "Unknown";
            finalOutput = `Error on line ${lineNumber}:\n${errorText}`;
        }

        // 4. Cleanup: Delete the input file alongside the code files
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        if (isCompiled) {
            const outName = process.platform === 'win32' ? `${jobId}.exe` : `${jobId}.out`;
            const outPath = path.join(tempDir, outName);
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }

        await Submission.create({ language, code, output: finalOutput, status });
        res.json({ output: finalOutput, status });
    });
});
export default router;