"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startImageGeneration = startImageGeneration;
exports.uploadImageToLeonardo = uploadImageToLeonardo;
exports.getGenerationResult = getGenerationResult;
exports.generateImage = generateImage;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const form_data_1 = __importDefault(require("form-data"));
const env_1 = require("../config/env");
const errors_1 = require("../utils/errors");
const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';
const HEADERS = {
    'Authorization': `Bearer ${env_1.config.leonardoApiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};
async function startImageGeneration(params) {
    if (!env_1.config.leonardoApiKey) {
        throw new errors_1.AppError('Leonardo API key is not configured.', 500);
    }
    // Формируем базовый payload
    const payload = {
        height: params.height || 768,
        width: params.width || 768,
        prompt: params.prompt,
        modelId: params.modelId || env_1.config.leonardoModelId || 'aa77f04e-3eec-4034-9c07-d0f619684628',
        num_images: 1,
        alchemy: true,
        presetStyle: params.presetStyle || 'ILLUSTRATION',
    };
    // Добавляем controlnets, только если есть ID картинки персонажа
    if (params.characterImageId) {
        payload.controlnets = [{
                initImageId: params.characterImageId,
                initImageType: params.characterImageType || 'UPLOADED',
                preprocessorId: 133, // Character Reference Preprocessor ID
                // Используем 'weight', как в рабочем скрипте. Это правильно.
                weight: params.characterWeight || 1.05,
            }];
    }
    console.log('[LEONARDO.AI] Sending generation payload:', JSON.stringify(payload, null, 2));
    try {
        const generationResponse = await axios_1.default.post(`${LEONARDO_API_URL}/generations`, payload, {
            headers: HEADERS,
        });
        const generationId = generationResponse.data?.sdGenerationJob?.generationId;
        if (!generationId) {
            // Более детальное логгирование ошибки от API
            console.error('Leonardo API Error Response:', generationResponse.data);
            throw new errors_1.AppError(`Failed to start Leonardo generation job. API Response: ${JSON.stringify(generationResponse.data)}`, 500);
        }
        return { generationId };
    }
    catch (error) {
        // Логгируем конкретный ответ от API при ошибке
        console.error('Error calling Leonardo API. Status:', error.response?.status);
        console.error('Error data from Leonardo:', error.response?.data);
        // Эта ошибка будет содержать точный ответ от Leonardo, что поможет в отладке.
        throw new errors_1.AppError(`Failed to communicate with Leonardo AI: ${error.response?.data?.error || error.message}`, 500);
    }
}
async function uploadImageToLeonardo(filePath) {
    if (!env_1.config.leonardoApiKey) {
        throw new errors_1.AppError('Leonardo API key is not configured.', 500);
    }
    // Step 1: Get upload URL
    const initResponse = await axios_1.default.post(`${LEONARDO_API_URL}/init-image`, {
        extension: path_1.default.extname(filePath).substring(1) // "jpg", "png" etc.
    }, { headers: HEADERS });
    const uploadData = initResponse.data?.uploadInitImage;
    if (!uploadData || !uploadData.id) {
        throw new errors_1.AppError('Failed to initialize image upload. API Response: ' + JSON.stringify(initResponse.data), 500);
    }
    const imageId = uploadData.id;
    const uploadUrl = uploadData.url;
    const fields = JSON.parse(uploadData.fields);
    // Step 2: Upload file to storage (S3)
    const formData = new form_data_1.default();
    Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
    });
    formData.append('file', fs_1.default.createReadStream(filePath));
    const uploadResponse = await axios_1.default.post(uploadUrl, formData, {
        headers: { ...formData.getHeaders() },
    });
    if (uploadResponse.status !== 204) {
        throw new Error(`Error uploading file to storage. Status: ${uploadResponse.status}`);
    }
    return { imageId };
}
async function getGenerationResult(generationId) {
    if (!env_1.config.leonardoApiKey) {
        throw new errors_1.AppError('Leonardo API key is not configured.', 500);
    }
    try {
        const response = await axios_1.default.get(`${LEONARDO_API_URL}/generations/${generationId}`, {
            headers: { 'Authorization': `Bearer ${env_1.config.leonardoApiKey}` }
        });
        const data = response.data?.generations_by_pk;
        if (!data) {
            throw new errors_1.AppError(`Generation ${generationId} not found.`, 404);
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
    }
    catch (error) {
        console.error(`Error polling Leonardo generation ${generationId}:`, error);
        throw new errors_1.AppError('Failed to check generation status from Leonardo AI.', 500);
    }
}
// For backward compatibility - now just starts the generation and returns the first status
// Note: This is marked as deprecated and will be removed in future versions
async function generateImage(params) {
    console.warn('generateImage is deprecated. Use startImageGeneration and poll getGenerationResult instead.');
    try {
        const { generationId } = await startImageGeneration(params);
        return {
            generationId,
            imageId: null,
            url: null,
            status: 'PENDING'
        };
    }
    catch (error) {
        console.error('Error in generateImage:', error);
        throw new errors_1.AppError('Failed to start image generation', 500);
    }
}
