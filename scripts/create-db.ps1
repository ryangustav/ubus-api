# Cria o banco ubus via psql
# Uso: .\scripts\create-db.ps1

$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE ubus;"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: verifique se o PostgreSQL está rodando e se a porta 5432 está correta."
    Write-Host "Se o banco ubus já existe, ignore o erro."
}
