"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStoryImage = exports.generateImage = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';
const generateImage = async (params) => {
    try {
        // Check if API key is available
        if (!env_1.config.leonardoApiKey) {
            throw new Error('Leonardo API key is not configured');
        }
        const { prompt, negativePrompt = '', width = 512, height = 512, modelId = env_1.config.leonardoModelId, numImages = 1, guidanceScale = 7, scheduler = 'LEONARDO', numInferenceSteps = 30, presetStyle = 'LEONARDO', } = params;
        // Start generation
        const generationResponse = await axios_1.default.post(`${LEONARDO_API_URL}/generations`, {
            height,
            width,
            prompt: {
                prompt,
                negativePrompt,
            },
            modelId,
            num_images: numImages,
            guidance_scale: guidanceScale,
            scheduler,
            num_inference_steps: numInferenceSteps,
            presetStyle,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env_1.config.leonardoApiKey}`,
            },
        });
        const generationId = generationResponse.data.sdGenerationJob.generationId;
        // Poll for result
        let imageUrl = null;
        let attempts = 0;
        const maxAttempts = 10;
        while (!imageUrl && attempts < maxAttempts) {
            attempts++;
            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, 3000));
            const statusResponse = await axios_1.default.get(`${LEONARDO_API_URL}/generations/${generationId}`, {
                headers: {
                    'Authorization': `Bearer ${env_1.config.leonardoApiKey}`,
                },
            });
            const generation = statusResponse.data.generations_by_pk;
            if (generation.status === 'COMPLETE' && generation.generated_images?.length > 0) {
                imageUrl = generation.generated_images[0].url;
                break;
            }
            else if (generation.status === 'FAILED') {
                throw new Error('Image generation failed');
            }
        }
        if (!imageUrl) {
            throw new Error('Image generation timed out');
        }
        return {
            url: imageUrl,
            generationId,
        };
    }
    catch (error) {
        console.error('Error generating image with Leonardo:', error);
        throw new Error('Failed to generate image');
    }
};
exports.generateImage = generateImage;
const generateStoryImage = async (storyText, style = 'fantasy') => {
    const prompt = `Create an illustration for a children's educational story. Style: ${style}. Story context: ${storyText.substring(0, 500)}`;
    return (0, exports.generateImage)({
        prompt,
        negativePrompt: 'text, watermark, signature, low quality, blurry, distorted, extra limbs, extra fingers, deformed face',
        width: 768,
        height: 512,
        numImages: 1,
        presetStyle: style.toUpperCase(),
    });
};
exports.generateStoryImage = generateStoryImage;
