"""Shared pytest fixtures. `client` gives each test function its own throwaway
SQLite file so DB-touching tests don't see each other's rows or the
developer's real finnews.db."""
import os
import tempfile

import pytest


@pytest.fixture()
def client():
    db_path = tempfile.mktemp(suffix=".db")
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    # These modules bind DATABASE_URL at import time (config reads the env
    # var; database builds its engine from config's value and a fresh
    # declarative Base; models registers its tables against that Base; main
    # wires its `Depends(get_db)` to database's session factory) -- so all
    # four must be re-executed, in that order, after the env var above is
    # set, for every test. Reload if already imported (a later test), plain
    # import if not (the first test in the session) -- reloading a module
    # that was never imported yet would re-run it twice back to back and
    # double-register the SQLAlchemy models against the same metadata.
    import importlib
    import sys

    for modname in ["app.config", "app.database", "app.models", "app.main"]:
        if modname in sys.modules:
            importlib.reload(sys.modules[modname])
        else:
            importlib.import_module(modname)

    database = sys.modules["app.database"]
    main = sys.modules["app.main"]

    database.init_db()
    from fastapi.testclient import TestClient

    with TestClient(main.app) as c:
        c.db_session_local = database.SessionLocal
        yield c

    database.engine.dispose()
    if os.path.exists(db_path):
        os.remove(db_path)
