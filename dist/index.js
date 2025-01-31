"use strict";
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
const openapi_generator_1 = require("./openapi-generator");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const repoUrl = req.query.url;
    if (!repoUrl) {
        return res.status(400).json({ error: 'Repository URL is required as a query parameter' });
    }
    const generator = new openapi_generator_1.OpenAPIGenerator();
    try {
        console.log('Starting generation process...');
        const spec = yield generator.generateFromRepo(repoUrl);
        console.log('Generation complete!');
        // Create the Swagger Editor URL with the spec
        const yamlString = encodeURIComponent(spec);
        const swaggerEditorUrl = `https://editor.swagger.io/?yaml=${yamlString}`;
        // Redirect to Swagger Editor
        res.redirect(swaggerEditorUrl);
    }
    catch (error) {
        console.error('Failed:', error.message);
        res.status(500).json({ error: error.message });
    }
}));
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
