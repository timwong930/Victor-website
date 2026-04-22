const { Client } = require('@notionhq/client');

// Vercel Serverless Function entry point
module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ensure env variables exist (user configures these in Vercel Dashboard)
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return res.status(500).json({ error: 'Missing Vercel environment variables for Notion.' });
  }

  const notion = new Client({ auth: NOTION_API_KEY });
  const data = req.body;

  try {
    // We expect the frontend to pass a "type" string to differentiate forms
    const leadType = data.type === 'audit' ? 'Free Audit Lead' : 'Interest List';
    
    // Construct the properties for the Notion database row
    // Note: The property names (e.g. "Name", "Email") MUST match the column titles in Notion exactly.
    const properties = {
      "Name": {
        title: [
          {
            text: {
              content: data.name || data.email || "Unknown Lead"
            }
          }
        ]
      },
      "Email": {
        email: data.email || null
      },
      "Type": {
        select: {
          name: leadType
        }
      },
      "Status": {
        select: {
          name: "New"
        }
      }
    };

    // Add optional fields if they were provided in the Audit form
    if (data.shop) {
      properties["Shop Name"] = { rich_text: [{ text: { content: data.shop } }] };
    }
    if (data.city) {
      properties["Location"] = { rich_text: [{ text: { content: data.city } }] };
    }
    if (data.issue) {
      properties["Core Issue"] = { rich_text: [{ text: { content: data.issue } }] };
    }
    if (data.note) {
      properties["Notes"] = { rich_text: [{ text: { content: data.note } }] };
    }

    // Call the Notion API to create the page in the database
    const response = await notion.pages.create({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: properties,
    });

    res.status(200).json({ success: true, url: response.url });

  } catch (error) {
    console.error('Notion API Error:', error);
    const message = error?.body
      ? JSON.parse(error.body)?.message
      : error?.message;
    res.status(500).json({ error: message || 'Failed to create lead in Notion. Check server logs.' });
  }
};
