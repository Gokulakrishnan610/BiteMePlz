# Package init. WebSocket consumers are optional and imported by ASGI when Channels is installed.
try:
    import channels  # type: ignore
    from .consumers import StockConsumer  # noqa: F401
except Exception:
    # Channels not installed; skip importing consumers.
    pass
 