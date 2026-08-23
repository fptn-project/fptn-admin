import asyncio
import base64
import json
import threading
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock

from telegram.error import BadRequest

import app.telegram_bot as telegram_bot_module
from app.deps import bot_settings_store, server_store, vpn_store
from app.telegram_bot import _get_access_token, _language, _reply, _start, bot_runner


def _decode(token: str) -> dict:
    payload = token[len("fptn:") :]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.b64decode(payload))


def _token_from_reply(text: str) -> str:
    return text.split("`")[1]


def _make_update(user_id: int = 100, language_code: str | None = "en"):
    message = SimpleNamespace(
        from_user=SimpleNamespace(id=user_id, language_code=language_code),
        reply_text=AsyncMock(),
    )
    return SimpleNamespace(message=message)


def _add_server(kind: str, name: str, host: str) -> None:
    server_store.add(kind, {"name": name, "host": host, "md5_fingerprint": "", "port": 443, "ping": 0})


def test_language_known_code_is_used_as_is():
    assert _language(_make_update(language_code="ru")) == "ru"


def test_language_unknown_code_defaults_to_en():
    assert _language(_make_update(language_code="fr")) == "en"


def test_language_missing_defaults_to_en():
    assert _language(_make_update(language_code=None)) == "en"


def test_reply_sends_markdown_when_it_parses():
    update = _make_update()
    asyncio.run(_reply(update, "hello", disable_web_page_preview=True))

    update.message.reply_text.assert_awaited_once()
    args, kwargs = update.message.reply_text.call_args
    assert args[0] == "hello"
    assert kwargs["parse_mode"] is not None
    assert kwargs["disable_web_page_preview"] is True


def test_reply_falls_back_to_plain_text_on_bad_markdown():
    update = _make_update()
    update.message.reply_text = AsyncMock(side_effect=[BadRequest("Can't parse entities"), None])

    asyncio.run(_reply(update, "broken _markdown", disable_web_page_preview=True))

    assert update.message.reply_text.await_count == 2
    first_kwargs = update.message.reply_text.await_args_list[0].kwargs
    second_kwargs = update.message.reply_text.await_args_list[1].kwargs
    assert "parse_mode" in first_kwargs
    assert "parse_mode" not in second_kwargs
    # non-markdown kwargs still get through on the fallback call
    assert second_kwargs["disable_web_page_preview"] is True


def test_start_sends_the_welcome_message_for_the_user_language():
    bot_settings_store.update(welcome_message_en="Hi EN", welcome_message_ru="Привет RU")

    update = _make_update(language_code="ru")
    asyncio.run(_start(update, None))

    update.message.reply_text.assert_awaited_once()
    assert update.message.reply_text.call_args[0][0] == "Привет RU"


def test_start_falls_back_to_english_for_an_unsupported_language():
    bot_settings_store.update(welcome_message_en="Hi EN", welcome_message_ru="Привет RU")

    update = _make_update(language_code="de")
    asyncio.run(_start(update, None))

    assert update.message.reply_text.call_args[0][0] == "Hi EN"


def test_get_access_token_registers_a_new_user():
    _add_server("regular", "S1", "1.2.3.4")

    update = _make_update(user_id=555)
    asyncio.run(_get_access_token(update, None))

    rec = vpn_store.get("user555")
    assert rec is not None
    assert rec.is_premium is False

    text = update.message.reply_text.call_args[0][0]
    assert "registered" in text.lower()
    data = _decode(_token_from_reply(text))
    assert data["username"] == "user555"
    assert [s["name"] for s in data["servers"]] == ["S1"]


def test_get_access_token_resets_an_existing_user_with_a_new_password():
    _add_server("regular", "S1", "1.2.3.4")
    update = _make_update(user_id=777)

    asyncio.run(_get_access_token(update, None))
    first_token = _token_from_reply(update.message.reply_text.call_args[0][0])

    update.message.reply_text.reset_mock()
    asyncio.run(_get_access_token(update, None))
    second_text = update.message.reply_text.call_args[0][0]
    second_token = _token_from_reply(second_text)

    assert "reset" in second_text.lower()
    assert _decode(first_token)["password"] != _decode(second_token)["password"]


def test_get_access_token_premium_user_gets_premium_servers():
    _add_server("regular", "R", "1.1.1.1")
    _add_server("premium", "P", "2.2.2.2")
    vpn_store.create("user888", "initial-pw", 30, True)

    update = _make_update(user_id=888)
    asyncio.run(_get_access_token(update, None))

    text = update.message.reply_text.call_args[0][0]
    data = _decode(_token_from_reply(text))
    assert {s["name"] for s in data["servers"]} == {"R", "P"}


def test_bot_runner_start_without_a_token_does_not_start_a_thread():
    bot_settings_store.update(telegram_token="")

    bot_runner.start()

    assert bot_runner.running is False


def test_bot_runner_stop_when_not_running_is_a_noop():
    bot_runner.stop()

    assert bot_runner.running is False


def test_bot_runner_sets_an_event_loop_for_its_thread(monkeypatch):
    """run_polling() calls asyncio.get_event_loop(), which raises outside
    the main thread unless BotRunner sets one up first."""
    ran = threading.Event()
    captured: dict[str, object] = {}

    class FakeApplication:
        def add_handler(self, *_args, **_kwargs):
            pass

        def run_polling(self, **_kwargs):
            captured["loop"] = asyncio.get_event_loop()
            ran.set()

        def stop_running(self):
            pass

    class FakeBuilder:
        def token(self, _token):
            return self

        def post_init(self, _callback):
            return self

        def build(self):
            return FakeApplication()

    monkeypatch.setattr(telegram_bot_module.Application, "builder", staticmethod(FakeBuilder))
    bot_settings_store.update(telegram_token="fake-token")

    bot_runner.start()
    try:
        assert ran.wait(timeout=2)
        assert isinstance(captured.get("loop"), asyncio.AbstractEventLoop)
    finally:
        bot_runner.stop()


def test_bot_runner_stop_works_when_called_from_a_different_thread(monkeypatch):
    """stop_running() needs asyncio.get_running_loop(), so it only works on
    the bot's own thread — stop() must schedule it there, not call it inline."""

    class FakeApplication:
        def add_handler(self, *_args, **_kwargs):
            pass

        def run_polling(self, **_kwargs):
            asyncio.get_event_loop().run_forever()

        def stop_running(self):
            asyncio.get_running_loop().stop()

    class FakeBuilder:
        def token(self, _token):
            return self

        def post_init(self, _callback):
            return self

        def build(self):
            return FakeApplication()

    monkeypatch.setattr(telegram_bot_module.Application, "builder", staticmethod(FakeBuilder))
    bot_settings_store.update(telegram_token="fake-token")

    bot_runner.start()
    for _ in range(100):
        if bot_runner.running:
            break
        time.sleep(0.01)
    assert bot_runner.running is True

    bot_runner.stop()  # called from this (the test's) thread, not the bot's

    assert bot_runner.running is False
