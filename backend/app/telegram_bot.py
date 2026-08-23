"""The fptn telegram bot, run as a background thread inside this API process
instead of as a separate service. Reuses vpn_store/server_store, so it goes
through the same locked file writes as the REST API.
"""

from __future__ import annotations

import asyncio
import logging
import threading

from telegram import BotCommand, ReplyKeyboardRemove, Update
from telegram.constants import ParseMode
from telegram.error import BadRequest
from telegram.ext import Application, CallbackContext, CommandHandler, MessageHandler, filters

from app.config import settings as config
from app.deps import bot_settings_store, server_store, vpn_store
from app.vpn_token import build_access_link, build_token, generate_password

logger = logging.getLogger("fptn_admin.bot")

_MESSAGES = {
    "en": {
        "status_registered": "🎉✨ You have successfully registered! 🎉",
        "status_reset": "🔑 Your token has been reset! 🔑",
        "info": "🌐 You can download the client from https://storage.googleapis.com/fptn.org/index.html",
        "click_to_copy": "📋💾 Tap the **token below** to copy it and paste it into the app! ⬇️",
        "support_info": "You can support our small hobby project on [Boosty](https://boosty.to/fptn) by "
        "donating to help cover server costs. ❤️❤️❤️",
        "support_benefits": "_Sponsors enjoy unlimited speed, access to more servers, and can optionally have "
        "their names featured in our VPN clients' credits. More details in our Telegram chat _ "
        "https://t.me/fptn\\_project ",
    },
    "ru": {
        "status_registered": "🎉✨ Вы успешно зарегистрированы! 🎉",
        "status_reset": "🔑 Ваш токен был сброшен!🔑",
        "info": "🌐 Клиент можно скачать с https://storage.googleapis.com/fptn.org/index.html",
        "click_to_copy": "📋💾 Нажмите на **токен ниже**, чтобы скопировать и вставите его в приложение! ⬇️",
        "support_info": "Вы можете поддержать наш небольшой хобби-проект на [Boosty](https://boosty.to/fptn), "
        "сделав донат для оплаты серверов. ❤️❤️❤️",
        "support_benefits": "_Спонсорам мы убираем лимиты скорости, предоставляем доступ к большему числу "
        "серверов и, по желанию, отображаем их ники в списке благодарностей прямо в наших VPN-клиентах. "
        "Подробнее — в нашем Telegram-чате _ https://t.me/fptn\\_project ",
    },
}


def _language(update: Update) -> str:
    code = update.message.from_user.language_code or "en"
    return code if code in _MESSAGES else "en"


async def _reply(update: Update, text: str, **kwargs) -> None:
    """Reply with Markdown, falling back to plain text if it doesn't parse
    (e.g. an admin-edited welcome message with an unbalanced `_`/`*`/`` ` ``) —
    better than silently dropping the reply."""
    try:
        await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN, **kwargs)
    except BadRequest as exc:
        logger.warning("Markdown reply failed (%s), retrying as plain text.", exc)
        await update.message.reply_text(text, **kwargs)


async def _start(update: Update, _: CallbackContext) -> None:
    data = bot_settings_store.get()
    welcome = data.welcome_message_en if _language(update) == "en" else data.welcome_message_ru
    await _reply(
        update,
        welcome,
        disable_web_page_preview=True,
        reply_markup=ReplyKeyboardRemove(),
    )


async def _get_access_token(update: Update, _: CallbackContext) -> None:
    messages = _MESSAGES[_language(update)]
    username = f"user{update.message.from_user.id}"
    data = bot_settings_store.get()
    password = generate_password()

    rec = vpn_store.get(username)
    if rec is None:
        rec = vpn_store.create(username, password, data.max_user_speed_limit, False)
        status_message = messages["status_registered"]
    else:
        rec = vpn_store.set_password(username, password)
        status_message = messages["status_reset"]

    servers = server_store.list()
    token = build_token(
        service_name=data.service_name,
        username=username,
        password=password,
        is_premium=rec.is_premium,
        regular=servers["regular"],
        premium=servers["premium"],
        censored=servers["censored"],
    )
    link = build_access_link(token, config.enable_brotli_compression)

    await _reply(
        update,
        f"{status_message}\n\n"
        f"{messages['info']}\n\n"
        f"{messages['click_to_copy']}\n\n"
        f"`{link}` \n\n{messages['support_info']} \n{messages['support_benefits']}",
        disable_web_page_preview=True,
    )


async def _post_init(application: Application) -> None:
    """Registers the "/" command menu shown by Telegram clients — a separate
    Bot API call, independent of add_handler()."""
    await application.bot.set_my_commands(
        [
            BotCommand("start", "Start"),
            BotCommand("token", "Get a VPN token"),
        ]
    )


class BotRunner:
    """Starts/stops the bot's polling loop in its own thread."""

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._application: Application | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._lock = threading.Lock()

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        with self._lock:
            if self.running:
                return
            token = bot_settings_store.get().telegram_token
            if not token:
                logger.warning("Bot enabled but no telegram token is set; not starting.")
                return
            self._thread = threading.Thread(target=self._run, args=(token,), daemon=True)
            self._thread.start()

    def stop(self) -> None:
        with self._lock:
            application = self._application
            loop = self._loop
            thread = self._thread
        if application is not None and loop is not None:
            # stop_running() needs a running loop, so it has to run on the bot's own thread.
            loop.call_soon_threadsafe(application.stop_running)
        if thread is not None:
            thread.join(timeout=10)
        with self._lock:
            self._thread = None
            self._application = None
            self._loop = None

    def _run(self, token: str) -> None:
        # get_event_loop() only auto-creates a loop on the main thread, so make one here.
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        self._loop = loop
        application = Application.builder().token(token).post_init(_post_init).build()
        application.add_handler(CommandHandler("start", _start))
        application.add_handler(CommandHandler("token", _get_access_token))
        application.add_handler(MessageHandler(filters.TEXT & filters.Regex("Get access file"), _start))
        self._application = application
        logger.info("Telegram bot started polling.")
        try:
            application.run_polling(stop_signals=None)
        finally:
            logger.info("Telegram bot stopped polling.")


bot_runner = BotRunner()
