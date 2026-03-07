import client from './client';

export const documentApi = {
  list: async () => {
    const { data } = await client.get('/documents/me');
    return data.data || data;
  },

  submit: async (payload: { type: string; url: string }) => {
    const { data } = await client.post('/documents/me', payload);
    return data.data || data;
  },

  uploadFile: async (documentType: string, fileUri: string): Promise<string> => {
    const filename = fileUri.split('/').pop() || 'document.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('document', { uri: fileUri, name: filename, type: mimeType } as any);
    formData.append('documentType', documentType);

    const { data } = await client.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (data.data || data).url as string;
  },
};
