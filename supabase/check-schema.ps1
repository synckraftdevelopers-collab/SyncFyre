$token = $env:SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Set SUPABASE_ACCESS_TOKEN before running this script."
}
$url = "https://api.supabase.com/v1/projects/siycjpmsujcxkvdsfcvq/database/query"
$h = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$sql = "select (select count(*) from information_schema.tables where table_schema='public' and table_name='member_form_configurations') as mfc_exists, (select count(*) from information_schema.columns where table_schema='public' and table_name='users' and column_name='tenant_id') as users_tenant_id, (select count(*) from information_schema.tables where table_schema='public' and table_name='tenants') as tenants_exists, (select count(*) from information_schema.columns where table_schema='public' and table_name='branches' and column_name='tenant_id') as branches_tenant_id"
$b = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json @{ query = $sql }))
(Invoke-RestMethod -Uri $url -Method POST -Headers $h -Body $b) | ConvertTo-Json -Depth 4
