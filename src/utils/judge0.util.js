const axios = require('axios');

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || null;

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
            headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
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
            headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
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
            const result = await submitAndWaitForResult(
                sourceCode,
                languageId,
                testCase.input,
                testCase.output
            );

            if (!result.success) {
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    success: false,
                    error: result.error
                });
            } else {
                const isPassed = result.data.status.id === 3;
                
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
                    success: true
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
    runTestCases
};
