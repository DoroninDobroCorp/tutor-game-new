import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import { config } from '../config/env';
import { AppError } from '../utils/errors';

const { gcpProjectId, gcpLocation } = config;

if (!gcpProjectId || !gcpLocation) {
  throw new Error('GCP_PROJECT_ID and LOCATION must be set in the environment variables for Imagen to work.');
}

// Endpoints for Imagen 3 models
const ENDPOINT_GENERATE = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/imagen-3.0-generate-002:predict`;
const ENDPOINT_CAPABILITY = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/imagen-3.0-capability-001:predict`;

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

async function doPredict(endpoint: string, body: object): Promise<Buffer> {
    try {
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const { data } = await axios.post(endpoint, body, {
            headers: {
                Authorization: `Bearer ${token.token}`,
                "Content-Type": "application/json"
            },
            timeout: 180000, // 3 minutes timeout
        });

        const prediction = data.predictions?.[0];
        if (!prediction?.bytesBase64Encoded) {
            console.error("[IMAGEN SERVICE ERROR] RAI block or Empty Prediction. Full response:", JSON.stringify(data, null, 2));
            throw new AppError("Image generation was blocked for safety reasons or returned no content.", 500);
        }
        return Buffer.from(prediction.bytesBase64Encoded, "base64");
    } catch (error: any) {
        // Log detailed error from Axios
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error("Error calling prediction endpoint:", error.response?.data || error);
        throw new AppError(`Failed to communicate with Imagen AI: ${errorMessage}`, 500);
    }
}

/**
 * Generates an image using Imagen 3.
 * - If only a prompt is provided, it generates a new image using the 'generate' model.
 * - If a characterImageBuffer and subjectDescription are also provided, it customizes
 *   the scene with the character using the 'capability' model.
 *
 * @param prompt - The text prompt for the image. Must contain `[1]` if using a character reference.
 * @param characterImageBuffer - Optional buffer of the reference character image.
 * @param subjectDescription - Optional description of the subject for character customization.
 * @returns A Buffer containing the generated PNG image data.
 */
export async function generateImage(
    prompt: string,
    characterImageBuffer?: Buffer,
    subjectDescription?: string
): Promise<Buffer> {
    if (characterImageBuffer && subjectDescription) {
        // --- SCENE GENERATION WITH CHARACTER REFERENCE (capability model) ---
        const subjectRef = {
            referenceType: "REFERENCE_TYPE_SUBJECT",
            referenceId: 1, // The ID must match the marker in the prompt, e.g., [1]
            referenceImage: { bytesBase64Encoded: characterImageBuffer.toString("base64") },
            subjectImageConfig: {
                subjectType: "SUBJECT_TYPE_DEFAULT",
                subjectDescription: subjectDescription,
            },
        };

        const body = {
            instances: [{ prompt, referenceImages: [subjectRef] }],
            parameters: {
                sampleCount: 1,
                language: "en",
                includeRaiReason: true,
                includeSafetyAttributes: true,
                addWatermark: true,
            },
        };

        console.log('[IMAGEN] Calling CAPABILITY endpoint with character reference.');
        return doPredict(ENDPOINT_CAPABILITY, body);

    } else {
        // --- BASE IMAGE/CHARACTER GENERATION (generate model) ---
        const body = {
            instances: [{ prompt }],
            parameters: {
                sampleCount: 1,
                language: "en",
                includeRaiReason: true,
                includeSafetyAttributes: true,
                addWatermark: true,
            },
        };

        console.log('[IMAGEN] Calling GENERATE endpoint for a new image.');
        return doPredict(ENDPOINT_GENERATE, body);
    }
}