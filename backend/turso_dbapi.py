"""DB-API 2.0 adapter for Turso via HTTP Pipeline API — no native extensions."""
import json
import urllib.request
import base64

apilevel = "2.0"
threadsafety = 1
paramstyle = "qmark"

_TRANSACTION_STMTS = frozenset(["BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT", "RELEASE"])


def _make_arg(v):
    if v is None:
        return {"type": "null", "value": None}
    if isinstance(v, bool):
        return {"type": "integer", "value": str(int(v))}
    if isinstance(v, int):
        return {"type": "integer", "value": str(v)}
    if isinstance(v, float):
        return {"type": "float", "value": str(v)}
    if isinstance(v, bytes):
        return {"type": "blob", "base64": base64.b64encode(v).decode()}
    return {"type": "text", "value": str(v)}


class Cursor:
    description = None
    rowcount = -1
    lastrowid = None

    def __init__(self, connection):
        self._conn = connection
        self._rows = []
        self._idx = 0

    def execute(self, sql, parameters=()):
        first_word = sql.strip().upper().split()[0] if sql.strip() else ""
        if first_word in _TRANSACTION_STMTS:
            self._rows = []
            self.description = None
            self.rowcount = -1
            return

        stmt = {"sql": sql, "args": [_make_arg(p) for p in (parameters or [])]}
        try:
            result = self._conn._execute_pipeline([
                {"type": "execute", "stmt": stmt},
                {"type": "close"},
            ])
            self._process(result["results"][0])
        except Exception:
            if "PRAGMA" in sql.upper():
                self._rows = []
                self.description = None
                self.rowcount = 0
            else:
                raise

    def _process(self, result):
        if result.get("type") == "error":
            msg = result.get("error", {}).get("message", "Turso error")
            raise Exception(msg)
        res = result.get("response", {}).get("result", {})
        cols = res.get("cols", [])
        rows = res.get("rows", [])
        self.description = (
            [(c["name"], None, None, None, None, None, None) for c in cols] if cols else None
        )
        self._rows = []
        for row in rows:
            processed = []
            for v in row:
                t = v.get("type")
                val = v.get("value")
                if t == "null":
                    processed.append(None)
                elif t == "integer":
                    processed.append(int(val))
                elif t == "float":
                    processed.append(float(val))
                elif t == "blob":
                    processed.append(base64.b64decode(v.get("base64", "")))
                else:
                    processed.append(val)
            self._rows.append(tuple(processed))
        self.rowcount = res.get("affected_row_count", len(self._rows))
        lir = res.get("last_insert_rowid")
        self.lastrowid = int(lir) if lir is not None else None
        self._idx = 0

    def fetchall(self):
        rows = self._rows[self._idx:]
        self._idx = len(self._rows)
        return rows

    def fetchone(self):
        if self._idx >= len(self._rows):
            return None
        row = self._rows[self._idx]
        self._idx += 1
        return row

    def fetchmany(self, size=1):
        rows = self._rows[self._idx:self._idx + size]
        self._idx += len(rows)
        return rows

    def close(self):
        pass

    def __iter__(self):
        return iter(self._rows[self._idx:])

    def executemany(self, sql, seq_of_params):
        for params in seq_of_params:
            self.execute(sql, params)

    def setinputsizes(self, sizes):
        pass

    def setoutputsize(self, size, column=None):
        pass


class Connection:
    closed = False
    isolation_level = ""

    def __init__(self, db_url, auth_token):
        host = db_url.replace("libsql://", "").replace("https://", "").rstrip("/")
        self._pipeline_url = f"https://{host}/v2/pipeline"
        self._auth_token = auth_token

    def _execute_pipeline(self, requests_list):
        body = json.dumps({"requests": requests_list}).encode()
        req = urllib.request.Request(
            self._pipeline_url,
            data=body,
            headers={
                "Authorization": f"Bearer {self._auth_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())

    def cursor(self):
        return Cursor(self)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        self.closed = True

    def in_transaction(self):
        return False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def connect(db_url, auth_token=""):
    return Connection(db_url, auth_token)
