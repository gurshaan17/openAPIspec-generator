"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPIGenerator = void 0;
const fs_1 = require("fs");
const yaml = __importStar(require("js-yaml"));
const https_1 = __importDefault(require("https"));
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class OpenAPIGenerator {
    constructor() {
        this.fileContents = [];
        this.relevantExtensions = [
            '.ts', '.js',
            '.controller.ts', '.service.ts', '.route.ts', '.auth.ts',
            '.api.ts', '.handler.ts', '.middleware.ts'
        ];
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    generateFromRepo(repoUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Starting OpenAPI generation from repository:', repoUrl);
                const repoStructure = this.parseRepoUrl(repoUrl);
                yield this.fetchRepositoryTree(repoStructure);
                const openApiSpec = yield this.generateOpenAPISpec();
                yield this.saveOpenAPISpec(openApiSpec);
                return openApiSpec;
            }
            catch (error) {
                console.error('Error generating OpenAPI spec:', error);
                throw error;
            }
        });
    }
    parseRepoUrl(repoUrl) {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            throw new Error('Invalid GitHub repository URL');
        }
        // Clean the repo name (remove .git if present)
        const repo = match[2].replace('.git', '');
        return {
            owner: match[1],
            repo: repo,
            branch: 'main' // You can make this configurable if needed
        };
    }
    fetchRepositoryTree(repoStructure) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Fetching repository structure...');
                const { owner, repo, branch } = repoStructure;
                // Get the repository tree
                const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
                console.log('Fetching tree from:', treeUrl);
                const treeData = yield this.httpGet(treeUrl);
                const tree = JSON.parse(treeData);
                if (!tree.tree) {
                    throw new Error('Unable to fetch repository structure');
                }
                console.log(`Found ${tree.tree.length} files in repository`);
                // Filter and fetch relevant files
                const relevantFiles = tree.tree.filter((item) => item.type === 'blob' &&
                    this.isRelevantFile(item.path));
                console.log(`Found ${relevantFiles.length} relevant files for API analysis`);
                const promises = relevantFiles.map((item, index) => __awaiter(this, void 0, void 0, function* () {
                    yield new Promise(resolve => setTimeout(resolve, index * 100));
                    try {
                        const content = yield this.fetchFileContent(owner, repo, branch, item.path);
                        if (content) {
                            this.fileContents.push({
                                path: item.path,
                                content
                            });
                            console.log(`Successfully fetched: ${item.path}`);
                        }
                    }
                    catch (error) {
                        console.error(`Error fetching ${item.path}:`, error);
                    }
                }));
                yield Promise.all(promises);
                console.log(`Successfully processed ${this.fileContents.length} files`);
            }
            catch (error) {
                console.error('Error in fetchRepositoryTree:', error);
                throw error;
            }
        });
    }
    fetchFileContent(owner, repo, branch, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
            return this.httpGet(rawUrl);
        });
    }
    httpGet(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'OpenAPI-Generator',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };
            https_1.default.get(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    }
                    else if (res.statusCode === 404) {
                        reject(new Error(`File not found: ${url}`));
                    }
                    else if (res.statusCode === 403) {
                        reject(new Error('Rate limit exceeded. Please try again later.'));
                    }
                    else {
                        reject(new Error(`HTTP Status ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });
        });
    }
    isRelevantFile(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const isRelevantExt = this.relevantExtensions.some(relevantExt => filePath.toLowerCase().endsWith(relevantExt));
        // Additional checks for API-related files
        const isApiFile = filePath.toLowerCase().includes('api') ||
            filePath.toLowerCase().includes('route') ||
            filePath.toLowerCase().includes('controller');
        return isRelevantExt || isApiFile;
    }
    generateOpenAPISpec() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            console.log('Generating OpenAPI specification using ChatGPT...');
            try {
                // First, analyze code in chunks and collect endpoint information
                const chunks = this.createCodeChunks();
                let endpointAnalysis = '';
                for (const chunk of chunks) {
                    const analysisResponse = yield this.openai.chat.completions.create({
                        model: "gpt-4",
                        messages: [
                            {
                                role: "system",
                                content: `You are an expert API analyzer. Extract and summarize API endpoint information from the code. 
                            Focus on routes, controllers, and endpoint definitions. Be concise but complete. 
                            Provide ONLY a valid YAML output without any additional text.`
                            },
                            {
                                role: "user",
                                content: `Analyze this code chunk and extract API endpoint information:
                            ${chunk}
                            
                            Extract only:
                            1. Endpoint paths
                            2. HTTP methods
                            3. Parameters
                            4. Request/response structures
                            
                            Provide a concise summary as YAML.`
                            }
                        ],
                        temperature: 0.2,
                        max_tokens: 2000
                    });
                    endpointAnalysis += ((_b = (_a = analysisResponse.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) + "\n\n";
                }
                // Then, generate the OpenAPI spec from the analyzed information
                const response = yield this.openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert OpenAPI specification generator. 
                        Generate a complete, strictly valid OpenAPI 3.0 specification in YAML format.
                        Ensure the output is ONLY a valid YAML document with no extra text.`
                        },
                        {
                            role: "user",
                            content: `Generate an OpenAPI 3.0 specification based on this API analysis:
                        ${endpointAnalysis}
    
                        Requirements:
                        1. Follow OpenAPI 3.0 specification format exactly
                        2. Include all endpoints with their HTTP methods
                        3. Define request/response schemas
                        4. Include proper response codes
                        5. Define security schemes if mentioned
                        
                        Provide ONLY the valid YAML output.`
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 4000
                });
                // Clean and validate the YAML
                const yamlSpec = this.cleanAndValidateYaml(((_d = (_c = response.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || '');
                return yamlSpec;
            }
            catch (error) {
                console.error('Error in OpenAI API call:', error);
                throw error;
            }
        });
    }
    cleanAndValidateYaml(content) {
        // Remove any leading/trailing whitespace
        let cleanedContent = content.trim();
        // Remove any code block markers
        cleanedContent = cleanedContent.replace(/^```yaml\n?/, '').replace(/```$/, '');
        // Try to parse the YAML to validate
        try {
            const parsedYaml = yaml.load(cleanedContent);
            // Regenerate the YAML to ensure clean formatting
            const regeneratedYaml = yaml.dump(parsedYaml, {
                indent: 2,
                lineWidth: -1 // Disable line wrapping
            });
            return regeneratedYaml;
        }
        catch (error) {
            console.error('YAML validation failed:', error);
            throw new Error('Failed to generate a valid OpenAPI specification');
        }
    }
    createCodeChunks() {
        const MAX_CHUNK_SIZE = 6000; // Tokens, approximate
        const chunks = [];
        let currentChunk = '';
        let currentSize = 0;
        // Sort files to prioritize controllers and routes
        const sortedFiles = [...this.fileContents].sort((a, b) => {
            const isController = (path) => path.includes('controller') ||
                path.includes('route') ||
                path.includes('api');
            return isController(b.path) ? 1 : -1;
        });
        for (const file of sortedFiles) {
            // Estimate token size (rough approximation)
            const fileContent = `File: ${file.path}\n${file.content}\n\n`;
            const estimatedTokens = fileContent.length / 4; // Rough estimation
            if (currentSize + estimatedTokens > MAX_CHUNK_SIZE) {
                if (currentChunk) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                    currentSize = 0;
                }
            }
            currentChunk += fileContent;
            currentSize += estimatedTokens;
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        console.log(`Split code into ${chunks.length} chunks for processing`);
        return chunks;
    }
    // private prepareContext(): string {
    //     const sortedFiles = [...this.fileContents].sort((a, b) => {
    //         const getFileWeight = (path: string) => {
    //             if (path.includes('controller')) return 1;
    //             if (path.includes('route')) return 2;
    //             if (path.includes('service')) return 3;
    //             return 4;
    //         };
    //         return getFileWeight(a.path) - getFileWeight(b.path);
    //     });
    //     return sortedFiles
    //         .map(file => `File: ${file.path}\n${file.content}`)
    //         .join('\n\n' + '='.repeat(80) + '\n\n');
    // }
    saveOpenAPISpec(spec) {
        return __awaiter(this, void 0, void 0, function* () {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = `openapi-spec-${timestamp}.yaml`;
            yield fs_1.promises.writeFile(outputPath, spec, 'utf8');
            console.log(`OpenAPI specification saved to ${outputPath}`);
        });
    }
}
exports.OpenAPIGenerator = OpenAPIGenerator;
