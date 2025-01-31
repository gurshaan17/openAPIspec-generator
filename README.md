# OpenAPIspec Generator

## Overview

OpenAPIspec Generator is a Node.js application that generates OpenAPI specifications from code repositories. It utilizes OpenAI's GPT-4 model to analyze the code and extract API endpoint information, which is then formatted into a valid OpenAPI 3.0 specification in YAML format. The application also provides a web interface for users to input their GitHub repository URLs and receive the generated OpenAPI documentation.

## Features

- Generate OpenAPI specifications from GitHub repositories.
- Analyze code to extract API endpoints, methods, parameters, and request/response structures.
- Redirect users to Swagger Editor for easy visualization of the generated API documentation.
- Supports TypeScript and JavaScript files with relevant extensions.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/gurshaan17/openApispec-generator.git
   cd file-processor
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:

   ```plaintext
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

1. Start the server:

   ```bash
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000`.

3. Enter the GitHub repository URL in the query parameter `url`. For example:

   ```
   http://localhost:3000/?url=https://github.com/owner/repo
   ```

4. The application will process the repository and redirect you to the Swagger Editor with the generated OpenAPI specification.

## Project Structure

- `src/`: Contains the source code for the application.
  - `index.ts`: Entry point for the application.
  - `openapi-generator.ts`: Contains the logic for generating OpenAPI specifications.
- `dist/`: Compiled JavaScript files.
- `.gitignore`: Specifies files and directories to ignore in Git.
- `package.json`: Contains project metadata and dependencies.
- `tsconfig.json`: TypeScript configuration file.

