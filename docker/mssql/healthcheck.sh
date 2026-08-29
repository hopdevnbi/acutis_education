#!/usr/bin/env bash
set -euo pipefail

if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then
  exec /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -Q "SELECT 1"
fi

if [[ -x /opt/mssql-tools/bin/sqlcmd ]]; then
  exec /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -Q "SELECT 1"
fi

echo "sqlcmd was not found for the MSSQL health check." >&2
exit 1
