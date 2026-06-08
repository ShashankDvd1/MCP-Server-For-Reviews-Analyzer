import { docs, drive } from './googleAuth';

export async function createGoogleDoc(title: string, content: string, folderId?: string) {
  // Create a blank document
  const createRes = await docs.documents.create({
    requestBody: {
      title,
    },
  });

  const documentId = createRes.data.documentId!;

  // If folderId is provided, move the file in Drive
  if (folderId) {
    const file = await drive.files.get({
      fileId: documentId,
      fields: 'parents',
    });
    const previousParents = file.data.parents?.join(',') || '';
    await drive.files.update({
      fileId: documentId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents',
    });
  }

  // Insert content into the document
  if (content) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text: content,
            },
          },
        ],
      },
    });
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

export async function shareGoogleDoc(documentId: string, emails: string[], role: 'reader' | 'commenter' | 'writer') {
  const permissions = [];
  
  for (const email of emails) {
    const res = await drive.permissions.create({
      fileId: documentId,
      sendNotificationEmail: false, // We'll send our own custom email
      requestBody: {
        type: 'user',
        role,
        emailAddress: email,
      },
    });
    permissions.push(res.data);
  }

  return permissions;
}
