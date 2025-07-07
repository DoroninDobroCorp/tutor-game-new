# -*- coding: utf-8 -*-

import os
import re
import time
import sys
from pathlib import Path
import select

try:
    import pyautogui
    import pyperclip
except ImportError:
    print("Ошибка: Установите библиотеки: pip install pyautogui pyperclip")
    exit()

# --- Конфигурация ---
INTERVAL_SECONDS = 20

def get_target_coordinates() -> tuple[int, int]:
    """
    Интерактивно получает от пользователя координаты для клика.
    """
    print("\n--- ФАЗА НАСТРОЙКИ ---")
    print("Сейчас вам нужно будет указать, куда вставлять текст.")
    for i in range(5, 0, -1):
        print(f"Приготовьтесь... Наведите курсор на поле ввода текста в чате. Запись через {i} сек.", end="\r")
        time.sleep(1)
        
    coords = pyautogui.position()
    print(f"\nКоординаты мыши успешно записаны! X: {coords.x}, Y: {coords.y}      ") # Пробелы в конце для затирания текста
    print("Скрипт будет кликать в эту точку перед каждой отправкой.")
    time.sleep(1) # Небольшая пауза, чтобы пользователь успел прочитать
    return coords

def get_sorted_message_files(folder_path: str) -> list[Path]:
    """
    Находит и сортирует файлы message_n.txt.
    """
    pattern = re.compile(r"^message_(\d+)\.txt$")
    found_files = {}
    for entry in Path(folder_path).iterdir():
        if entry.is_file():
            match = pattern.match(entry.name)
            if match:
                file_number = int(match.group(1))
                found_files[file_number] = entry
    if not found_files:
        return []
    sorted_keys = sorted(found_files.keys())
    return [found_files[key] for key in sorted_keys]

def send_text_via_automation(text: str, coordinates: tuple[int, int]):
    """
    Кликает по координатам, вставляет текст (используя Command+V для macOS) 
    и нажимает Enter. Добавлены паузы для надежности.
    """
    try:
        pyautogui.click(coordinates)
        time.sleep(0.3)
        pyperclip.copy(text)
        time.sleep(0.3)
        pyautogui.hotkey('command', 'v')
        time.sleep(0.3)
        pyautogui.press('enter')
    except Exception as e:
        print(f"\n[ОШИБКА АВТОМАТИЗАЦИИ] Не удалось отправить текст: {e}")
        print("Убедитесь, что у скрипта есть права в 'Настройки -> Конфиденциальность и безопасность -> Универсальный доступ'.")

def wait_with_interrupt(seconds: int):
    """
    Надежная функция ожидания, которая прерывается по нажатию Enter в терминале.
    """
    print(f"Пауза... Переключитесь на это окно и нажмите [ENTER], чтобы отправить немедленно.")
    start_time = time.time()
    while time.time() - start_time < seconds:
        remaining = int(seconds - (time.time() - start_time))
        print(f"  Следующее сообщение через: {remaining} сек  ", end="\r", flush=True)
        rlist, _, _ = select.select([sys.stdin], [], [], 0.1)
        if rlist:
            sys.stdin.readline()
            print("\n[ENTER] нажат! Пропускаю таймер...")
            return
    print("\nВремя вышло. Отправляю следующее сообщение...")

# Основная точка входа в программу
if __name__ == "__main__":
    current_directory = "."
    print("--- Автоматический отправитель сообщений для чата ---")
    
    sorted_files = get_sorted_message_files(current_directory)
    if not sorted_files:
        print(f"\nВ текущей папке не найдено файлов формата 'message_n.txt'.")
        input("Нажмите Enter для выхода.")
        exit()
        
    print(f"\nНайдено и отсортировано файлов: {len(sorted_files)}")
    
    # --- Шаг 1: Получаем координаты ---
    target_coords = get_target_coordinates()
    
    # --- Шаг 2: Сразу начинаем отправку ---
    print("\n--- НАЧИНАЮ ОТПРАВКУ ---")
    # Удален лишний input(), теперь старт происходит автоматически.
    
    total_files = len(sorted_files)
    for i, file_path in enumerate(sorted_files, 1):
        print("="*40)
        print(f"Обработка файла {i}/{total_files}: {file_path.name}")
        
        try:
            content_to_send = file_path.read_text(encoding='utf-8')
            if not content_to_send.strip():
                print("Файл пустой, пропускаю.")
                continue

            print("Отправляю текст...")
            send_text_via_automation(content_to_send, target_coords)
            print("Текст отправлен.")
            
            # Если это не последний файл, делаем паузу
            if i < total_files:
                wait_with_interrupt(INTERVAL_SECONDS)
                
        except Exception as e:
            print(f"Произошла непредвиденная ошибка при обработке файла {file_path.name}: {e}")

    print("\n" + "="*40)
    print("Работа завершена! Все сообщения были отправлены.")
    input("Нажмите Enter для выхода.")