import express, { NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { OpenAPIGenerator } from './openapi-generator.js';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', async (req: any, res: any, next: NextFunction) => {
    const repoUrl = req.query.url;
    
    if (!repoUrl) {
        return res.status(400).json({ error: 'Repository URL is required as a query parameter' });
    }

    try {
        console.log('Starting generation process...');
        const generator = new OpenAPIGenerator();
        const spec = await generator.generateFromRepo(repoUrl);
        console.log('Generation complete!');

        // Parse the spec (it should already be a string from the method)
        const swaggerDocument = YAML.parse(spec);
        
        // Serve Swagger UI
        const swaggerSetup = swaggerUi.setup(swaggerDocument);
        
        // Temporarily serve Swagger UI
        app.use('/api-docs', swaggerUi.serve);
        app.get('/api-docs', (req, res) => {
            swaggerSetup(req, res, next);
        });

        // Redirect to Swagger UI
        res.redirect('/api-docs');
    } catch (error: any) {
        console.error('Failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/status', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});