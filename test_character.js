const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// ——— КОНФИГУРАЦИЯ ———
const LEONARDO_API_KEY = '3147ce22-4d50-45de-943d-31004bfc1426'; // Ваш API ключ
const BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';
const MODEL_ID = 'aa77f04e-3eec-4034-9c07-d0f619684628';  // Kino XL
const IMG_SIZE = 768;

const HEADERS = {
    'Authorization': `Bearer ${LEONARDO_API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
};

// Функция ожидания готовности генерации
async function waitReady(gen_id, interval = 3) {
    const url = `${BASE_URL}/generations/${gen_id}`;
    console.log(`⏳ Ожидаем завершения генерации (ID: ${gen_id})...`);
    while (true) {
        const response = await axios.get(url, { headers: HEADERS });
        const data = response.data?.generations_by_pk || {};
        const status = data.status;

        if (status === 'COMPLETE') {
            console.log('✅ Генерация завершена!');
            const img = data.generated_images[0];
            return { id: img.id, url: img.url };
        }
        if (status === 'FAILED' || status === 'CANCELLED') {
            throw new Error(`Генерация ${gen_id} завершилась со статусом ${status}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
}

// Правильная функция загрузки изображения в 2 этапа
async function uploadImage(filePath) {
    // Этап 1: Получение URL для загрузки
    console.log('--- Этап 1: Инициализация загрузки ---');
    const initResponse = await axios.post(`${BASE_URL}/init-image`, {
        extension: "jpg"
    }, { headers: HEADERS });

    const uploadData = initResponse.data?.uploadInitImage;
    if (!uploadData || !uploadData.id) {
        throw new Error('Не удалось инициализировать загрузку. Ответ API: ' + JSON.stringify(initResponse.data));
    }
    
    const imageId = uploadData.id;
    const uploadUrl = uploadData.url;
    const fields = JSON.parse(uploadData.fields);
    
    console.log(`Получен ID изображения: ${imageId}`);

    // Этап 2: Загрузка файла в хранилище S3
    console.log('--- Этап 2: Загрузка файла в облако ---');
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
    });
    formData.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: { ...formData.getHeaders() },
    });

    if (uploadResponse.status !== 204) {
        throw new Error(`Ошибка при загрузке файла в хранилище. Статус: ${uploadResponse.status}`);
    }

    console.log('✅ Изображение успешно загружено в хранилище!');
    return { imageId: imageId };
}

// Функция для создания сцены с точной настройкой
async function createScene(prompt, imageId, characterWeight) { // Переименовал параметр для ясности
    const payload = {
        height: IMG_SIZE,
        width: IMG_SIZE,
        modelId: MODEL_ID,
        prompt: prompt,
        num_images: 1,
        alchemy: true,
        controlnets: [{
            initImageId: imageId,
            initImageType: 'UPLOADED',
            preprocessorId: 133,  // Character Reference
            // ИСПРАВЛЕНО: API Leonardo ожидает поле 'weight', а не 'strength'
            weight: characterWeight, 
        }],
    };

    console.log('--- Отправка запроса на создание сцены ---');
    console.log('Тело запроса:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(`${BASE_URL}/generations`, payload, { headers: HEADERS });
        const job = response.data?.sdGenerationJob || {};
        const gen_id = job.generationId;

        if (!gen_id) {
            throw new Error('Ошибка API Leonardo:\n' + JSON.stringify(response.data, null, 2));
        }

        return waitReady(gen_id);
    } catch (error) {
        console.error('❌ Ошибка при создании сцены:', error.response?.data || error.message);
        throw error;
    }
}


async function main() {
    const imagePath = path.join(__dirname, '1.jpg');
    
    const characterDescription = "a cute white rabbit character";

    const scenes = [
        `cinematic photo of ${characterDescription} exploring a magical, glowing forest at night, fantasy art, highly detailed`,
        `epic portrait of ${characterDescription} as an astronaut in a detailed space suit, floating in deep space with a nebula in the background, cinematic lighting`,
        `dramatic action shot of ${characterDescription} as a tiny knight in shining armor, bravely facing a huge, sleeping dragon in a cave full of gold, fantasy painting`
    ];

    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    try {
        console.log("⏳ Загружаем изображение персонажа (белый кролик)...");
        const { imageId } = await uploadImage(imagePath);
        
        // --- ГЛАВНЫЙ ПАРАМЕТР ДЛЯ ЭКСПЕРИМЕНТОВ ---
        // Теперь он передается в правильное поле 'weight'
        const weightValue = 1.15; 

        for (let i = 0; i < scenes.length; i++) {
            const prompt = scenes[i];
            console.log(`\n⏳ Генерируем сцену ${i + 1} с весом (weight) ${weightValue}…`);
            const { url: sceneUrl } = await createScene(prompt, imageId, weightValue);
            const imageFilePath = path.join(outputDir, `scene_${i + 1}.jpg`);
            
            console.log(`📥 Скачиваем результат...`);
            const imageBuffer = await axios.get(sceneUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(imageFilePath, imageBuffer.data);
            console.log(`✅ Сцена ${i + 1} сохранена в ${imageFilePath}`);
        }

        console.log("\n🎉 Всё готово — проверьте папку output!");
    } catch (error) {
        console.error("\n❌ Произошла критическая ошибка:", error.message);
    }
}

main();