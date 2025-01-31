import { OpenAPIGenerator } from './openapi-generator';
import express from 'express';

const app = express();
const port = 3000;

app.get('/', async (req: any, res: any) => {
    const repoUrl = req.query.url as string;
    
    if (!repoUrl) {
        return res.status(400).json({ error: 'Repository URL is required as a query parameter' });
    }

    const generator = new OpenAPIGenerator();
    try {
        console.log('Starting generation process...');
        const spec = await generator.generateFromRepo(repoUrl);
        console.log('Generation complete!');

        const yamlString = encodeURIComponent(spec);
        const swaggerEditorUrl = `https://editor.swagger.io/?yaml=${yamlString}`;
        
        res.redirect(swaggerEditorUrl);
    } catch (error: any) {
        console.error('Failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});