const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || null;

/**
 * Generate boilerplate code to wrap user function and handle input/output
 * @param {string} userCode - User's function code
 * @param {number} languageId - Judge0 language ID
 * @param {string} functionName - Name of the function to test
 * @param {string} input - Test case input
 * @returns {string} - Complete code with boilerplate
 */
/**
 * Analyze code to determine execution pattern and function details
 * @param {string} code - User's code
 * @param {number} languageId - Judge0 language ID
 * @returns {Object} - Analysis results
 */
const analyzeCode = (code, languageId) => {
    const analysis = {
        hasFunction: false,
        functionName: null,
        functionParams: [],
        hasMainFunction: false,
        isScript: false,
        needsWrapper: true,
        executionType: 'function' // 'function', 'script', 'class', 'query'
    };

    switch (languageId) {
        case 63: // JavaScript
            // Check for function declarations
            const jsFuncMatch = code.match(/function\s+(\w+)\s*\(([^)]*)\)/);
            const jsArrowMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/);
            const jsMethodMatch = code.match(/(\w+)\s*:\s*function\s*\(([^)]*)\)/);
            
            if (jsFuncMatch) {
                analysis.hasFunction = true;
                analysis.functionName = jsFuncMatch[1];
                analysis.functionParams = jsFuncMatch[2].split(',').map(p => p.trim()).filter(p => p);
            } else if (jsArrowMatch) {
                analysis.hasFunction = true;
                analysis.functionName = jsArrowMatch[1];
                analysis.functionParams = jsArrowMatch[2].split(',').map(p => p.trim()).filter(p => p);
            }
            
            // Check if it's a complete script
            if (code.includes('console.log') && !analysis.hasFunction) {
                analysis.isScript = true;
                analysis.needsWrapper = false;
                analysis.executionType = 'script';
            }
            break;

        case 71: // Python
            const pyFuncMatch = code.match(/def\s+(\w+)\s*\(([^)]*)\)/);
            if (pyFuncMatch) {
                analysis.hasFunction = true;
                analysis.functionName = pyFuncMatch[1];
                analysis.functionParams = pyFuncMatch[2].split(',').map(p => p.trim()).filter(p => p);
            }
            
            if (code.includes('print(') && !analysis.hasFunction) {
                analysis.isScript = true;
                analysis.needsWrapper = false;
                analysis.executionType = 'script';
            }
            break;

        case 62: case 91: // Java
            const javaClassMatch = code.match(/class\s+(\w+)/);
            const javaMethodMatch = code.match(/(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(\w+)\s+(\w+)\s*\(([^)]*)\)/);
            
            if (javaMethodMatch) {
                analysis.hasFunction = true;
                analysis.functionName = javaMethodMatch[2];
                analysis.functionParams = javaMethodMatch[3].split(',').map(p => p.trim()).filter(p => p);
            }
            
            if (code.includes('public static void main')) {
                analysis.hasMainFunction = true;
                analysis.needsWrapper = false;
                analysis.executionType = 'script';
            }
            break;

        case 46: // Bash
            const bashFuncMatch = code.match(/(?:function\s+(\w+)|(\w+)\s*\(\s*\))/);
            if (bashFuncMatch) {
                analysis.hasFunction = true;
                analysis.functionName = bashFuncMatch[1] || bashFuncMatch[2];
            }
            
            if (!analysis.hasFunction) {
                analysis.isScript = true;
                analysis.needsWrapper = false;
                analysis.executionType = 'script';
            }
            break;

        case 82: // SQL
            analysis.isScript = true;
            analysis.needsWrapper = false;
            analysis.executionType = 'query';
            break;
    }

    return analysis;
};

/**
 * Parse input string to determine format and convert appropriately
 * @param {string} input - Input string
 * @param {number} languageId - Judge0 language ID
 * @returns {Object} - Parsed input details
 */
const parseInput = (input, languageId) => {
    try {
        // Try to parse as JSON first
        const parsed = JSON.parse(input);
        const isArray = Array.isArray(parsed);
        
        // Check if it's a nested array for multiple parameters
        // Nested array is when: all items are arrays AND there are multiple items
        // [[1,2,3]] = single list parameter (only 1 item)
        // [[1,2],[3,4]] = two list parameters (2+ items, all arrays)
        // [1,2,3] = single list parameter (flat array)
        const isNestedArray = isArray && 
                             parsed.length > 1 && 
                             parsed.every(item => Array.isArray(item));
        
        return {
            raw: input,
            parsed: parsed,
            isArray: isArray,
            isNestedArray: isNestedArray,
            isObject: typeof parsed === 'object' && !Array.isArray(parsed),
            isPrimitive: typeof parsed !== 'object',
            count: Array.isArray(parsed) ? parsed.length : 1,
            type: Array.isArray(parsed) ? 'array' : typeof parsed
        };
    } catch (e) {
        // If not JSON, treat as string
        return {
            raw: input,
            parsed: input,
            isArray: false,
            isNestedArray: false,
            isObject: false,
            isPrimitive: true,
            count: 1,
            type: 'string'
        };
    }
};

/**
 * Generate dynamic boilerplate based on code analysis
 * @param {string} userCode - User's function code
 * @param {number} languageId - Judge0 language ID
 * @param {string} input - Test case input
 * @returns {string} - Complete code with boilerplate
 */
const generateBoilerplate = (userCode, languageId, input) => {
    const codeAnalysis = analyzeCode(userCode, languageId);
    const inputAnalysis = parseInput(input, languageId);
    
    // If code doesn't need wrapper, return as-is
    if (!codeAnalysis.needsWrapper) {
        return userCode;
    }

    switch (languageId) {
        case 63: // JavaScript
            if (codeAnalysis.hasFunction) {
                const functionName = codeAnalysis.functionName;
                if (inputAnalysis.isArray) {
                    return `${userCode}

// Auto-generated test execution
const input = ${input};
const result = ${functionName}(...input);
console.log(result);`;
                } else if (inputAnalysis.isPrimitive) {
                    return `${userCode}

// Auto-generated test execution
const input = ${input};
const result = ${functionName}(input);
console.log(result);`;
                } else {
                    return `${userCode}

// Auto-generated test execution
const input = ${input};
const result = ${functionName}(input);
console.log(result);`;
                }
            } else {
                // Try to make it a function call
                return `${userCode}

// Auto-generated test execution with input: ${input}
const input = ${input};
console.log(input);`;
            }

        case 71: // Python
            if (codeAnalysis.hasFunction) {
                const functionName = codeAnalysis.functionName || 'solution';
                const paramCount = codeAnalysis.functionParams ? codeAnalysis.functionParams.length : 0;

                return `${userCode}

# Auto-generated test execution
import json
try:
    # Parse input
    input_data = json.loads('${input.replace(/'/g, "\\'")}')
    if isinstance(input_data, list) and len(input_data) == 1 and isinstance(input_data[0], list):
        input_data = input_data[0]
    elif isinstance(input_data, list) and len(input_data) == 1 and all(isinstance(x, list) for x in input_data[0]):
        input_data = input_data[0]
        
    if isinstance(input_data, list):
        if ${paramCount} > 1:
            result = ${functionName}(*input_data)
        else:
            result = ${functionName}(input_data)
    else:
        result = ${functionName}(input_data)

    # --- Print final output ---
    print(result)

except Exception as e:
    print(f"Error: {e}")`;
            } else {
                return `${userCode}

# Auto-generated test execution
import json
try:
    input_data = json.loads('${input.replace(/'/g, "\\'")}')
    print(input_data)
except Exception as e:
    print(f"Error: {e}")`;
            }

        case 62: case 91: // Java
            const className = 'Solution';
            if (codeAnalysis.hasFunction) {
                const functionName = codeAnalysis.functionName;
                return `import java.util.*;
import java.util.stream.*;
import com.google.gson.*;

public class ${className} {
    ${userCode}
    
    public static void main(String[] args) {
        try {
            ${className} solution = new ${className}();
            Gson gson = new Gson();
            
            // Parse input: ${input}
            String inputStr = "${input.replace(/"/g, '\\"')}";
            
            // Dynamic input handling
            if (inputStr.startsWith("[") && inputStr.endsWith("]")) {
                // Array input
                inputStr = inputStr.substring(1, inputStr.length() - 1);
                String[] parts = inputStr.split(",");
                
                if (parts.length == 1) {
                    int param = Integer.parseInt(parts[0].trim());
                    System.out.println(solution.${functionName}(param));
                } else if (parts.length == 2) {
                    int a = Integer.parseInt(parts[0].trim());
                    int b = Integer.parseInt(parts[1].trim());
                    System.out.println(solution.${functionName}(a, b));
                } else {
                    // Handle more parameters dynamically
                    int[] params = Arrays.stream(parts)
                        .mapToInt(s -> Integer.parseInt(s.trim()))
                        .toArray();
                    System.out.println("Multiple parameters: " + Arrays.toString(params));
                }
            } else {
                // Single value
                int param = Integer.parseInt(inputStr);
                System.out.println(solution.${functionName}(param));
            }
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}`;
            }
            break;

        case 54: case 76: // C++
            if (codeAnalysis.hasFunction) {
                const functionName = codeAnalysis.functionName;
                return `#include <iostream>
#include <vector>
#include <sstream>
#include <string>
#include <algorithm>
using namespace std;

${userCode}

int main() {
    try {
        string input = "${input}";
        
        // Dynamic input parsing
        if (input.front() == '[' && input.back() == ']') {
            // Array input
            input = input.substr(1, input.length() - 2);
            stringstream ss(input);
            string item;
            vector<int> params;
            
            while (getline(ss, item, ',')) {
                // Trim whitespace
                item.erase(remove_if(item.begin(), item.end(), ::isspace), item.end());
                params.push_back(stoi(item));
            }
            
            if (params.size() == 1) {
                cout << ${functionName}(params[0]) << endl;
            } else if (params.size() == 2) {
                cout << ${functionName}(params[0], params[1]) << endl;
            } else if (params.size() > 2) {
                // Handle vector input
                cout << "Multiple parameters" << endl;
            }
        } else {
            // Single parameter
            int param = stoi(input);
            cout << ${functionName}(param) << endl;
        }
    } catch (const exception& e) {
        cout << "Error: " << e.what() << endl;
    }
    
    return 0;
}`;
            }
            break;

        case 46: // Bash
            if (codeAnalysis.hasFunction) {
                const functionName = codeAnalysis.functionName;
                return `${userCode}

# Auto-generated test execution
input="${input}"

# Parse input dynamically
if [[ "$input" == \\[*\\] ]]; then
    # Array input - remove brackets and split
    params=$(echo "$input" | sed 's/\\[//g' | sed 's/\\]//g' | tr ',' ' ')
    result=$(${functionName} $params)
else
    # Single parameter
    result=$(${functionName} "$input")
fi

echo "$result"`;
            } else {
                return `${userCode}

# Auto-generated test execution
echo "${input}"`;
            }

        case 82: // SQL
            // For SQL, create a more dynamic structure
            return `-- User SQL code with dynamic input
-- Input: ${input}
${userCode}

-- Auto-generated test execution would depend on the specific SQL structure`;

        default:
            // Generic fallback with dynamic input handling
            return `${userCode}

/* Auto-generated test execution */
/* Input: ${input} */
/* Language ID: ${languageId} */
/* Analysis: ${JSON.stringify(codeAnalysis)} */`;
    }

    return userCode;
};

/**
 * Extract function name from user code
 * @param {string} code - User's code
 * @param {number} languageId - Judge0 language ID
 * @returns {string} - Function name
 */
const extractFunctionName = (code, languageId) => {
    switch (languageId) {
        case 63: // JavaScript
            const jsMatch = code.match(/function\s+(\w+)\s*\(/) || code.match(/const\s+(\w+)\s*=/) || code.match(/(\w+)\s*=\s*\(/);
            return jsMatch ? jsMatch[1] : 'main';
        
        case 71: // Python
            const pyMatch = code.match(/def\s+(\w+)\s*\(/);
            return pyMatch ? pyMatch[1] : 'main';
        
        case 62: // Java
        case 91: // Java (OpenJDK 17.0.1)
            const javaMatch = code.match(/(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:int|long|double|float|String|boolean|void)\s+(\w+)\s*\(/);
            return javaMatch ? javaMatch[1] : 'solve';
        
        case 54: // C++
        case 76: // C++ (Clang 7.0.1)
        case 50: // C
            const cppMatch = code.match(/(?:int|long|double|float|char|void)\s+(\w+)\s*\(/) || code.match(/(\w+)\s*\(/);
            return cppMatch ? cppMatch[1] : 'solve';
        
        case 46: // Bash
            const bashMatch = code.match(/function\s+(\w+)/) || code.match(/(\w+)\s*\(\s*\)\s*{/);
            return bashMatch ? bashMatch[1] : 'main';
        
        case 82: // SQL
            // For SQL, we'll use a generic name
            return 'query';
        
        case 51: // C#
            const csharpMatch = code.match(/(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:int|long|double|float|string|bool|void)\s+(\w+)\s*\(/);
            return csharpMatch ? csharpMatch[1] : 'Solve';
        
        case 78: // Kotlin
            const kotlinMatch = code.match(/fun\s+(\w+)\s*\(/);
            return kotlinMatch ? kotlinMatch[1] : 'solve';
        
        case 72: // Ruby
            const rubyMatch = code.match(/def\s+(\w+)\s*[\(\n]/);
            return rubyMatch ? rubyMatch[1] : 'solve';
        
        case 73: // Rust
            const rustMatch = code.match(/fn\s+(\w+)\s*\(/);
            return rustMatch ? rustMatch[1] : 'solve';
        
        default:
            return 'main';
    }
};

/**
 * Submit code to Judge0 API
 * @param {string} sourceCode - The source code to execute
 * @param {number} languageId - Judge0 language ID
 * @param {string} stdin - Standard input for the program
 * @param {string} expectedOutput - Expected output (optional)
 * @param {object} options - Additional options (cpu_time_limit, memory_limit, etc.)
 * @returns {Promise<Object>} - Submission result with token
 */
const submitToJudge0 = async (sourceCode, languageId, stdin = '', expectedOutput = null, options = {}) => {
    try {
        const submissionData = {
            source_code: sourceCode,
            language_id: languageId.toString(),
            stdin: stdin,
            expected_output: expectedOutput,
            cpu_time_limit: options.cpu_time_limit || null,
            cpu_extra_time: options.cpu_extra_time || null,
            wall_time_limit: options.wall_time_limit || null,
            memory_limit: options.memory_limit || null,
            stack_limit: options.stack_limit || null,
            max_processes_and_or_threads: options.max_processes_and_or_threads || null,
            enable_per_process_and_thread_time_limit: options.enable_per_process_and_thread_time_limit || null,
            enable_per_process_and_thread_memory_limit: options.enable_per_process_and_thread_memory_limit || null,
            max_file_size: options.max_file_size || null,
            enable_network: options.enable_network || null
        };

        const headers = {
            'Content-Type': 'application/json'
        };

        if (JUDGE0_API_KEY) {
            headers['X-Auth-Token'] = JUDGE0_API_KEY;
        }

        const response = await axios.post(
            `${JUDGE0_API_URL}/submissions?wait=false`,
            submissionData,
            { headers }
        );

        return {
            success: true,
            token: response.data.token
        };
    } catch (error) {
        console.error('Error submitting to Judge0:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
};

/**
 * Get submission result from Judge0 API
 * @param {string} token - Submission token
 * @returns {Promise<Object>} - Submission result
 */
const getSubmissionResult = async (token) => {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add API key if available
        if (JUDGE0_API_KEY) {
            headers['X-Auth-Token'] = JUDGE0_API_KEY;
        }

        const response = await axios.get(
            `${JUDGE0_API_URL}/submissions/${token}`,
            { headers }
        );

        return {
            success: true,
            data: {
                stdout: response.data.stdout,
                stderr: response.data.stderr,
                compile_output: response.data.compile_output,
                message: response.data.message,
                time: response.data.time,
                memory: response.data.memory,
                status: response.data.status,
                token: response.data.token
            }
        };
    } catch (error) {
        console.error('Error getting submission result:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
};

/**
 * Submit code and wait for result (with polling)
 * @param {string} sourceCode - The source code to execute
 * @param {number} languageId - Judge0 language ID
 * @param {string} stdin - Standard input for the program
 * @param {string} expectedOutput - Expected output (optional)
 * @param {object} options - Additional options
 * @returns {Promise<Object>} - Final submission result
 */
const submitAndWaitForResult = async (sourceCode, languageId, stdin = '', expectedOutput = null, options = {}) => {
    try {
        const submission = await submitToJudge0(sourceCode, languageId, stdin, expectedOutput, options);
        
        if (!submission.success) {
            return submission;
        }

        const token = submission.token;
        const maxRetries = 10;
        const retryDelay = 1000;
        for (let i = 0; i < maxRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));

            const result = await getSubmissionResult(token);

            if (!result.success) {
                return result;
            }

            const statusId = result.data.status.id;
            
            if (statusId > 2) {
                return {
                    success: true,
                    data: result.data
                };
            }
        }

        return {
            success: false,
            error: 'Submission timed out'
        };
    } catch (error) {
        console.error('Error in submitAndWaitForResult:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Run code against multiple test cases
 * @param {string} sourceCode - The source code to execute
 * @param {number} languageId - Judge0 language ID
 * @param {Array} testCases - Array of test cases [{input, output}]
 * @returns {Promise<Object>} - Results for all test cases
 */
const runTestCases = async (sourceCode, languageId, testCases) => {
    try {
        const results = [];

        for (const testCase of testCases) {
            // Generate complete code with dynamic boilerplate
            const completeCode = generateBoilerplate(sourceCode, languageId, testCase.input);
            
            const result = await submitAndWaitForResult(
                completeCode,
                languageId,
                '', // No stdin needed as input is in the code
                testCase.output
            );

            if (!result.success) {
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    success: false,
                    error: result.error,
                    generatedCode: completeCode
                });
            } else {
                const isPassed = result.data.status.id === 3 && 
                                result.data.stdout?.trim() === testCase.output.trim();
                
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: result.data.stdout,
                    stderr: result.data.stderr,
                    compileOutput: result.data.compile_output,
                    time: result.data.time,
                    memory: result.data.memory,
                    status: result.data.status,
                    passed: isPassed,
                    success: true,
                    generatedCode: completeCode // For debugging
                });
            }
        }

        const allPassed = results.every(r => r.passed);
        const passedCount = results.filter(r => r.passed).length;

        return {
            success: true,
            allPassed,
            passedCount,
            totalCount: testCases.length,
            results
        };
    } catch (error) {
        console.error('Error running test cases:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    submitToJudge0,
    getSubmissionResult,
    submitAndWaitForResult,
    runTestCases,
    generateBoilerplate,
    extractFunctionName,
    analyzeCode,
    parseInput
};