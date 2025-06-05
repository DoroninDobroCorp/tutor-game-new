import axios from 'axios';
import { config } from '../config/env';

const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  modelId?: string;
  numImages?: number;
  guidanceScale?: number;
  scheduler?: string;
  numInferenceSteps?: number;
  presetStyle?: string;
}

export const generateImage = async (params: GenerateImageParams) => {
  try {
    const {
      prompt,
      negativePrompt = '',
      width = 512,
      height = 512,
      modelId = config.leonardo.modelId,
      numImages = 1,
      guidanceScale = 7,
      scheduler = 'LEONARDO',
      numInferenceSteps = 30,
      presetStyle = 'LEONARDO',
    } = params;

    // Start generation
    const generationResponse = await axios.post(
      `${LEONARDO_API_URL}/generations`, 
      {
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
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.leonardo.apiKey}`,
        },
      }
    );

    const generationId = generationResponse.data.sdGenerationJob.generationId;
    
    // Poll for result
    let imageUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!imageUrl && attempts < maxAttempts) {
      attempts++;
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await axios.get(
        `${LEONARDO_API_URL}/generations/${generationId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.leonardo.apiKey}`,
          },
        }
      );
      
      const generation = statusResponse.data.generations_by_pk;
      
      if (generation.status === 'COMPLETE' && generation.generated_images?.length > 0) {
        imageUrl = generation.generated_images[0].url;
        break;
      } else if (generation.status === 'FAILED') {
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
    
  } catch (error) {
    console.error('Error generating image with Leonardo:', error);
    throw new Error('Failed to generate image');
  }
};

export const generateStoryImage = async (storyText: string, style: string = 'fantasy') => {
  const prompt = `Create an illustration for a children's educational story. Style: ${style}. Story context: ${storyText.substring(0, 500)}`;
  
  return generateImage({
    prompt,
    negativePrompt: 'text, watermark, signature, low quality, blurry, distorted, extra limbs, extra fingers, deformed face',
    width: 768,
    height: 512,
    numImages: 1,
    presetStyle: style.toUpperCase(),
  });
};
