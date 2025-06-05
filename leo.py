#!/usr/bin/env python3
import os
import requests
import time
import json
from pathlib import Path

# ——— КОНФИГУРАЦИЯ ———
API_KEY   = "3147ce22-4d50-45de-943d-31004bfc1426"
BASE_URL  = "https://cloud.leonardo.ai/api/rest/v1"
MODEL_ID  = "aa77f04e-3eec-4034-9c07-d0f619684628"  # Kino XL поддерживает ControlNet
IMG_SIZE  = 768

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept":        "application/json",
    "Content-Type":  "application/json"
}

def wait_ready(gen_id: str, interval: int = 3) -> tuple[str, str]:
    url = f"{BASE_URL}/generations/{gen_id}"
    while True:
        data   = requests.get(url, headers=HEADERS).json().get("generations_by_pk", {})
        status = data.get("status")
        if status == "COMPLETE":
            img = data["generated_images"][0]
            return img["id"], img["url"]
        if status in {"FAILED", "CANCELLED"}:
            raise RuntimeError(f"Generation {gen_id} ended with {status}")
        time.sleep(interval)

def create_image(prompt: str, hero_id: str | None = None) -> tuple[str, str]:
    payload = {
        "height":     IMG_SIZE,
        "width":      IMG_SIZE,
        "modelId":    MODEL_ID,
        "prompt":     prompt,
        "num_images": 1,
        "alchemy":    True
    }
    if hero_id:
        payload["controlnets"] = [{
            "initImageId":   hero_id,
            "initImageType": "GENERATED",
            "preprocessorId": 133,  # Character Reference
            "strengthType":  "Mid"
        }]

    resp = requests.post(f"{BASE_URL}/generations", headers=HEADERS, json=payload).json()
    job = resp.get("sdGenerationJob") or {}
    gen_id = job.get("generationId")
    if not gen_id:
        raise RuntimeError("Leonardo API error:\n" + json.dumps(resp, indent=2, ensure_ascii=False))
    return wait_ready(gen_id)

def main() -> None:
    hero_prompt = (
        "cartoon-style full-body portrait of a whimsical heroine explorer "
        "wearing mismatched long socks, bright hair, big freckles, playful expression, "
        "dynamic pose, cinematic wide-angle shot, environment visible"
    )
    scenes = [
        "dynamic action shot of the same heroine galloping on a horse inside a modern shopping mall, shop windows all around, wide-angle cinematic composition",
        "cinematic full-body action shot of the same heroine battling a green dragon amid a mosaic-tiled bathhouse, water splashes flying, dramatic lighting, ultra-detailed",
        "epic space scene of the same heroine soaring through space aboard the spaceship ‘42’, spacesuit details visible, stars and galaxies in the background, dynamic composition"
    ]

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    # 1) создаём героя
    print("⏳ Генерируем героя…")
    hero_id, hero_url = create_image(hero_prompt)
    print(f"✅ HERO_ID = {hero_id}\n   → {hero_url}")

    # 2) сюжетные сцены
    for i, prompt in enumerate(scenes, start=1):
        print(f"⏳ Генерируем сцену {i}…")
        _, url = create_image(prompt, hero_id)
        path = output_dir / f"scene_{i}.jpg"
        path.write_bytes(requests.get(url).content)
        print(f"✅ Scene {i}: {url}")

    print("🎉 Всё готово — проверьте папку output/")

if __name__ == "__main__":
    main()