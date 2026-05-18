import { NextRequest, NextResponse } from 'next/server';

const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || '';
const B2_KEY_ID = process.env.B2_KEY_ID || '';
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || '';
const B2_PUBLIC_URL_BASE = process.env.B2_PUBLIC_URL_BASE || '';

/**
 * Upload de vídeo para Backblaze B2
 * Docs: https://backblaze.com/docs/cloud-storage-upload-files-with-the-native-api
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!B2_BUCKET_NAME || !B2_KEY_ID || !B2_APPLICATION_KEY) {
      return NextResponse.json(
        { error: 'Backblaze B2 não configurado. Configure B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME no .env.local' },
        { status: 500 }
      );
    }

    // 1. Autorizar na API da B2
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64')}`,
      },
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.text();
      console.error('[B2 Auth Error]', errorData);
      return NextResponse.json({ error: 'Falha ao autorizar com Backblaze B2' }, { status: 500 });
    }

    const authData = await authResponse.json();
    const { authorizationToken, apiUrl, downloadUrl } = authData;

    // 2. Pegar bucket ID
    const bucketResponse = await fetch('https://api.backblazeb2.com/b2api/v4/b2_list_buckets', {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: B2_KEY_ID,
      }),
    });

    if (!bucketResponse.ok) {
      return NextResponse.json({ error: 'Falha ao listar buckets' }, { status: 500 });
    }

    const bucketData = await bucketResponse.json();
    const bucket = bucketData.buckets.find((b: any) => b.bucketName === B2_BUCKET_NAME);

    if (!bucket) {
      return NextResponse.json(
        { error: `Bucket "${B2_BUCKET_NAME}" não encontrado` },
        { status: 404 }
      );
    }

    const bucketId = bucket.bucketId;

    // 3. Pegar URL de upload
    const uploadUrlResponse = await fetch('https://api.backblazeb2.com/b2api/v4/b2_get_upload_file_url', {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId,
        fileName: file.name,
        contentType: file.type || 'video/mp4',
      }),
    });

    if (!uploadUrlResponse.ok) {
      return NextResponse.json({ error: 'Falha ao obter URL de upload' }, { status: 500 });
    }

    const uploadUrlData = await uploadUrlResponse.json();
    const { uploadUrl, authorizationToken: uploadToken } = uploadUrlData;

    // 4. Fazer upload do arquivo
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadToken,
        'X-Bz-File-Name': file.name,
        'Content-Type': file.type || 'video/mp4',
        'X-Bz-Content-Sha1': 'hex_digits_at_end',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('[B2 Upload Error]', errorData);
      return NextResponse.json({ error: 'Falha ao fazer upload do vídeo' }, { status: 500 });
    }

    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.fileId;
    const fileName = uploadResult.fileName;

    // 5. Retornar URL pública do vídeo
    const publicUrl = `${B2_PUBLIC_URL_BASE}/${B2_BUCKET_NAME}/${fileName}`;

    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      publicUrl,
      message: 'Vídeo enviado com sucesso',
    });
  } catch (error) {
    console.error('[B2 Upload Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido no upload' },
      { status: 500 }
    );
  }
}
