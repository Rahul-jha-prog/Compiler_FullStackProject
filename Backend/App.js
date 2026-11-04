import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { exec } from 'child_process';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // 1. Loads the .env file

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 2. Explicitly allow your Vite frontend to prevent CORS errors
app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['POST', 'GET'],
    credentials: true
}));

app.use(express.json());

// 3. Connect to MongoDB Atlas using the hidden URI from .env
mongoose.connect(process.env.MONGO_DB_STRING)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

const SubmissionSchema = new mongoose.Schema({
    language: String,
    code: String,
    output: String,
    status: String,
    timestamp: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', SubmissionSchema);

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

app.post('/api/execute', async (req, res) => {
    const { language, code } = req.body;
    if (!code) return res.status(400).json({ error: "Empty code submission" });

    const jobId = uuidv4();
    let filename, execCommand, errorRegex;
    let isCompiled = false; 

    // 1. Language Configuration Mapping
    if (language === 'javascript') {
        filename = `${jobId}.js`;
        execCommand = `node ${path.join(tempDir, filename)}`;
        errorRegex = new RegExp(`${jobId}\\.js:(\\d+)`);
        
    } else if (language === 'python') {
        filename = `${jobId}.py`;
        const pyCommand = process.platform === 'win32' ? 'python' : 'python3'; 
        execCommand = `${pyCommand} ${path.join(tempDir, filename)}`;
        errorRegex = /line (\d+)/i;
        
    } else if (language === 'cpp') {
        filename = `${jobId}.cpp`;
        isCompiled = true;
        const outName = process.platform === 'win32' ? `${jobId}.exe` : `${jobId}.out`;
        const outPath = path.join(tempDir, outName);
        execCommand = `g++ ${path.join(tempDir, filename)} -o ${outPath} && "${outPath}"`;
        errorRegex = new RegExp(`${jobId}\\.cpp:(\\d+)`);
        
    } else if (language === 'c') {
        filename = `${jobId}.c`;
        isCompiled = true;
        const outName = process.platform === 'win32' ? `${jobId}.exe` : `${jobId}.out`;
        const outPath = path.join(tempDir, outName);
        execCommand = `gcc ${path.join(tempDir, filename)} -o ${outPath} && "${outPath}"`;
        errorRegex = new RegExp(`${jobId}\\.c:(\\d+)`);
        
    } else {
        return res.status(400).json({ error: "Unsupported language" });
    }

    // 2. Write code to file
    const filepath = path.join(tempDir, filename);
    fs.writeFileSync(filepath, code);

    // 3. Execute the code
    exec(execCommand, async (error, stdout, stderr) => {
        let finalOutput = stdout;
        let status = 'Success';

        // 4. Handle Errors and Line Numbers
        if (error || stderr) {
            status = 'Error';
            const errorText = stderr || error.message;
            const match = errorText.match(errorRegex);
            const lineNumber = match ? match[1] : "Unknown";
            finalOutput = `Error on line ${lineNumber}:\n${errorText}`;
        }

        // 5. Cleanup Files
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
        if (isCompiled) {
            const outName = process.platform === 'win32' ? `${jobId}.exe` : `${jobId}.out`;
            const outPath = path.join(tempDir, outName);
            if (fs.existsSync(outPath)) {
                fs.unlinkSync(outPath);
            }
        }

        // 6. Save to Database & Send Response
        await Submission.create({ language, code, output: finalOutput, status });
        res.json({ output: finalOutput, status });
    });
});

app.listen(5000, () => console.log('Compiler Backend running on port 5000'));