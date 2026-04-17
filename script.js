const BASE_URL = 'https://api.green-api.com';

/**
 * Получает и валидирует параметры подключения из формы.
 * @returns {{ id: string, token: string } | null}
 */
function getCredentials() {
  const id    = document.getElementById('idInstance').value.trim();
  const token = document.getElementById('apiToken').value.trim();

  if (!id || !token) {
    setStatus('error', 'Введите idInstance и ApiTokenInstance');
    setResponse('// Ошибка: заполните поля idInstance и ApiTokenInstance.');
    return null;
  }
  return { id, token };
}

/**
 * Устанавливает состояние индикатора статуса.
 * @param {'ok'|'error'|'loading'|'idle'} state
 * @param {string} text
 */
function setStatus(state, text) {
  const dot  = document.getElementById('statusDot');
  const label = document.getElementById('statusText');
  dot.className = 'status-dot' + (state !== 'idle' ? ' ' + state : '');
  label.textContent = text;
}

/**
 * Отображает ответ в поле вывода.
 * @param {string} text
 */
function setResponse(text) {
  document.getElementById('response').value = text;
}

/**
 * Обновляет метаданные над полем ответа.
 * @param {string} methodName
 */
function setMeta(methodName) {
  const badge = document.getElementById('methodBadge');
  const time  = document.getElementById('responseTime');
  badge.textContent = methodName;
  badge.style.display = 'inline';
  time.textContent = new Date().toLocaleTimeString('ru-RU');
}

/**
 * Переводит кнопку в состояние загрузки или обратно.
 * @param {HTMLButtonElement} btn
 * @param {boolean} isLoading
 * @param {string} originalLabel
 */
function setButtonLoading(btn, isLoading, originalLabel) {
  if (isLoading) {
    btn.dataset.originalLabel = btn.textContent;
    btn.textContent = 'Загрузка...';
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.textContent = originalLabel || btn.dataset.originalLabel;
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/**
 * Переключает видимость поля пароля.
 */
function togglePasswordVisibility() {
  const passwordInput = document.getElementById('apiToken');
  const toggleIcon = document.getElementById('togglePassword');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

/**
 * Извлекает имя файла из URL и проверяет расширение.
 * @param {string} url
 * @returns {string}
 */
function getFileNameFromUrl(url) {
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/');
    let fileName = parts.pop() || 'image.jpg'; // По умолчанию image.jpg

    // Если имя не содержит точки (нет расширения), добавляем .jpg
    if (!fileName.includes('.')) {
        fileName += '.jpg';
    }
    
    return fileName;
  } catch (e) {
    console.error("Ошибка при извлечении имени файла из URL:", e);
    return 'file'; // Возвращаем 'file' в случае ошибки
  }
}

/**
 * Универсальный обработчик вызова методов GREEN-API.
 * @param {string} method - название метода
 * @param {HTMLButtonElement} btn - кнопка-триггер
 */
async function callMethod(method, btn) {
  const creds = getCredentials();
  if (!creds) return;

  const originalLabel = btn.textContent;
  setButtonLoading(btn, true, originalLabel);
  setStatus('loading', 'Выполняется запрос...');
  setResponse('// Ожидание ответа сервера...');

  try {
    let url, options;

    switch (method) {

      case 'getSettings':
        url = `${BASE_URL}/waInstance${creds.id}/getSettings/${creds.token}`;
        options = { method: 'GET' };
        break;

      case 'getStateInstance':
        url = `${BASE_URL}/waInstance${creds.id}/getStateInstance/${creds.token}`;
        options = { method: 'GET' };
        break;

      case 'sendMessage': {
        const phone   = document.getElementById('msgPhone').value.trim();
        const message = document.getElementById('msgText').value.trim();
        if (!phone || !message) {
          throw new Error('Заполните номер получателя и текст сообщения.');
        }
        url = `${BASE_URL}/waInstance${creds.id}/sendMessage/${creds.token}`;
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: `${phone}@c.us`,
            message: message // Используем 'message', как ожидает API
          })
        };
        break;
      }

      case 'sendFileByUrl': {
        const phone   = document.getElementById('filePhone').value.trim();
        const fileUrl = document.getElementById('fileUrl').value.trim();
        const fileNameInput = document.getElementById('fileName');
        
        let fileName = fileNameInput ? fileNameInput.value.trim() : '';
        
        // Если пользователь не ввел имя файла, пытаемся извлечь его из URL
        if (!fileName) {
            fileName = getFileNameFromUrl(fileUrl);
        }

        // Валидация: номер и URL файла обязательны
        if (!phone || !fileUrl) {
          throw new Error('Заполните номер получателя и URL файла.');
        }
        
        url = `${BASE_URL}/waInstance${creds.id}/sendFileByUrl/${creds.token}`;
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId:   `${phone}@c.us`,
            urlFile:  fileUrl,
            fileName: fileName // Передаем fileName (либо введенный, либо извлеченный)
            // УДАЛЕНО: 'typeFile' - этот параметр не принимается API
          })
        };
        break;
      }

      default:
        throw new Error(`Неизвестный метод: ${method}`);
    }

    const response = await fetch(url, options);
    // Пытаемся получить JSON, даже если ответ не OK
    const data = await response.json().catch(() => ({})); // Если не JSON, будет пустой объект

    setMeta(method); // Обновляем метаданные

    if (response.ok) {
      setStatus('ok', `${method} — успешно`);
      setResponse(JSON.stringify(data, null, 2)); // Отображаем успешный ответ
    } else {
      // Если статус не OK, формируем сообщение об ошибке
      let errorMsg = `Ошибка ${response.status} (${response.statusText})`;
      if (data && data.message) {
        errorMsg += `: ${data.message}`;
      }
      setStatus('error', `Ошибка ${response.status}`);
      setResponse(`// ${errorMsg}\n${JSON.stringify(data, null, 2)}`); // Показываем тело ответа с ошибкой
    }

  } catch (err) {
    // Ловим ошибки сети, валидации или те, что мы бросили
    setStatus('error', 'Ошибка выполнения');
    // Формируем сообщение об ошибке для пользователя
    const errorMessage = err.message || 'Неизвестная ошибка';
    setResponse(`// Ошибка:\n${errorMessage}`);
    console.error(`Ошибка в методе ${method}:`, err); // Логируем в консоль для отладки
  } finally {
    // В любом случае, возвращаем кнопку в исходное состояние
    setButtonLoading(btn, false, originalLabel);
  }
}

// --- Обработчики событий ---

document.addEventListener('DOMContentLoaded', () => {
  // Обработчик клика на иконку глаза для переключения пароля
  const toggleIcon = document.getElementById('togglePassword');
  if (toggleIcon) {
    toggleIcon.addEventListener('click', togglePasswordVisibility);
  }

  // Обработчик для клавиши Enter в полях ввода
  document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(input => {
      input.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
              event.preventDefault(); // Предотвращаем стандартное поведение Enter

              // Определяем, какое действие вызвать по Enter
              if (input.id === 'msgPhone' || input.id === 'msgText') {
                  // Находим кнопку sendMessage по ее onclick атрибуту
                  const sendMessageButton = document.querySelector('button[onclick*="sendMessage"]');
                  if (sendMessageButton) callMethod('sendMessage', sendMessageButton);
              } else if (input.id === 'filePhone' || input.id === 'fileUrl' || input.id === 'fileName') {
                   // Находим кнопку sendFileByUrl
                   const sendFileButton = document.querySelector('button[onclick*="sendFileByUrl"]');
                   if (sendFileButton) callMethod('sendFileByUrl', sendFileButton);
              }
              // Для idInstance и apiToken Enter не делает ничего, чтобы не мешать вводу
          }
      });
  });
});