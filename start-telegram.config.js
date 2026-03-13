// PM2 конфигурационный файл для запуска сервера и Telegram бота
// разместить файл в папке home
// Команды для работы:
// 1. Остановить все процессы:        pm2 stop 1 && pm2 delete 1
// 2. Запустить все процессы:         pm2 start start-telegram.config.js
// 3. Перезапустить все процессы:     pm2 restart start-telegram.config.js
// 4. Проверить статус:               pm2 status
// 5. Посмотреть логи:                pm2 logs
// 6. Сохранить конфигурацию:         pm2 save
// 7. Настроить автозапуск:           pm2 startup
//
// Быстрый старт:
// pm2 start start-telegram.config.js && pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: 'telegram',
      script: './doctor-telegram/dist/index.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}; 