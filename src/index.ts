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

        // Render a form to submit the spec to Swagger Editor
        res.send(`
            <html>
                <body>
                    <form id="swagger-form" action="https://editor.swagger.io/" method="POST" target="_blank">
                        <input type="hidden" name="yaml" value="${encodeURIComponent(spec)}" />
                        <button type="submit">Open Swagger Editor</button>
                    </form>
                    <script>
                        document.getElementById('swagger-form').submit();
                    </script>
                </body>
            </html>
        `);
    } catch (error: any) {
        console.error('Failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/status', (req: any, res: any) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});