$ErrorActionPreference = 'Stop'

# Scenario B: create a focused SaaS MVP project (same budget + industry as scenario A)
$fb = @{ projectName='Focused SaaS Inking MVP'; industrySector='Technology'; businessModel='SaaS'; targetMarket='Indian SMBs'; budget=1800000; description='A focused, single-feature SaaS MVP that provides basic invoicing for freelancers and very small businesses. A 3-person team (two full-stack devs + one designer) building it over 4 months using serverless cloud functions and a hosted database. No hardware, no physical inventory, no manufacturing - just a lightweight web app with a single paid plan.' } | ConvertTo-Json -Depth 5
$pb = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/api/projects?userId=10' -Method Post -ContentType 'application/json' -Body $fb -TimeoutSec 30
$pidB = $pb.projectId
Write-Host "PROJECT_B_ID=$pidB"

# Scenario A: overambitious IoT platform (PID 16 already exists)
Write-Host '===== SCENARIO A: overambitious IoT ====='
$a = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/api/projects/16/risk-analysis' -Method Post -TimeoutSec 180
$a | ConvertTo-Json -Depth 10 | Out-File -FilePath 'C:\CodeZone\Infosys\Smart_Failure_Detection_With_ML\ba-a.json' -Encoding ascii
Write-Host "A: financialRiskScore=$($a.financialRiskScore) mlOnly=$($a.mlOnlyFinancialRisk) ba_score=$($a.budgetAdequacy.score)"

# Scenario B: focused SaaS (sequential - no concurrency)
Write-Host '===== SCENARIO B: focused SaaS ====='
$b = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/projects/$pidB/risk-analysis" -Method Post -TimeoutSec 180
$b | ConvertTo-Json -Depth 10 | Out-File -FilePath 'C:\CodeZone\Infosys\Smart_Failure_Detection_With_ML\ba-b.json' -Encoding ascii
Write-Host "B: financialRiskScore=$($b.financialRiskScore) mlOnly=$($b.mlOnlyFinancialRisk) ba_score=$($b.budgetAdequacy.score)"

# Comparison
$sa = [double]$a.financialRiskScore
$sb = [double]$b.financialRiskScore
$ma = [double]$a.mlOnlyFinancialRisk
$mb = [double]$b.mlOnlyFinancialRisk
Write-Host ''
Write-Host '===== COMPARISON ====='
Write-Host "A blended=$sa  mlOnly=$ma  ba_score=$($a.budgetAdequacy.score)  riskLevel=$($a.riskLevel)"
Write-Host "B blended=$sb  mlOnly=$mb  ba_score=$($b.budgetAdequacy.score)  riskLevel=$($b.riskLevel)"
Write-Host "same budget+industry -> ML identical=$($ma -eq $mb)"
Write-Host "blended differ=$($sa -ne $sb)  |  A_higher=$($sa -gt $sb)"
Write-Host "A fr_reason excerpt: $($a.risk_breakdown.financial_risk.reason)"
Write-Host "B fr_reason excerpt: $($b.risk_breakdown.financial_risk.reason)"
