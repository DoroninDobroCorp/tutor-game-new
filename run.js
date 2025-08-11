// run.js — Использует Imagen 3: сначала генерирует персонажа, затем вставляет его в три сцены

require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const { GoogleAuth } = require("google-auth-library");

// Переменные из .env
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION   = process.env.LOCATION || "europe-west2";

// Эндпоинты: для генерации («generate») и для кастомизации («capability»)
const ENDPOINT_GENERATE   =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-002:predict`;
const ENDPOINT_CAPABILITY =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-capability-001:predict`;

if (!PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Ошибочка: проверь .env — нужны GCP_PROJECT_ID и GOOGLE_APPLICATION_CREDENTIALS");
  process.exit(1);
}

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

async function doPredict(endpoint, body) {
  const client = await auth.getClient();
  const token  = await client.getAccessToken();
  const { data } = await axios.post(endpoint, body, {
    headers: { Authorization: `Bearer ${token.token || token}`, "Content-Type": "application/json" },
    timeout: 180000,
  });
  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) {
    console.error("[RAI] predictions=", JSON.stringify(data.predictions, null, 2));
    throw new Error("Нет картинки в ответе");
  }
  return Buffer.from(pred.bytesBase64Encoded, "base64");
}

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

(async () => {
  // 1) Генерируем базовый персонаж по описанию (без референса)
  const basePrompt = `
Cartoon adult character for a math adventure game; friendly, smart, slightly mysterious; clearly an adult (grown-up), not a child; proportions and features indicative of an adult.
Clean line art, bright colors, neutral background.`;

  console.log("[1/2] Генерирую базового персонажа (model: generate-002)...");
  const baseBuf = await doPredict(ENDPOINT_GENERATE, {
    instances: [{ prompt: basePrompt }],
    parameters: {
      sampleCount: 1,
      language: "en",
      includeRaiReason: true,
      includeSafetyAttributes: true,
      addWatermark: true
    }
  });
  fs.writeFileSync("character_base.png", baseBuf);
  console.log("OK: character_base.png");

  // Формируем объект для subject customization
  const subjectRef = {
    referenceType: "REFERENCE_TYPE_SUBJECT",
    referenceId: 1,
    referenceImage: { bytesBase64Encoded: b64(baseBuf) },
    subjectImageConfig: {
      subjectType: "SUBJECT_TYPE_DEFAULT",
      subjectDescription: "adult cartoon character"
    }
  };

  // 2) Вставляем персонажа в разные сцены через capability
  console.log("[2/2] Генерирую сцены с тем же персонажем (model: capability-001)...");
  const scenes = [
    ["scene_cafe.png",   "sitting in a cozy cafe, daytime light, clean line art [1]"],
    ["scene_jungle.png", "in tropical jungle under rain, adventurous scene [1]"],
    ["scene_space.png",  "aboard a futuristic space station, sci-fi style, neon lights [1]"],
  ];

  for (const [out, prompt] of scenes) {
    const buf = await doPredict(ENDPOINT_CAPABILITY, {
      instances: [{ prompt, referenceImages: [subjectRef] }],
      parameters: {
        sampleCount: 1,
        language: "en",
        includeRaiReason: true,
        includeSafetyAttributes: true,
        addWatermark: true
      }
    });
    fs.writeFileSync(out, buf);
    console.log("OK:", out);
  }

  console.log("Готово! Сгенерированы:",
    "character_base.png, scene_cafe.png, scene_jungle.png, scene_space.png");
})().catch(e => {
  console.error("Ошибка:", e?.response?.data || e);
  process.exit(1);
});