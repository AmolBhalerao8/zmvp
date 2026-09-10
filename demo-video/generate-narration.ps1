$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$audioDir = Join-Path $root "work\audio"
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

$markdown = Get-Content (Join-Path $root "narration.md") -Raw
$matches = [regex]::Matches(
  $markdown,
  '(?ms)^## (?<number>\d{2}) — (?<title>[^\r\n]+)\r?\n(?<text>.*?)(?=^## |\z)'
)

if ($matches.Count -eq 0) {
  throw "No narration scenes were found."
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 1
$synth.Volume = 100

$preferredVoices = @("Microsoft Aria Desktop", "Microsoft Zira Desktop", "Microsoft David Desktop")
$installed = @($synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
foreach ($voice in $preferredVoices) {
  if ($installed -contains $voice) {
    $synth.SelectVoice($voice)
    break
  }
}

$manifest = @()
foreach ($match in $matches) {
  $number = $match.Groups["number"].Value
  $title = $match.Groups["title"].Value.Trim()
  $text = ($match.Groups["text"].Value -replace '\s+', ' ').Trim()
  $output = Join-Path $audioDir "$number.wav"

  $synth.SetOutputToWaveFile($output)
  $synth.Speak($text)
  $synth.SetOutputToNull()

  $manifest += [ordered]@{
    number = $number
    title = $title
    text = $text
    audio = "work/audio/$number.wav"
  }
}

$synth.Dispose()
$manifest | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $root "work\scenes.json") -Encoding UTF8
Write-Output "Generated $($manifest.Count) narrated scenes."
