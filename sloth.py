# -*- coding: utf-8 -*-

import google.generativeai as genai
import os
import subprocess
import time
import re
import platform # Импортируем для определения ОС

# --- НАСТРОЙКИ ---
API_KEY = 'AIzaSyBlW_LcWYEYivEhPo7Q7Lc_vmNu-wtI-wM'
CONTEXT_SCRIPT = 'AskGpt.py'
CONTEXT_FILE = 'message_1.txt'
MODEL_NAME = "gemini-2.5-pro"

# --- КОНФИГУРАЦИЯ МОДЕЛИ ---
print(f"ЛОГ: Начинаю конфигурацию. Модель: {MODEL_NAME}")
try:
    genai.configure(api_key=API_KEY)
    print("ЛОГ: API сконфигурировано успешно.")
except Exception as e:
    print(f"ЛОГ: ОШИБКА конфигурации API: {e}")
    exit()

generation_config = {
    "temperature": 0.7, # Для генерации команд лучше сделать модель более предсказуемой
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 8192, # Команды sed не должны быть очень длинными
}
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]
model = genai.GenerativeModel(model_name=MODEL_NAME,
                              generation_config=generation_config,
                              safety_settings=safety_settings)
print(f"ЛОГ: Модель '{MODEL_NAME}' создана.")

# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

def get_project_context():
    """Собирает контекст проекта, запуская внешний скрипт."""
    print("ЛОГ: Обновляю контекст проекта...")
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        script_to_run_path = os.path.join(script_dir, CONTEXT_SCRIPT)
        context_file_path = os.path.join(script_dir, CONTEXT_FILE)

        if os.path.exists(context_file_path):
            os.remove(context_file_path)
        
        subprocess.run(['python3', script_to_run_path], check=True, capture_output=True, text=True, encoding='utf-8')
        
        with open(context_file_path, 'r', encoding='utf-8') as f:
            context_data = f.read()
        print("ЛОГ: Контекст успешно обновлен.")
        return context_data
    except Exception as e:
        print(f"ЛОГ: КРИТИЧЕСКАЯ ОШИБКА в get_project_context: {e}")
        return None

def extract_todo_block(text):
    """Извлекает текст между TODO START и TODO FINISH."""
    match = re.search(r"TODO START\s*(.*?)\s*TODO FINISH", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None

def apply_sed_commands(sed_commands):
    """Выполняет последовательность команд sed."""
    print("ЛОГ: Вход в функцию apply_sed_commands().")
    try:
        # Определяем, какая версия sed используется (macOS/BSD vs Linux/GNU)
        is_macos = platform.system() == "Darwin"
        
        commands = sed_commands.strip().split('\n')
        for command in commands:
            command = command.strip()
            if not command.startswith("sed"):
                continue

            # Адаптация для macOS, который требует расширение для backup-файла с флагом -i
            if is_macos:
                command = command.replace("sed -i ", "sed -i '.bak' ")
            
            print(f"ЛОГ: Выполняю команду: {command}")
            # Выполняем команду в оболочке. `shell=True` здесь необходимо.
            result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
            if result.stderr:
                print(f"ПРЕДУПРЕЖДЕНИЕ: STDERR для команды '{command}': {result.stderr}")
        
        # Удаляем временные файлы бэкапа на macOS
        if is_macos:
            print("ЛОГ: Очищаю временные .bak файлы на macOS...")
            cleanup_command = f"find . -name '*.bak' -delete"
            subprocess.run(cleanup_command, shell=True)

        print("ЛОГ: Все команды sed успешно выполнены.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ЛОГ: КРИТИЧЕСКАЯ ОШИБКА при выполнении команды sed: '{e.cmd}'")
        print(f"ЛОГ: STDOUT: {e.stdout}")
        print(f"ЛОГ: STDERR: {e.stderr}")
        return False
    except Exception as e:
        print(f"ЛОГ: Непредвиденная ОШИБКА в apply_sed_commands: {e}")
        return False

# --- ГЛАВНЫЙ ЦИКЛ ---

def main():
    """Основная логика программы."""
    print("ЛОГ: Вход в функцию main().")
    initial_task = input("Привет, друже! Опиши задачу или вставь текст ошибки:\n> ")
    if not initial_task:
        print("Задача не может быть пустой. Выход.")
        return

    project_context = get_project_context()
    if not project_context: return

    prompt_template = """
Ты — AI-инженер, который использует утилиту `sed` для внесения правок в код.
Вот полный контекст моего проекта:
--- КОНТЕКСТ ПРОЕКТА ---
{context}
--- КОНЕЦ КОНТЕКСТА ---

Моя основная задача: {task}

Проанализируй задачу и код. Сгенерируй последовательность команд `sed` для решения задачи.

ВАЖНО:
1.  Твой ответ должен содержать ТОЛЬКО команды `sed` внутри блока TODO START / TODO FINISH.
2.  Формат команды: `sed -i 's/ЧТО_ИСКАТЬ/НА_ЧТО_ЗАМЕНИТЬ/g' ПУТЬ/К/ФАЙЛУ`.
3.  Заменяй целые строки или блоки кода, чтобы избежать проблем с отступами.
4.  Если в строке для поиска или замены есть символы `/`, `&` или `\`, их нужно экранировать обратным слэшем (`\\`).
5.  Не стремись к идеалу, решай только основную задачу.

Если задача уже решена, напиши только одно слово: "ГОТОВО".
"""
    review_prompt_template = """
Я выполнил твои `sed` команды. Вот обновленный код проекта:
--- КОНТЕКСТ ПРОЕКТА (ОБНОВЛЕННЫЙ) ---
{context}
--- КОНЕЦ КОНТЕКСТА ---

Напоминаю первоначальную задачу: {task}

Проверь еще раз. Задача решена?
- Если да, и критических ошибок нет, напиши только "ГОТОВО".
- Если нет, предоставь НОВЫЙ набор `sed` команд в блоке TODO для исправления.
"""

    current_prompt = prompt_template.format(context=project_context, task=initial_task)

    for iteration_count in range(1, 11):
        print(f"\n--- АВТОМАТИЧЕСКАЯ ИТЕРАЦИЯ {iteration_count} ---")
        
        try:
            print("ЛОГ: Отправляю запрос в модель...")
            response = model.generate_content(current_prompt, request_options={'timeout': 600})
            answer = response.text
        except Exception as e:
            print(f"ЛОГ: ОШИБКА при запросе к API: {e}"); break
        
        print("\nПОЛУЧЕН ОТВЕТ МОДЕЛИ:\n" + "="*20 + f"\n{answer}\n" + "="*20)

        if "ГОТОВО" in answer.upper():
            print("\n🎉 МОДЕЛЬ СЧИТАЕТ, ЧТО ЗАДАЧА ВЫПОЛНЕНА! 🎉"); break

        sed_commands = extract_todo_block(answer)
        if not sed_commands:
            print("\nМОДЕЛЬ не предоставила блок TODO. Работа остановлена."); break
            
        print("\nНайдены следующие `sed` команды для автоматического применения:\n" + "-"*20 + f"\n{sed_commands}\n" + "-"*20)
        
        if not apply_sed_commands(sed_commands):
            print("Не удалось применить `sed` команды. Работа остановлена."); break
        
        print("\nЛОГ: Команды успешно применены. Обновляю контекст для следующей итерации.")
        time.sleep(2)
        
        project_context = get_project_context()
        if not project_context: print("Не удалось обновить контекст. Работа остановлена."); break

        current_prompt = review_prompt_template.format(context=project_context, task=initial_task)
    else:
        print("\nДостигнут лимит итераций. Работа остановлена.")


if __name__ == "__main__":
    main()
    print("\nСкрипт завершил работу.")