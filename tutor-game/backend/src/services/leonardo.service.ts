import axios from 'axios';
import { config } from '../config/env';
import { AppError } from '../utils/errors';

const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  modelId?: string;
  characterImageId?: string | null;
}

export interface GenerationResult {
    generationId: string;
    imageId: string | null;
    url: string | null;
    status: 'PENDING' | 'COMPLETE' | 'FAILED';
}

export async function startImageGeneration(params: GenerateImageParams): Promise<{ generationId: string }> {
    if (!config.leonardoApiKey) {
        throw new AppError('Leonardo API key is not configured.', 500);
    }

    const payload: any = {
        height: params.height || 768,
        width: params.width || 768,
        prompt: params.prompt,
        modelId: params.modelId || config.leonardoModelId || 'aa77f04e-3eec-4034-9c07-d0f619684628',
        num_images: 1,
        alchemy: true,
        presetStyle: 'CINEMATIC',
    };

    if (params.characterImageId) {
        payload.controlnets = [{
            initImageId: params.characterImageId,
            initImageType: "GENERATED",
            preprocessorId: 133,
            strengthType: "Mid"
        }];
    }

    try {
        const generationResponse = await axios.post(`${LEONARDO_API_URL}/generations`, payload, {
            headers: { 'Authorization': `Bearer ${config.leonardoApiKey}` }
        });

        const generationId = generationResponse.data?.sdGenerationJob?.generationId;
        if (!generationId) {
            console.error('Leonardo API Error Response:', generationResponse.data);
            throw new AppError('Failed to start Leonardo generation job.', 500);
        }
        return { generationId };
    } catch (error: any) {
        console.error('Error calling Leonardo API:', error.response?.data || error.message);
        throw new AppError('Failed to communicate with Leonardo AI.', 500);
    }
}

export async function getGenerationResult(generationId: string): Promise<GenerationResult> {
    if (!config.leonardoApiKey) {
        throw new AppError('Leonardo API key is not configured.', 500);
    }

    try {
        const response = await axios.get(`${LEONARDO_API_URL}/generations/${generationId}`, {
            headers: { 'Authorization': `Bearer ${config.leonardoApiKey}` }
        });

        const data = response.data?.generations_by_pk;
        if (!data) {
            throw new AppError(`Generation ${generationId} not found.`, 404);
        }
        
        if (data.status === 'COMPLETE') {
            const image = data.generated_images?.[0];
            return { 
                generationId, 
                imageId: image?.id || null, 
                url: image?.url || null, 
                status: 'COMPLETE' 
            };
        }
        
        if (data.status === 'FAILED') {
            return { 
                generationId, 
                imageId: null, 
                url: null, 
                status: 'FAILED' 
            };
        }
        
        return { 
            generationId, 
            imageId: null, 
            url: null, 
            status: 'PENDING' 
        };
    } catch (error) {
        console.error(`Error polling Leonardo generation ${generationId}:`, error);
        throw new AppError('Failed to check generation status from Leonardo AI.', 500);
    }
}

// For backward compatibility - now just starts the generation and returns the first status
// Note: This is marked as deprecated and will be removed in future versions
export async function generateImage(params: GenerateImageParams): Promise<GenerationResult> {
    console.warn('generateImage is deprecated. Use startImageGeneration and poll getGenerationResult instead.');
    try {
        const { generationId } = await startImageGeneration(params);
        return { 
            generationId, 
            imageId: null, 
            url: null, 
            status: 'PENDING' 
        };
    } catch (error) {
        console.error('Error in generateImage:', error);
        throw new AppError('Failed to start image generation', 500);
    }
}
