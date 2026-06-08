import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createEmail } from "./services/gmailService";
import { createGoogleDoc, shareGoogleDoc } from "./services/docsService";
import { getTeamEmails } from "./db/database";

const server = new McpServer({
  name: "distribution-mcp-server",
  version: "1.0.0",
});

// Tool: create_email
server.tool(
  "create_email",
  "Creates and sends an email via Gmail API",
  {
    email_subject: z.string().describe("Subject of the email"),
    email_body: z.string().describe("HTML body of the email"),
    recipient_list: z.array(z.string()).describe("List of recipient email addresses"),
    cc_list: z.array(z.string()).optional().describe("Optional CC list"),
    bcc_list: z.array(z.string()).optional().describe("Optional BCC list"),
  },
  async ({ email_subject, email_body, recipient_list, cc_list = [], bcc_list = [] }) => {
    try {
      const result = await createEmail(email_subject, email_body, recipient_list, cc_list, bcc_list);
      return {
        content: [{ type: "text", text: `Email sent successfully. ID: ${result.id}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to send email: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: create_google_doc
server.tool(
  "create_google_doc",
  "Creates a Google Doc with provided content",
  {
    document_title: z.string().describe("Title of the Google Doc"),
    document_content: z.string().describe("Text content to insert into the document"),
    folder_id: z.string().optional().describe("Optional Google Drive folder ID to place the document in"),
  },
  async ({ document_title, document_content, folder_id }) => {
    try {
      const result = await createGoogleDoc(document_title, document_content, folder_id);
      return {
        content: [{ 
          type: "text", 
          text: `Document created successfully.\nID: ${result.documentId}\nURL: ${result.documentUrl}` 
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to create document: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: share_google_doc
server.tool(
  "share_google_doc",
  "Shares a Google Doc with a list of emails",
  {
    document_id: z.string().describe("The Google Doc ID"),
    email_list: z.array(z.string()).describe("List of emails to share with"),
    permission_type: z.enum(["reader", "commenter", "writer"]).describe("Permission type"),
  },
  async ({ document_id, email_list, permission_type }) => {
    try {
      await shareGoogleDoc(document_id, email_list, permission_type);
      return {
        content: [{ type: "text", text: `Document shared successfully with ${email_list.length} users.` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to share document: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: send_report
server.tool(
  "send_report",
  "Composite tool: Creates a Google Doc, shares it, and emails the link",
  {
    title: z.string().describe("Title of the report (used for Doc and Email)"),
    content: z.string().describe("AI generated content for the report"),
    recipients: z.array(z.string()).optional().describe("List of specific emails"),
    team_name: z.string().optional().describe("Name of the team from distribution lists (e.g. 'product')"),
  },
  async ({ title, content, recipients = [], team_name }) => {
    try {
      // 1. Resolve emails
      let allEmails = [...recipients];
      if (team_name) {
        const teamEmails = getTeamEmails(team_name);
        allEmails = allEmails.concat(teamEmails);
      }
      
      // Deduplicate emails
      allEmails = [...new Set(allEmails)];
      
      if (allEmails.length === 0) {
        throw new Error("No recipients specified or team not found.");
      }

      // 2. Create Google Doc
      const docResult = await createGoogleDoc(title, content);

      // 3. Share Google Doc
      await shareGoogleDoc(docResult.documentId, allEmails, "reader");

      // 4. Generate & Send Email
      const emailBody = `
        <h1>${title}</h1>
        <p>A new report has been generated and shared with you.</p>
        <p><a href="${docResult.documentUrl}">Click here to view the document</a></p>
      `;
      
      await createEmail(title, emailBody, allEmails);

      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            status: "success",
            document_url: docResult.documentUrl,
            emails_sent: allEmails.length
          }, null, 2)
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to send report: ${error.message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Distribution MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
