import axios from 'axios';
import { config } from '../config/env';
import { AppError } from '../utils/errors';

const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  modelId?: string;
  // Для ControlNet, чтобы сохранять консистентность персонажа
  characterImageId?: string | null; 
}

interface GenerationResult {
    generationId: string;
    imageId: string | null;
    url: string | null;
}

// Асинхронная функция, которая "опрашивает" API Leonardo, пока не получит готовый результат
async function pollForResult(generationId: string): Promise<GenerationResult> {
    const MAX_ATTEMPTS = 20;
    const RETRY_INTERVAL = 3000; // 3 секунды

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));

        try {
            const response = await axios.get(`${LEONARDO_API_URL}/generations/${generationId}`, {
                headers: { 'Authorization': `Bearer ${config.leonardoApiKey}` }
            });

            const data = response.data?.generations_by_pk;
            if (data?.status === 'COMPLETE') {
                const image = data.generated_images?.[0];
                if (!image) {
                    throw new Error('Generation completed but no images were returned.');
                }
                return { generationId, imageId: image.id, url: image.url };
            }
            if (data?.status === 'FAILED') {
                throw new AppError(`Leonardo generation ${generationId} failed.`, 500);
            }
        } catch (error) {
            console.error(`Error polling Leonardo generation ${generationId}:`, error);
            throw new AppError('Failed to check generation status from Leonardo AI.', 500);
        }
    }
    throw new AppError(`Leonardo generation ${generationId} timed out.`, 504); // Gateway Timeout
}

export async function generateImage(params: GenerateImageParams): Promise<GenerationResult> {
    if (!config.leonardoApiKey) {
        throw new AppError('Leonardo API key is not configured.', 500);
    }

    const payload: any = {
        height: params.height || 768,
        width: params.width || 768,
        prompt: params.prompt,
        modelId: params.modelId || config.leonardoModelId || 'aa77f04e-3eec-4034-9c07-d0f619684628', // Kino XL
        num_images: 1,
        alchemy: true,
        presetStyle: 'CINEMATIC',
    };

    // Если передан ID изображения персонажа, включаем ControlNet
    if (params.characterImageId) {
        payload.controlnets = [{
            initImageId: params.characterImageId,
            initImageType: "GENERATED",
            preprocessorId: 133, // ID препроцессора для "Character Reference"
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
    
        // Ждем готовый результат
        return await pollForResult(generationId);
    } catch (error: any) {
        console.error('Error calling Leonardo API:', error.response?.data || error.message);
        throw new AppError('Failed to communicate with Leonardo AI.', 500);
    }
}
