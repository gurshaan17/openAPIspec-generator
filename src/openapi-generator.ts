import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import https from 'https';
import path from 'path';
import OpenAI from 'openai';
import dotenv from "dotenv";

dotenv.config();

interface FileContent {
    path: string;
    content: string;
}

interface RepoStructure {
    owner: string;
    repo: string;
    branch: string;
}

class OpenAPIGenerator {
    private fileContents: FileContent[] = [];
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    

    private relevantExtensions = [
        '.ts', '.js',
        '.controller.ts', '.service.ts', '.route.ts', '.auth.ts',
        '.api.ts', '.handler.ts', '.middleware.ts'
    ];

    async generateFromRepo(repoUrl: string): Promise<string> {
        try {
            console.log('Starting OpenAPI generation from repository:', repoUrl);
            const repoStructure = this.parseRepoUrl(repoUrl);
            await this.fetchRepositoryTree(repoStructure);
            const openApiSpec = await this.generateOpenAPISpec();
            await this.saveOpenAPISpec(openApiSpec);
            return openApiSpec;
        } catch (error) {
            console.error('Error generating OpenAPI spec:', error);
            throw error;
        }
    }

    private parseRepoUrl(repoUrl: string): RepoStructure {
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

    private async fetchRepositoryTree(repoStructure: RepoStructure): Promise<void> {
        try {
            console.log('Fetching repository structure...');
            const { owner, repo, branch } = repoStructure;
            
            // Get the repository tree
            const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
            console.log('Fetching tree from:', treeUrl);
            
            const treeData = await this.httpGet(treeUrl);
            const tree = JSON.parse(treeData);

            if (!tree.tree) {
                throw new Error('Unable to fetch repository structure');
            }

            console.log(`Found ${tree.tree.length} files in repository`);

            // Filter and fetch relevant files
            const relevantFiles = tree.tree.filter((item: any) => 
                item.type === 'blob' && 
                this.isRelevantFile(item.path)
            );

            console.log(`Found ${relevantFiles.length} relevant files for API analysis`);
            const promises = relevantFiles.map(async (item: any, index: number) => {
                await new Promise(resolve => setTimeout(resolve, index * 100));
                
                try {
                    const content = await this.fetchFileContent(owner, repo, branch, item.path);
                    if (content) {
                        this.fileContents.push({
                            path: item.path,
                            content
                        });
                        console.log(`Successfully fetched: ${item.path}`);
                    }
                } catch (error) {
                    console.error(`Error fetching ${item.path}:`, error);
                }
            });

            await Promise.all(promises);
            console.log(`Successfully processed ${this.fileContents.length} files`);

        } catch (error) {
            console.error('Error in fetchRepositoryTree:', error);
            throw error;
        }
    }

    private async fetchFileContent(
        owner: string, 
        repo: string, 
        branch: string, 
        filePath: string
    ): Promise<string> {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        return this.httpGet(rawUrl);
    }

    private httpGet(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'OpenAPI-Generator',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else if (res.statusCode === 404) {
                        reject(new Error(`File not found: ${url}`));
                    } else if (res.statusCode === 403) {
                        reject(new Error('Rate limit exceeded. Please try again later.'));
                    } else {
                        reject(new Error(`HTTP Status ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });
        });
    }

    private isRelevantFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const isRelevantExt = this.relevantExtensions.some(relevantExt => 
            filePath.toLowerCase().endsWith(relevantExt)
        );
        
        // Additional checks for API-related files
        const isApiFile = filePath.toLowerCase().includes('api') || 
                         filePath.toLowerCase().includes('route') ||
                         filePath.toLowerCase().includes('controller');
        
        return isRelevantExt || isApiFile;
    }

    private async generateOpenAPISpec(): Promise<string> {
        console.log('Generating OpenAPI specification using ChatGPT...');
    
        try {
            // First, analyze code in chunks and collect endpoint information
            const chunks = this.createCodeChunks();
            let endpointAnalysis = '';
    
            for (const chunk of chunks) {
                const analysisResponse = await this.openai.chat.completions.create({
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
    
                endpointAnalysis += analysisResponse.choices[0]?.message?.content + "\n\n";
            }
    
            // Then, generate the OpenAPI spec from the analyzed information
            const response = await this.openai.chat.completions.create({
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
            const yamlSpec = this.cleanAndValidateYaml(
                response.choices[0]?.message?.content || ''
            );
    
            return yamlSpec;
    
        } catch (error) {
            console.error('Error in OpenAI API call:', error);
            throw error;
        }
    }
    
    private cleanAndValidateYaml(content: string): string {
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
                lineWidth: -1  // Disable line wrapping
            });
    
            return regeneratedYaml;
        } catch (error) {
            console.error('YAML validation failed:', error);
            throw new Error('Failed to generate a valid OpenAPI specification');
        }
    }
    
    private createCodeChunks(): string[] {
        const MAX_CHUNK_SIZE = 6000; // Tokens, approximate
        const chunks: string[] = [];
        let currentChunk = '';
        let currentSize = 0;
    
        // Sort files to prioritize controllers and routes
        const sortedFiles = [...this.fileContents].sort((a, b) => {
            const isController = (path: string) => 
                path.includes('controller') || 
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

    private async saveOpenAPISpec(spec: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = `openapi-spec-${timestamp}.yaml`;
        
        await fs.writeFile(outputPath, spec, 'utf8');
        console.log(`OpenAPI specification saved to ${outputPath}`);
    }
}

export { OpenAPIGenerator };