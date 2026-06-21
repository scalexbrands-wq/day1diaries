// ============================================================
// Voice-story transcription via AWS Transcribe.
//
// Why Transcribe over a 3rd-party API: it's the only option that needs
// zero new credentials/vendor accounts given this project's existing AWS
// setup — it reads straight from the S3 bucket the audio was already
// uploaded to, using the same ECS task role already granted s3:GetObject
// on that bucket. The only new requirement is a small IAM grant for
// transcribe:StartTranscriptionJob/GetTranscriptionJob (see the Terraform
// diff proposed alongside this change — NOT applied automatically).
//
// Transcribe has no webhook, so this polls. It's called fire-and-forget
// right after a voice story is inserted and never throws — any failure
// just leaves transcript_status='failed' so the UI can offer "type it
// yourself" instead of spinning forever.
// ============================================================

const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require('@aws-sdk/client-transcribe')
const { pool } = require('../db/pool')
const s3 = require('../utils/s3')

const client = new TranscribeClient({ region: process.env.AWS_REGION })

function isConfigured() {
  return s3.isConfigured()
}

const POLL_INTERVAL_MS = 5000
const MAX_POLLS = 36 // ~3 minutes — matches the recording length cap

async function markStatus(storyId, status) {
  await pool.query('UPDATE stories SET transcript_status = $1 WHERE id = $2', [status, storyId]).catch(err => {
    console.error('[transcription] failed to update transcript_status (non-fatal):', err.message)
  })
}

async function transcribeStoryAudio(storyId, audioUrl) {
  if (!isConfigured()) {
    console.warn('[transcription] AWS not configured — leaving transcript_status=pending for story', storyId)
    return
  }

  const jobName = `story-${storyId}-${Date.now()}`
  try {
    await client.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: audioUrl },
      MediaFormat: 'webm',
      LanguageCode: 'en-US',
    }))
  } catch (err) {
    console.error('[transcription] StartTranscriptionJob failed (non-fatal):', err.message)
    await markStatus(storyId, 'failed')
    return
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    try {
      const { TranscriptionJob } = await client.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }))
      const status = TranscriptionJob?.TranscriptionJobStatus

      if (status === 'COMPLETED') {
        const transcriptUri = TranscriptionJob.Transcript?.TranscriptFileUri
        const resultRes = await fetch(transcriptUri)
        const resultJson = await resultRes.json()
        const text = resultJson?.results?.transcripts?.[0]?.transcript || ''
        await pool.query(
          `UPDATE stories SET transcript = $1, content = $1, transcript_status = 'ready' WHERE id = $2`,
          [text, storyId]
        )
        return
      }
      if (status === 'FAILED') {
        await markStatus(storyId, 'failed')
        return
      }
      // IN_PROGRESS / QUEUED — keep polling
    } catch (err) {
      console.error('[transcription] poll error (non-fatal):', err.message)
    }
  }

  // Timed out — fail rather than leaving the story stuck "pending" forever.
  await markStatus(storyId, 'failed')
}

module.exports = { transcribeStoryAudio, isConfigured }
