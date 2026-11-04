import React, { useState } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';

function App() {
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState('console.log("Hello World");');
    const [customInput, setCustomInput] = useState('');
    const [output, setOutput] = useState('');
    const [status, setStatus] = useState('');

    const templates = {
        javascript: 'console.log("Hello World");',
        python: 'print("Hello World")',
        cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}',
        c: '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}'
    };

    const handleLanguageChange = (e) => {
        const selectedLang = e.target.value;
        setLanguage(selectedLang);
        setCode(templates[selectedLang]);
        setOutput('');
        setStatus('');
    };
                  
    const handleRunCode = async () => {
        setOutput('Executing code...');
        setStatus('');
        try {
            const response = await axios.post('http://localhost:5000/api/execute', { 
                language, 
                code,
                input: customInput
            });
            setOutput(response.data.output);
            setStatus(response.data.status);
        } catch (error) {
            setOutput('Server error: Make sure your Node backend is running on port 5000.');
            setStatus('Error');
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f0f0f', color: '#ffffff', fontFamily: 'system-ui, sans-serif', margin: '-8px' }}>
            
            {/* Top Navigation Bar */}
            <div style={{ padding: '12px 20px', backgroundColor: '#1e1e1e', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#e0e0e0' }}>{'</>'} Online Compiler</h2>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <select 
                        value={language} 
                        onChange={handleLanguageChange} 
                        style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '6px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="javascript">JavaScript (Node)</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++ (g++)</option>
                        <option value="c">C (gcc)</option>
                    </select>

                    <button 
                        onClick={handleRunCode} 
                        style={{ padding: '8px 24px', fontSize: '14px', fontWeight: 'bold', background: '#2ea043', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        ▶ Run Code
                    </button>
                </div>
            </div>

            {/* Main Workspace (Split Pane) */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* Left Side: Code Editor */}
                <div style={{ flex: 1.4, borderRight: '1px solid #333', paddingTop: '10px' }}>
                    <Editor
                        height="100%"
                        language={language === 'c' ? 'cpp' : language}
                        value={code}
                        onChange={(value) => setCode(value)}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 15,
                            padding: { top: 10 },
                            scrollBeyondLastLine: false,
                        }}
                    />
                </div>

                {/* Right Side: Input & Output Panels */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
                    
                    {/* Top Half: Custom Input */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px', borderBottom: '1px solid #333' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px' }}>Custom Input (stdin)</h3>
                        <textarea 
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Enter testcases or input data here..."
                            style={{ 
                                flex: 1, 
                                padding: '12px', 
                                borderRadius: '6px', 
                                border: '1px solid #444',
                                backgroundColor: '#0d1117',
                                color: '#c9d1d9',
                                fontFamily: 'Consolas, monospace',
                                fontSize: '14px',
                                resize: 'none',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Bottom Half: Output Terminal */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px' }}>Terminal Output</h3>
                        <pre style={{ 
                            flex: 1,
                            margin: 0,
                            background: '#0d1117', 
                            color: status === 'Error' ? '#ff7b72' : (output ? '#3fb950' : '#8b949e'), 
                            padding: '12px', 
                            borderRadius: '6px', 
                            border: '1px solid #444',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Consolas, monospace',
                            fontSize: '14px'
                        }}>
                            {output || "Run your code to see the output here..."}
                        </pre>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default App;