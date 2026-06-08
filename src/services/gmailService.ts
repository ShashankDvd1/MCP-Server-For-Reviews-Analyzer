import { getGoogleAuth, gmail } from './googleAuth';
import nodemailer from 'nodemailer';

export async function createEmail(
  subject: string,
  htmlBody: string,
  recipients: string[],
  ccList: string[] = [],
  bccList: string[] = []
) {
  // Use nodemailer to generate the raw MIME message
  const auth = getGoogleAuth();
  
  // We can just use the standard nodemailer structure and then get the raw string
  const mailOptions = {
    to: recipients.join(', '),
    cc: ccList.join(', '),
    bcc: bccList.join(', '),
    subject: subject,
    html: htmlBody,
    text: htmlBody.replace(/<[^>]*>?/gm, ''), // naive html to text fallback
  };

  const MailComposer = require('nodemailer/lib/mail-composer');
  const mail = new MailComposer(mailOptions);
  const compiled = await mail.compile().build();
  
  const rawMessage = Buffer.from(compiled)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
    },
  });

  return res.data;
}
