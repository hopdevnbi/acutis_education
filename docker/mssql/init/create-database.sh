#!/usr/bin/env bash
set -euo pipefail

MSSQL_HOST="${MSSQL_HOST:-mssql}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
MSSQL_SA_PASSWORD="${MSSQL_SA_PASSWORD:?MSSQL_SA_PASSWORD is required}"

if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then
  SQLCMD=(/opt/mssql-tools18/bin/sqlcmd -C)
elif [[ -x /opt/mssql-tools/bin/sqlcmd ]]; then
  SQLCMD=(/opt/mssql-tools/bin/sqlcmd)
else
  echo "sqlcmd was not found in the MSSQL tools paths." >&2
  exit 1
fi

wait_for_sql_server() {
  local attempt=1
  local max_attempts=30

  while [[ "${attempt}" -le "${max_attempts}" ]]; do
    if "${SQLCMD[@]}" -S "${MSSQL_HOST}" -U sa -P "${MSSQL_SA_PASSWORD}" -Q "SELECT 1" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    attempt=$((attempt + 1))
  done

  echo "MSSQL did not become ready in time." >&2
  return 1
}

create_database_if_missing() {
  "${SQLCMD[@]}" -S "${MSSQL_HOST}" -U sa -P "${MSSQL_SA_PASSWORD}" -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${DB_NAME}') CREATE DATABASE [${DB_NAME}];"
}

wait_for_sql_server
create_database_if_missing

echo "Database '${DB_NAME}' is ready."
