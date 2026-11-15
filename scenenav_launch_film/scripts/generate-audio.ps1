Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $PSScriptRoot
$audio = Join-Path $root 'public\audio'
New-Item -ItemType Directory -Force $audio | Out-Null

$clips = @(
  @{ name='vo-hook.wav'; seconds=8; text='When positioning signals disappear, the Earth does not. Its visible structure remains.' },
  @{ name='vo-problem.wav'; seconds=9; text='SceneNav AI compares two aerial views of the same terrain: different scale, orientation, and time. What remains is visual evidence.' },
  @{ name='vo-technology.wav'; seconds=12; text='ORB and SIFT find distinctive keypoints. Candidate correspondences are tested. RANSAC discards outliers, retaining geometric agreement in image space.' },
  @{ name='vo-transformation.wav'; seconds=11; text='A homography maps the query plane into the reference raster, revealing a four-corner footprint in pixel space.' },
  @{ name='vo-intelligence.wav'; seconds=10; text='Scale, dispersion, inlier consistency, and conditioning inform reliability. The confidence index is an uncalibrated heuristic, not location probability.' },
  @{ name='vo-pipeline.wav'; seconds=8; text='Features. Matching. RANSAC. Homography. Footprint. Reliability.' },
  @{ name='vo-brand.wav'; seconds=7; text='SceneNav AI. Visual intelligence. Spatial understanding. A research prototype.' }
)

foreach ($clip in $clips) {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.Rate = if ($clip.name -in @('vo-pipeline.wav', 'vo-brand.wav')) { 2 } else { 1 }
  $synth.Volume = 100
  $synth.SetOutputToWaveFile((Join-Path $audio $clip.name))
  $synth.Speak($clip.text)
  $synth.Dispose()
}

$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$filter = '[0:a]volume=0.035,lowpass=f=380[a0];[1:a]volume=0.045,lowpass=f=720[a1];[2:a]volume=0.018,lowpass=f=1600[a2];[a0][a1][a2]amix=inputs=3:normalize=0,afade=t=in:st=0:d=3,afade=t=out:st=61:d=4,alimiter=limit=0.8[out]'
& $ffmpeg -y -f lavfi -i 'sine=frequency=49:sample_rate=48000:duration=65' -f lavfi -i 'sine=frequency=98:sample_rate=48000:duration=65' -f lavfi -i 'anoisesrc=color=pink:sample_rate=48000:amplitude=0.7:duration=65' -filter_complex $filter -map '[out]' -c:a pcm_s16le (Join-Path $audio 'original-score.wav')
