# Custom MCP Server for Automated Email & Google Docs Distribution

This is a Model Context Protocol (MCP) server that exposes tools to automatically create Google Docs, share them, and send emails via Gmail. It integrates with Google APIs using OAuth 2.0.

## Tools Provided

1. `create_email`: Sends an email via the Gmail API (supports HTML).
2. `create_google_doc`: Creates a new Google Document and populates it with text.
3. `share_google_doc`: Shares an existing Google Document with a list of emails.
4. `send_report`: A composite tool that takes content, creates a Google Doc, shares it with the specified recipients (or a predefined team), and sends them an email with the link.

## Pre-requisites & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Server
```bash
npm run build
```

### 3. Google OAuth Setup

To use this server, you must have a Google Cloud Project with the required APIs enabled and OAuth credentials generated.

**Step-by-step Guide:**

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Library** and enable the following:
   - Google Docs API
   - Google Drive API
   - Gmail API
4. Navigate to **APIs & Services > OAuth consent screen**:
   - Choose User Type (Internal or External).
   - Fill in the required app information.
   - Add the scopes:
     - `https://www.googleapis.com/auth/documents`
     - `https://www.googleapis.com/auth/drive`
     - `https://www.googleapis.com/auth/gmail.send`
   - Add your own email as a Test User if the app is in Testing mode.
5. Navigate to **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Choose Application type: **Desktop app** or **Web application** (with `http://localhost` as a redirect URI).
   - Click Create. You will get your `Client ID` and `Client Secret`.
6. **Get a Refresh Token:**
   - Since this is a background server, it needs a refresh token to continuously authenticate without user intervention.
   - You can use a tool like [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) to exchange your Client ID and Secret for a Refresh Token using the scopes above.
   - **IMPORTANT:** When you are prompted to log in during this step, **the Google Account you choose to log in with will be the account that sends the emails and creates the Google Docs.** Ensure you select the email address you want these to originate from!

### 4. Environment Variables

Create a `.env` file in the root directory and add your credentials:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### 5. Running the MCP Server

You can start the server locally:
```bash
npm start
```

Or connect it to your LLM client (e.g., Claude Desktop, or your other project) by pointing the client configuration to run:
```bash
node /absolute/path/to/dist/index.js
```

### 6. Storage & Quota Considerations

When the MCP server automatically generates Google Docs, it behaves as follows:
- **Ownership & Storage:** The created documents are saved in the Google Drive of the **admin account** (the account used to generate the `.env` credentials). This means they consume the storage quota of the admin account. However, text-based Google Docs are incredibly lightweight; thousands of reports will only consume a few megabytes.
- **Recipient Storage:** When the server shares the document with the respective product or engineering teams, it grants them "Reader" access. The document will appear in their "Shared with me" folder. **It does not consume any of their personal Google Drive storage limit.**

## Advanced Features

### Teams Distribution
The server uses a local SQLite database (`data/mcp_distribution.db`) to store team mappings. You can add teams and members directly to the DB, and the LLM can send reports to an entire team by name.
