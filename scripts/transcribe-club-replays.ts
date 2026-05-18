import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Carregar .env.local manualmente
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0 && !key.startsWith('#')) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function downloadFile(url: string, outputPath: string) {
  console.log(`Baixando: ${url}`);
  execSync(`curl -sL -o "${outputPath}" "${url}"`, { stdio: 'pipe' });
  const stats = fs.statSync(outputPath);
  if (stats.size < 1024) {
    const content = fs.readFileSync(outputPath, 'utf-8');
    throw new Error(`B2 retornou erro: ${content}`);
  }
  console.log(`Download concluído: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

function extractAudio(videoPath: string, audioPath: string) {
  console.log('Extraindo áudio com ffmpeg...');
  // Converter pra WAV mono 16kHz (ideal pro Whisper)
  execSync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${audioPath}" 2>&1 | tail -3`, {
    stdio: 'pipe'
  });
  const stats = fs.statSync(audioPath);
  console.log(`Áudio extraído: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

function transcribeWithWhisper(audioPath: string) {
  console.log('Transcrevendo com Whisper local...');

  const script = `
from faster_whisper import WhisperModel
model = WhisperModel("Systran/faster-distil-whisper-large-v3")
segments, info = model.transcribe("${audioPath}", language="pt", beam_size=5)
text = " ".join([s.text for s in segments])
print(text)
`;

  fs.writeFileSync(path.join(__dirname, 'transcribe.py'), script);

  const result = execSync(`python3 ${path.join(__dirname, 'transcribe.py')}`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'inherit']
  });

  fs.unlinkSync(path.join(__dirname, 'transcribe.py'));
  return result.trim();
}

async function extractInfoWithGemini(transcription: string) {
  console.log('Extraindo informações com Gemini...');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    { text: `Você é um assistente que extrai informações de transcrições de aulas de SEO.
Analise a transcrição abaixo e retorne APENAS um JSON válido com:
- site_analyzed: domínio do site analisado (ex: "lojaexemplo.com.br") - pode ser null se não mencionar
- niche: nicho do site (ex: "E-commerce de Roupas", "SaaS B2B") - pode ser null
- duration: duração aproximada da aula em minutos (número inteiro)
- highlights: array com 3-5 pontos principais/recomendações da análise

Retorne SOMENTE o JSON, sem markdown, sem explicações.

Transcrição:
${transcription.slice(0, 100000)}`
    }
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Resposta inválida do Gemini');

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  console.log('=== Transcrição de Replays do Club (TESTE - 1 vídeo) ===\n');

  // Buscar APENAS 1 replay pra teste
  const { data: replays, error } = await supabase
    .from('club_replays')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar replays:', error);
    return;
  }

  if (!replays || replays.length === 0) {
    console.log('Nenhum replay encontrado!');
    return;
  }

  console.log(`Processando: ${replays[0].title}\n`);

  // Criar pasta temp
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const replay = replays[0];

  try {
    // Baixar vídeo
    const videoPath = path.join(tempDir, `${replay.id}.mp4`);
    await downloadFile(replay.video_url, videoPath);

    // Extrair áudio
    const audioPath = path.join(tempDir, `${replay.id}.wav`);
    extractAudio(videoPath, audioPath);

    // Transcrever com Whisper local
    const transcription = await transcribeWithWhisper(audioPath);
    console.log(`\nTranscrição (primeiros 300 chars):\n${transcription.slice(0, 300)}...\n`);

    // Extrair informações com Gemini
    const info = await extractInfoWithGemini(transcription);
    console.log('Informações extraídas:', info);

    // Atualizar no banco
    const { error: updateError } = await supabase
      .from('club_replays')
      .update({
        site_analyzed: info.site_analyzed,
        niche: info.niche,
        duration: info.duration ? `${info.duration}min` : null,
        highlights: info.highlights || [],
      })
      .eq('id', replay.id);

    if (updateError) {
      console.error('Erro ao atualizar:', updateError);
    } else {
      console.log('✓ Replay atualizado com sucesso!');
    }

    // Limpar arquivos
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);

  } catch (err) {
    console.error('Erro ao processar replay:', err);
  }

  // Limpar pasta temp
  fs.rmSync(tempDir, { recursive: true });

  console.log('\n=== Processo concluído ===');
}

main().catch(console.error);
